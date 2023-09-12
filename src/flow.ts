import { removeDuplicates } from "./utils";
import type { ConnectionType } from "./types";

interface ObjWithId { id: string };
type NodeType<T extends ObjWithId> = T;

export class Flow<T extends ObjWithId> {
    private _nodes: Array<NodeType<T>>;
    private _connections: Array<ConnectionType>;

    constructor(nodes: Array<NodeType<T>>, connections: Array<ConnectionType>, strict: boolean = true) {
        if (strict) {
            Flow.verify(nodes, connections);
        };

        this._nodes = nodes;
        this._connections = connections;
    };

    public static verify(nodes: Array<NodeType<any>>, connections: Array<ConnectionType>): boolean {
        const validNodes = nodes.every(node => typeof node.id == "string");

        if (!validNodes) {
            throw new Error("The provided flow has invalid nodes");
        };

        const nodeIds = nodes.map(node => node.id);

        const duplicateIds = nodeIds.some((id, idx) => {
            return nodeIds.indexOf(id) !== idx;
        });

        if (duplicateIds) {
            throw new Error("The provided flow has nodes with the same IDs");
        };

        const validConnections = connections.every(con => {
            const source = con.source.id;
            const target = con.target.id;

            return (nodes.findIndex(nd => nd.id === source) !== -1) && (nodes.findIndex(nd => nd.id === target) !== -1);
        });

        if (!validConnections) {
            throw new Error("The provided flow has invalid connections. One of your connections references a nonexisting node")
        };

        return true;
    };

    public static verifySafe(nodes: Array<NodeType<any>>, connections: Array<ConnectionType>): { success: true, data: any } | { success: false, error: any } {
        const validNodes = nodes.every(node => typeof node.id == "string");

        if (!validNodes) {
            return {
                success: false,
                error: "The provided flow has invalid nodes",
            };
        };

        const nodeIds = nodes.map(node => node.id);

        const duplicateIds = nodeIds.some((id, idx) => {
            return nodeIds.indexOf(id) !== idx;
        });

        if (duplicateIds) {
            return {
                success: false,
                error: "The provided flow has nodes with the same IDs",
            };
        };

        const validConnections = connections.every(con => {
            const source = con.source.id;
            const target = con.target.id;

            return (nodes.findIndex(nd => nd.id === source) !== -1) && (nodes.findIndex(nd => nd.id === target) !== -1);
        });

        if (!validConnections) {
            return {
                success: false,
                error: "The provided flow has invalid connections. One of your connections references a nonexisting node",
            };
        };

        return { success: true, data: true };
    };

    public get nodes() {
        return this._nodes;
    };

    public get connections() {
        return this._connections;
    };

    public setNodes(nodes: Array<NodeType<T>>) {
        this._nodes = nodes;
    }

    public setConnections(connections: Array<ConnectionType>) {
        this._connections = connections;
    }

    public getNodeById(id: string): NodeType<T> | undefined {
        return this.nodes.find(node => node.id === id);
    };

    public getConnection({ source, target }: ConnectionType) {
        return this.connections.find(con => 
            (con.source.id === source.id)
            && (con.source.port === source.port) 
            && (con.target.id === target.id)
            && (con.target.port === target.port)
        ) || null;
    }

    public getConnectionById(id: string): ConnectionType | null {
        const con = this.parseConnectionId(id);
        if (!con) return null;

        const { source, target } = con;

        return this.connections.find(con => 
            (con.source.id === source.id)
            && (con.source.port === source.port) 
            && (con.target.id === target.id)
            && (con.target.port === target.port)
        ) || null;
    }

    public getOutgoingConnections(id: string): Array<ConnectionType> {
        return this.connections.filter(con => con.source.id === id);
    };

    public getOutgoingConnectionsByPorts(id: string, ports: Array<string>): Array<ConnectionType> {
        return this.connections.filter(con => con.source.id === id && ports.includes(con.source.port));
    };

    public getIncomingConnections(id: string): Array<ConnectionType> {
        return this.connections.filter(con => con.target.id === id)
    };

    public getIncomingConnectionsByPorts(id: string, ports: Array<string>): Array<ConnectionType> {
        return this.connections.filter(con => con.target.id === id && ports.includes(con.target.port));
    };

    public getOutgoingNodes(id: string): Array<NodeType<T>> {
        const outConnections = this.getOutgoingConnections(id);

        return removeDuplicates(
            outConnections.map(con => this.getNodeById(con.target.id) as NodeType<T>)
        ).filter(nd => typeof nd !== "undefined");
    };

    public getOutgoingNodesByPorts(id: string, ports: Array<string>): Array<NodeType<T>> {
        const outConnections = this.getOutgoingConnectionsByPorts(id, ports);

        return removeDuplicates(
            outConnections.map(con => this.getNodeById(con.target.id) as NodeType<T>)
        ).filter(nd => typeof nd !== "undefined");
    };

    public getIncomingNodes(id: string): Array<NodeType<T>> {
        const incomingConnections = this.getIncomingConnections(id);

        return removeDuplicates(
            incomingConnections.map(con => this.getNodeById(con.source.id) as NodeType<T>)
        ).filter(nd => typeof nd !== "undefined")
    };

    public getIncomingNodesByPorts(id: string, ports: Array<string>) {
        const incomingConnections = this.getIncomingConnectionsByPorts(id, ports);

        return removeDuplicates(
            incomingConnections.map(con => this.getNodeById(con.source.id) as NodeType<T>)
        ).filter(nd => typeof nd !== "undefined");
    };

    public findNodeBefore(id: string, validate: (id: string) => boolean): string | undefined {
        const incomingNodes = this.getIncomingNodes(id);

        for (const incomingNode of incomingNodes) {
            const isValid = validate(incomingNode.id);

            if (isValid) {
                return id;
            };

            return this.findNodeBefore(incomingNode.id, validate);
        };

        return undefined;
    };

    public addNode(node: NodeType<T>) {
        this._nodes.push(node);

        return this;
    };

    public addConnection(connection: ConnectionType) {
        this._connections.push(connection);
    };

    public removeNodeById(id: string) {
        const idx = this.nodes.findIndex(node => node.id === id);

        if (idx > -1) {
            this._nodes.splice(idx, 1);
        }
    };

    public removeConnection(connection: ConnectionType) {
        const con = this.getConnection(connection);
        if (!con) return;

        const idx = this.connections.indexOf(con);

        if (idx > -1) {
            this._connections.splice(idx, 1);
        }
    };

    public removeConnectionById(id: string) {
        const con = this.getConnectionById(id);
        if (!con) return;

        const idx = this.connections.indexOf(con);

        if (idx > -1) {
            this._connections.splice(idx, 1);
        }
    }

    public createConnectionId(connection: ConnectionType) {
        return (`${connection.source.id}:${connection.source.port}::${connection.target.id}:${connection.target.port}`);
    };

    public parseConnectionId(id: string): ConnectionType | null {
        const [source, target] = id.split('::');
        if (!source || !target) return null;

        const [srcId, srcPort] = source.split(":");
        const [tgtId, tgtPort] = target.split(":");

        if (!srcId || !srcPort || !tgtId || !tgtPort) return null;

        return {
            source: {
                id: srcId,
                port: srcPort,
            },
            target: {
                id: tgtId,
                port: tgtPort
            }
        }
    };
}