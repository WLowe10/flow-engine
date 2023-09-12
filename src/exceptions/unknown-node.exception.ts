import { ExecutionException } from "./execution.exception";

export class UnknownNodeException extends ExecutionException {
    public nodeId: string;

    constructor(nodeId: string) {
        super("Reached an unknown node");

        this.name = "UnknownNode";
        this.nodeId = nodeId;
    }
}