import { isEmpty, isObject } from "./common";
import type { ClassType } from "../types";

export const get = <T = any, K = any>(metadataKey: K, target: ClassType<any> | Function): T => {
    return Reflect.getMetadata(metadataKey, target)
};

export const getAll = <T = any, K = any>(metadataKey: K, targets: Array<(ClassType<any> | Function)>): T => {
    return targets.map(target => get(metadataKey, target)) as T;
};

export const getAllAndMerge = <T extends any[] = any[], K = any>(metadataKey: K, targets: Array<ClassType<any> | Function>): T => {
    const metadataCollection = getAll<T, K>(metadataKey, targets).filter(item => item !== undefined);

    if (isEmpty(metadataCollection)) {
        return metadataCollection as T;
    }

    return metadataCollection.reduce((a, b) => {
        if (Array.isArray(a)) {
            return a.concat(b);
        };

        if (isObject(a) && isObject(b)) {
            return {
                ...a,
                ...b,
            };
        };

        return [a, b];
    });
};

export const getAllAndOverride = <T = any, K = any>(metadataKey: K, targets: Array<ClassType<any> | Function>): T => {
    for (const target of targets) {
        const result = get(metadataKey, target);

        if (result !== undefined) {
            return result;
        }
    };

    return undefined as T;
}