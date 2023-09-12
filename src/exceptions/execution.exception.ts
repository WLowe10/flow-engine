export class ExecutionException extends Error {
    public name: string;

    constructor(message: string) {
        super(message);

        this.name = "ExecutionException"
    }
}