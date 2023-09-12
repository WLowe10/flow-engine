export class Packet {
    private data: any = {};
    private ports: Array<string>;
    private properties: Record<string, any> = {};
    private cache: Record<string, any> = {};
    private _from?: string;

    constructor(data = {}, ports = [] as Array<string>) {
        this.data = data;
        this.ports = ports;
    };

    public static from(from: string) {
        const packet = new Packet();

        packet.setFrom(from);

        return packet;
    };

    public get from() {
        return this._from;
    };

    public setFrom(from: string) {
        this._from = from;

        return this;
    };

    public getPorts() {
        return this.ports;
    };

    public getPayload() {
        return this.data;
    };

    public getProperties() {
        return this.properties;
    };

    public getCache() {
        return this.cache;
    };

    public setPayload(payload: Record<string, any>) {
        this.data = payload;

        return this;
    };

    public setPorts(ports: Array<string>) {
        this.ports = ports;

        return this;
    };

    public setProperties(properties: Record<string, any>) {
        this.properties = properties;

        return this;
    };

    public setCache(data: Record<string, any>) {
        this.cache = data;

        return this;
    };

    public async transform(updateFunc: (value: any, get: (key: string) => any) => any) {
        if (!this.properties) return;

        const transform = async (obj: Record<string, any>, updateFunc: (value: any) => any) => {
            let newObj = obj;

            for (const prop in obj) {
                const value = obj[prop];

                if (typeof value === "object") {
                    newObj[prop] = await transform(value, updateFunc);
                } else {
                    newObj[prop] = await updateFunc(value)
                }
            }

            return newObj;
        };

        const payloadMap = new Map(Object.entries(this.getPayload()));
        const get = (key: string) => payloadMap.get(key);

        this.properties = await transform(this.properties, async (val) => {
            return await updateFunc(val, get);
        });

        return this;
    };

    public async resolve(updateFunc: (value: any, get: (key: string) => any) => any) {
        if (!this.properties) return;

        const transform = async (obj: Record<string, any>, updateFunc: (value: any) => any) => {
            let newObj = obj;

            if (obj !== null && typeof obj === "object" && Object.keys(obj).length === 1 && Object.keys(obj)[0].startsWith("$")) return await updateFunc(obj);

            for (const prop in obj) {
                const value = obj[prop];

                if (typeof value === "object") {
                    newObj[prop] = await transform(value, updateFunc);
                } 
            }

            return newObj;
        };

        const payloadMap = new Map(Object.entries(this.getPayload()));
        const get = (key: string) => payloadMap.get(key);

        this.properties = await transform(this.properties, async (val) => {
            return await updateFunc(val, get);
        });

        return this;
    }

     public async resolveSync(updateFunc: (value: any, get: (key: string) => any) => any) {
        if (!this.properties) return;

        const transform = (obj: Record<string, any>, updateFunc: (value: any) => any) => {
            let newObj = obj;

            if (obj !== null && typeof obj === "object" && Object.keys(obj).length === 1 && Object.keys(obj)[0].startsWith("$")) return updateFunc(obj);

            for (const prop in obj) {
                const value = obj[prop];

                if (typeof value === "object") {
                    newObj[prop] = transform(value, updateFunc);
                } 
            }

            return newObj;
        };

        const payloadMap = new Map(Object.entries(this.getPayload()));
        const get = (key: string) => payloadMap.get(key);

        this.properties = transform(this.properties, (val) => {
            return updateFunc(val, get);
        });

        return this;
    }

    public clone() {
        const newPacket = new Packet(this.data, this.ports);

        newPacket.setCache(this.cache);

        if (this.from) {
            newPacket.setFrom(this.from)
        };

        return newPacket;
    }
}