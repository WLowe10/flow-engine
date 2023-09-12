import { ExecutionException } from "./execution.exception";

export class ServiceErrorException extends ExecutionException {
    public service: string;

    constructor(service: string, cause: Error) {
        super("Service threw an error");

        this.name = "ServiceError";
        this.service = service;
        this.cause = cause;
    }
}