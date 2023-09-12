import { PORT_HANDLERS } from "../constants";
import { extendArrayMetadata } from "../utils";

export const port = (port: string): MethodDecorator => {
    return (target: any, propertyKey: string | symbol) => {
        extendArrayMetadata(PORT_HANDLERS, [
            {
                port: port,
                methodKey: propertyKey
            }
        ], target.constructor)

        return target;
    }
}