import { ConnectionType } from "./connection";

export type FlowNodeType = {
    id: string,
    type: string,
    properties?: object,
};

export type FlowType = {
    nodes: Array<FlowNodeType>,
    connections: Array<ConnectionType>
}