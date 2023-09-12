import { Packet } from "./packet";

export class Input<T extends Record<string, any> = any> {
    constructor(private packet: Packet) {};

    public getValue() {
        return this.packet.getPayload() as any;
    };

    public getProperties() {
        return this.packet.getProperties() as T
    }

    public getSender() {
        return this.packet.from;
    };

    public getCache(key: string) {
        return this.packet.getCache()[key]
    }
}