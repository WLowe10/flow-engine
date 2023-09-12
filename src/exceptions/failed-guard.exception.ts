import { ExecutionException } from "./execution.exception";

export class FailedGuardException extends ExecutionException {
    public nodeId: string;
    public guardIndex: number;

    constructor(nodeId: string, guardIdx: number, cause?: Error) {
        super("Failed to pass guard");

        this.name = "FailedGuard";
        this.nodeId = nodeId;
        this.guardIndex = guardIdx;
        this.cause = cause;
    }
}