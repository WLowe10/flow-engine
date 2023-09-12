import { GUARDS } from "../constants";
import { extendArrayMetadata } from "../utils";
import type { ClassType, IGuard } from "../types";

export const useGuards = (...guards: Array<ClassType<IGuard> | IGuard>): ClassDecorator & MethodDecorator => {
    return (target: any, key?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
        if (descriptor) {
            extendArrayMetadata(GUARDS, guards, descriptor.value);
            return descriptor;
        };

        extendArrayMetadata(GUARDS, guards, target);
        return target;
    } 
}