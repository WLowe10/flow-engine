export class ConfigService {
    private data?: Record<string, any>;

    constructor(data?: Record<string, any>) {
        this.data = data
    };

    public get(key: string) {
        if (!this.data) return undefined;;

        return this.data[key];
    }
}