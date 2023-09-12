import type { Node } from "./node";
import type { Packet } from "../packet";
import type { ClassType } from "./class";

export type GuardContext = {
    getNode: () => Node,
    getPacket: () => Packet,
    getClass: () => ClassType<any>,
    getHandler: () => Function,
}

export interface IGuard {
    canProcess(ctx: GuardContext): boolean | Promise<boolean>
};