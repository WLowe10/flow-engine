import type { Packet } from "../packet";
import type { Node } from "./node";

export interface IService {
    setup?(): void,
    teardown?(): void,
    onBeforeProcess?(node: Node, inPacket: Packet): void,
    onAfterProcess?(node: Node, inPacket: Packet, error: Error | undefined): void,
    onBeforePacketSend(node: Node, packet: Packet): void,
}