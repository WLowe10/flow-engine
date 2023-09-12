import type { ConnectionType } from "./types";

type ConnectionsType = Array<ConnectionType>;

export class Connections {
    constructor(incoming: ConnectionsType, outgoing: ConnectionsType) {
        this.incoming = incoming;
        this.outgoing = outgoing;
    };

    incoming: ConnectionsType;
    outgoing: ConnectionsType;
}