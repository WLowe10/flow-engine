import EventEmitter from "eventemitter3";
import { Flow } from "./flow";
import { Connections } from "./connections";
import { Input } from "./input";
import { Output } from "./output";
import { Container } from "inversify";
import { Packet } from "./packet";
import { 
    get,
    getAllAndMerge,
} from "./utils";
import { 
    ConfigService, 
    Reflector, 
    ReturnService 
} from "./services";
import { 
    ContextEvents, 
    ID, 
    PORTS, 
    GUARDS, 
    PORT_HANDLERS,
    INJECTABLE_OPTIONS,
} from "./constants";
import { 
    UnknownNodeException,
    UnknownPortException, 
    FailedGuardException, 
    ExecutionException, 
    ServiceErrorException, 
    NodeErrorException 
} from "./exceptions";
import type { 
    Node, 
    INode, 
    IGuard, 
    IService, 
    ClassType, 
    PortHandlerType, 
    PacketDataType, 
    FlowNodeType,
    ProvideType,
    ValueServiceType,
    FactoryServiceType,
    ServicesType
} from "./types";

type ExecutionContextProps = {
    flow: Flow<Node>,
    config: Record<string, any> | undefined
    engineNodes: Map<string, ClassType>,
    engineServices: ServicesType,
};

export class ExecutionContext extends EventEmitter {
    private readonly engineNodes: Map<string, ClassType>;
    private readonly _container: Container;
    private _flow: Flow<Node>
    private services: Array<IService> = [];
    private running: boolean = false;
    private processing: Array<{ id: string, packet: Packet }> = [];

    constructor({ 
        flow, 
        config,
        engineNodes, 
        engineServices, 
    }: ExecutionContextProps) {
        super();
        this.engineNodes = engineNodes;
        this._container = this.createContainer(engineServices, config);
        this._flow = this.loadFlow(flow);
    };

    public get flow() {
        return this._flow;
    };

    public get state() {
        if (!this.running) return "idle";
        if (this.processing.length === 0) return "complete";

        return "active";
    };

    public get container() {
        return this._container;
    };

    public build() {

    };

    public useServices(services: ServicesType) {

    };

    // public use(...services: Array<IService>) {
    //     this.services.push(services);
    // }

    //creates a "fake" node in the flow at the target id. this node can send a packet from any port
    public createTriggerNode(id: string) {
        return (ports: Array<string>, packet: Packet | PacketDataType) => {
            this.running = true;

            const createPacket = ({ payload = {}, properties = {}, cache = {} }: PacketDataType, ports: Array<string>) => Packet.from(id).setPayload(payload).setProperties(properties).setCache(cache).setPorts(ports);
            const genesisPacket = packet instanceof Packet ? packet : createPacket(packet, ports);

            this.forwardPacket(genesisPacket);

            return new Promise((res) => {
                this.once("done", (data) => {
                    res(data);
                })
            })
        }
    };

    //lifecycle setup (nodes and services)
    public async setup() {
        await Promise.all([
            this.applyNodes(node => typeof node.setup === "function" && node.setup()),
            this.applyServices(service => typeof service.setup == "function" && service.setup()),
        ])
    };

    //lifecycle teardown (nodes and services)
    public async teardown() {
        await Promise.all([
            this.applyNodes(node => typeof node.teardown === "function" && node.teardown()),
            this.applyServices(service => typeof service.teardown === "function" && service.teardown()),
        ])
    };

    public pause() {
        this.running = false;
    };

    public async resume() {
        this.running = true;

        this.processing.forEach(proc => {
            this.processNode(proc.id, proc.packet);
        })
    }

    public stop() {
        this.running = false;
        this.flush();
    };

    public async kill() {
        this.running = false;
        this.flush();

        await this.teardown();
    };

    public flush() {
        this.processing = [];
    };

    private async forwardPacket(packet: Packet) {
        if (!this.running) return;

        const ports = packet.getPorts();
        if (!packet.from) return;

        const outgoingNodes = this.flow.getOutgoingNodesByPorts(packet.from, ports).map(nd => nd.id);

        await Promise.all(outgoingNodes.map(next => {
            const incomingConnections = this.flow.getIncomingConnections(next);
            const portsToSend = incomingConnections.filter(con => con.source.id === packet.from && ports.includes(con.source.port)).map(con => con.target.port)
            const sendPacket = packet.clone().setPorts(portsToSend);

            return this.processNode(next, sendPacket);
        }))
    };

    private async processNode(id: string, inPacket: Packet) {
        if (!this.running) return;

        const node = this.flow.getNodeById(id);
        if (!node) return this.warn(new UnknownNodeException(id));

        this.addProcessing(id, inPacket);

        const done = () => {
            this.removeProcessing(node.id);
            this.checkComplete();
        };

        if (node.properties) {
            inPacket.setProperties({...node.properties});

            inPacket.resolveSync((res) => {
                if (res["$msg"]) {
                    return res(res["$msg"]);
                };

                return res;
            })
        };

        await this.onBeforeProcess(node, inPacket);
        if (!this.validatePacket(node, inPacket)) {
            this.warn(new UnknownPortException(node.id));
            done();

            return;
        }

        return Promise.all(inPacket.getPorts().flatMap(port => {
            const handlers = (this.getNodeMetadata<Array<PortHandlerType>>(PORT_HANDLERS, node.type) || []).filter(ph => ph.port === port);

            return Promise.all(handlers.map(async handler => {
                const exec = (node.instance as any)[handler.methodKey];
                
                if (typeof exec === "function") {
                    const passedGuards = await this.applyGuards(node, inPacket, handler.methodKey);
                    if (!passedGuards) return done();

                    const outPacket = inPacket.clone().setFrom(id);
                    const input = new Input(inPacket);
                    const output = new Output(outPacket, async (out) => {
                        if (this.running) {
                            const sentPorts = out.getPorts();
                            const { output } = this.getNodeMetadata(PORTS, node.type);
                            const published = output && output.length > 0 ? sentPorts.filter(port => output.includes(port)) : sentPorts;

                            out.setPorts(published);

                            await this.onBeforePacketSend(node, out);
                            await this.forwardPacket(out)
                        }
                    })

                    try {
                        await exec.call(node.instance, input, output);
                    } catch (err: any) {
                        if (this.running) {
                            this.warn(new NodeErrorException(node.id, err));
                            await this.onAfterProcess(node, inPacket, err);
                        }
                    };

                    if (this.running) {
                        await this.onAfterProcess(node, inPacket);
                        done();
                    }
                }
            }))
        }))
    };

    private validatePacket(node: Node, inPacket: Packet): boolean {
        const { input } = this.getNodeMetadata(PORTS, node.type);

        return input && inPacket.getPorts().every(p => input.includes(p))
    };

    private async applyGuards(node: Node, inPacket: Packet, methodKey: string): Promise<boolean> {
        const nodeClass = Object.getPrototypeOf(node.instance);
        const portHandler = nodeClass[methodKey];

        const guards = getAllAndMerge<Array<IGuard>>(GUARDS, [
            nodeClass.constructor,
            portHandler,
        ]).map(guard => {
            if (typeof guard === "object") return guard;
            if (!this.container.isBound(guard)) {
                const { scope = "singleton" } = get(INJECTABLE_OPTIONS, guard);

                switch (scope) {
                    case "singleton":
                        this.container.bind(guard).toSelf().inSingletonScope();
                    break;

                    case "transient": 
                        this.container.bind(guard).toSelf().inTransientScope();
                    break;

                    case "request":
                        this.container.bind(guard).toSelf().inRequestScope();
                    break;
                }
            }

            const guardContainer = this.container.createChild();
            guardContainer.bind(Reflector).toConstantValue(new Reflector());

            return guardContainer.get<IGuard>(guard);
        });

        if (!guards.length) return true;

        const guardContext = {
            getNode: () => node,
            getPacket: () => inPacket,
            getClass: () => nodeClass.constructor,
            getHandler: () => portHandler,
        };

        for (let i = 0; i < guards.length; i++) {
            const guard = guards[i];

            try {
                const canProc = await guard.canProcess(guardContext);

                if (!canProc) {
                    this.warn(new FailedGuardException(node.id, i))
                    return false;
                }
            } catch (err: any) {
                this.warn(new FailedGuardException(node.id, i, err))
                return false;
            };
        }

        return true;
    };
   
    //lifecycle onBeforeProcess (services only)
    private async onBeforeProcess(node: Node, inPacket: Packet) {
        await this.applyServices(service => typeof service.onBeforeProcess === "function" && service.onBeforeProcess(node, inPacket));
    };

    //lifecycle onAfterProcess (services only)
    private async onAfterProcess(node: Node, inPacket: Packet, error?: Error) {
        await this.applyServices(service => typeof service.onAfterProcess === "function" && service.onAfterProcess(node, inPacket, error));
    };

    //lifecycle onAfterProcess (services only)
    private async onBeforePacketSend(node: Node, packet: Packet) {
        await this.applyServices(service => typeof service.onBeforePacketSend === "function" && service.onBeforePacketSend(node, packet));
    };

    private loadFlow(flow: Flow<FlowNodeType>): Flow<Node> {
        const newNodes = flow.nodes.map((node) => {
            const { id, type, properties, ...extra } = node;

            const nodeContainer = this.container.createChild();

            const connections = new Connections(
                flow.getIncomingConnections(id),
                flow.getIncomingConnections(id),
            );

            nodeContainer.bind(ID).toConstantValue(node.id);
            nodeContainer.bind(Connections).toConstantValue(connections);

            const engineNode = this.engineNodes.get(node.type) as ClassType<INode>;
            const instance = nodeContainer.resolve<INode>(engineNode);

            return {
                id: id,
                type: type,
                instance: instance,
                properties: properties,
                ...extra,
            }
        })

        flow.setNodes(newNodes);

        return flow as Flow<Node>;
    };

    private createContainer(services: Array<any> | undefined, config: Record<string, any> | undefined) {
        const container = new Container();

        container.bind(ExecutionContext).toConstantValue(this);
        container.bind(ReturnService).toConstantValue(new ReturnService());
        container.bind(ConfigService).toConstantValue(new ConfigService(config));

        const getScope = (service: any) => {
            const { scope = "singleton" } = get(INJECTABLE_OPTIONS, service);
            return scope;
        };

        const bindInjectableService = (service: ClassType<any>, provide?: ProvideType) => {
            const scope = getScope(service);

            switch (scope) {
                case "singleton":
                    container.bind(provide || service).to(service).inSingletonScope();
                break;

                case "transient": 
                    container.bind(provide || service).to(service).inTransientScope();
                break;

                case "request":
                    container.bind(provide || service).to(service).inRequestScope();
                break;
            }
        }

        const bindValueService = (service: ValueServiceType) => {
            container.bind(service.provide).toConstantValue(service.useValue);
        };

        const bindFactoryService = async (service: FactoryServiceType) => {
            const injections = service.inject.map(inj => container.get(inj)); 
            const value = await service.useFactory(...injections);

            container.bind(service.provide).toConstantValue(value);
        };

        let tempServicesBinders = [];

        for (const service of (services as any)) {
            if (typeof service === "function") {
                bindInjectableService(service as ClassType);
                tempServicesBinders.push(service);
            } else if (typeof service === "object") {
                if (typeof service.useClass === "function") {
                    bindInjectableService(service.useClass, service.provide);
                    tempServicesBinders.push(service.provide);
                } else if (service.useValue) {
                    bindValueService(service);
                    tempServicesBinders.push(service.provide);
                } else if (typeof service.useFactory === "function") {
                    //!promises will not work
                    bindFactoryService(service);
                    tempServicesBinders.push(service.provide);
                }
            }
        }

        //!temp really bad solution but will work for now
        //todo figure out how to access services
        this.services = tempServicesBinders.map(serv => container.get(serv));

        return container;
    };

    private applyNodes(apply: (node: INode) => void) {
        const nodes = this.flow.nodes;

        return Promise.all(
            nodes.map(node => {
                try {
                    apply(node.instance)
                } catch (err: any) {
                    this.warn(new NodeErrorException(node.id, err))
                }
            })
        )
    }

    private async applyServices(apply: (service: IService) => void) {
        for (const service of this.services) {
            try {
                await apply(service);
            } catch (err: any) {
                this.warn(new ServiceErrorException(service.constructor.name, err))
            }
        }
    }

    private addProcessing(id: string, packet: Packet) {
        if (!this.running) return;

        this.processing.push({ id, packet });
    }

    private removeProcessing(id: string) {
        if (!this.running) return;

        const idx = this.processing.findIndex(proc => proc.id === id);

        if (idx > -1) {
            this.processing.splice(idx, 1);
        };
    };

    private checkComplete() {
        if (this.state === "complete") {
            this.running = false;

            const returnService = this.container.get(ReturnService) as ReturnService;
            this.emit("done", returnService.getData());
        }
    }

    private getNodeMetadata<T = any>(key: string | symbol, type: string) {
        const engineNode = this.engineNodes.get(type) as ClassType<INode>;

        return engineNode && get<T>(key, engineNode);
    }

    private warn(err: ExecutionException) {
        this.emit(ContextEvents.warning, err)
    };
}