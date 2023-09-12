import { ExecutionException } from "./execution.exception";

export class NodeErrorException extends ExecutionException {
    public nodeId: string;

    constructor(nodeId: string, cause: Error) {
        super("Node threw an error");

        this.name = "NodeError";
        this.nodeId = nodeId;
        this.cause = cause;
    }
}