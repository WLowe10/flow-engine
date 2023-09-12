import { Flow } from "./flow";
import { ExecutionContext } from "./execution";
import { InvalidNodeException } from "./exceptions";
import type { FlowType, INode, Node, ClassType, IService, ServicesType } from "./types";

type EngineProps = {
    nodes: Array<ClassType<any>>,
    services?: ServicesType
};

export class Engine {
    private nodeMap: Map<string, ClassType<INode>>;
    private providers: any;

    constructor({ services, nodes }: EngineProps) {
        this.nodeMap = this.loadNodes(nodes);
        this.providers = services;
    };

    public createContext(flow: Flow<Node> | FlowType, config?: Record<string, any>, options?: { strict?: boolean }) {
        const ctxFlow = flow instanceof Flow ? flow : new Flow<any>(flow.nodes, flow.connections, options?.strict);

        return new ExecutionContext({
            flow: ctxFlow, 
            config: config,
            engineNodes: this.nodeMap,
            engineServices: this.providers,
        })
    };

    private loadNodes(nodes: Array<ClassType<INode>>) {
        const nodeMap = new Map();

        nodes.forEach(node => {
            const name = Reflect.getMetadata("name", node)
            if (!name) throw new InvalidNodeException(node);

            nodeMap.set(name, node);
        });

        return nodeMap;
    };
};