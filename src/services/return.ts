export class ReturnService {
    private data = {};

    public set(data: object) {
        this.data = data;
    };

    public merge(data: object) {
        this.data = {
            ...this.data,
            ...data
        };
    };

    public getData() {
        return this.data;
    };
};