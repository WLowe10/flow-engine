import { injectable } from "inversify";
import { Input } from "./input";
import { Output } from "./output";

@injectable()
export abstract class BaseNode {
    protected input!: Input;
    protected output!: Output;
    abstract process(): void

    private static getMetaKey(key: string) {
        return Reflect.getMetadata(key, this.prototype)
    };

    public static getMetadata() {
        const name = this.getMetaKey("name");
        const ports = this.getMetaKey("ports");
        const description = this.getMetaKey("description");

        return {
            name,
            ports,
            description
        }
    };

    public load(data: any) {
        this.input.load(data);
    };

    public bindOutput(output: Output) {
        this.input = new Input();
        this.output = output;
    };

    public getPorts() {
        return {
            output: {
                out: {

                }
            }
        }
    };

    protected setStatus() {

    }
}