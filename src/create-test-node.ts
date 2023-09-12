import "reflect-metadata";
import { PORTS, ID, GUARDS } from "./constants";
import { ExecutionContext } from "./execution";
import { Container } from "inversify";
import { Packet } from "./packet";
import { Input } from "./input";
import { Output } from "./output";
import EventEmitter from "eventemitter3";
import type { IGuard, PortHandlerType, PacketDataType } from "./types";

type ClassType = { new(...args: any): any }

type OptionsType = {
    services: Array<any>
};

const startingId = "test:root";
const testingId = "test:node";

const createMockContainer = () => {
    const container = new Container();

    container.bind(ID).toConstantValue(testingId);
    container.bind<any>(ExecutionContext).toConstantValue({})

    return container;
};

const createPacket = ({ payload = {}, properties = {}, cache = {} }: PacketDataType) => {
    return Packet.from(startingId).setPayload(payload).setProperties(properties).setCache(cache)
};

const getPorts = (target: ClassType) => {
    return Reflect.getMetadata(PORTS, target) as Array<PortHandlerType>;
};

const getGuards = (target: ClassType, methodKey: string) => {
    return Reflect.getMetadata(GUARDS, target, methodKey) as Array<IGuard> | undefined;;
};

//todo add guards
export const createTestNode = (
    node: ClassType, 
    { 
        services
    }: OptionsType
) => {
    const events = new EventEmitter();
    const container = createMockContainer();
    const nodeInstance = container.resolve(node);
    const portHandlers = getPorts(node);

    const applyGuards = async (methodKey: string, inPacket: Packet) => {
        // const guards = getGuards(node, methodKey);

        // if (guards) {
        //     const allGuards = guards.flat();

        //     for (const guard of allGuards) {
        //         const canProc = await guard.canProcess(nodeInstance, inPacket);

        //         if (!canProc) {
        //             return false;
        //         };
        //     }
        // };

        return true;
    };
   
    const emitToPortHandler = async (port: string, packet: Packet | PacketDataType) => {
        let sent: Array<Packet> = [];

        const portKey = portHandlers.find(p => p.port === port)?.methodKey;
        if (!portKey) return null;

        const portHandler = nodeInstance[portKey];
        if (typeof portHandler !== "function") return null;

        const inPacket = packet instanceof Packet ? packet : createPacket(packet);
        const outPacket = inPacket.clone().setFrom(testingId);

        //todo add warnings
        const passedGuards = await applyGuards(portKey, inPacket);
        if (!passedGuards) return null;

        const input = new Input(inPacket);
        const output = new Output(outPacket, (out) => {
            sent.push(out);
            events.emit("send", out);
        })

        await portHandler.call(nodeInstance, input, output);

        return sent;
    };

    return {
        events: events,
        emit: (target: string | string[], packet: Packet | PacketDataType) => {
            if (Array.isArray(target)) {
                for (const port of target) {
                    return emitToPortHandler(port, packet)
                }
            } else {
                return emitToPortHandler(target, packet);
            }
        },
        get: (symbol: any) => {
            return container.get(symbol);
        },
        container: container,
    }
};

// const testNode = createTestNode(Delay, {
//     services: []
// })

// testNode.events.on("send", (p) => {
//     console.log(p)
// })

// const start = async () => {
//     const sent = await testNode.emit("in", {
//         payload: {},
//         properties: {
//             duration: ""
//         },
//         cache: {},
//     })

//     // console.log(sent);
// };

// start()