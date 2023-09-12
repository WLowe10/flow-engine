import { ExecutionException } from "./execution.exception";

export class UnknownPortException extends ExecutionException {
    public nodeId: string;

    constructor(nodeId: string) {
        super("Node recieved a packet at an unknown port");

        this.name = "UnknownPort";
        this.nodeId = nodeId;
    }
}