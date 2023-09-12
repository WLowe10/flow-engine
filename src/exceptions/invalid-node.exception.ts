export class InvalidNodeException extends Error {
    public node: any;

    constructor(node: any) {
        super("The engine has been supplied with an invalid node");

        this.name = "InvalidNoed";
        this.node = node;
    }
}