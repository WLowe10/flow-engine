import { Packet } from "./packet";

export class Output {
    constructor(
       private packet: Packet, 
       private pushFunc: (packet: Packet) => void
    ) {};

    public setCache(key: string, value: any) {
        this.packet.setCache({
            ...this.packet.getCache(),
            [key]: value
        })
    };

    public async send(ports: string | Array<string>, payload: any) {
        const newPacket = this.packet.clone();

        newPacket.setPorts(typeof ports === "string" ? [ports] : ports);
        newPacket.setPayload(payload);

        await this.pushFunc(newPacket);
    };
}