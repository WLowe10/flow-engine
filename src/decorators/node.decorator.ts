import { injectable } from "inversify";

export const node = (name: string): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata("name", name, target);
        return injectable()(target);
    }
}