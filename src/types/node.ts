export type Node = {
    id: string,
    type: string,
    instance: INode,
    properties?: Record<string, any>,
};

export interface INode {
    setup?(): void,
    teardown?(): void,
}