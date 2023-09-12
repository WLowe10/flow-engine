import { get, getAll, getAllAndMerge, getAllAndOverride } from "../utils";
import type { ClassType } from "../types";

export class Reflector {
    //gets singular data from one target
    public get<T = any, K = any>(metadataKey: K, target: ClassType<any> | Function): T {
        return get<T, K>(metadataKey, target);
    };

    //gets datas from multiple targets, does not merge
    public getAll<T = any, K = any>(metadataKey: K, targets: Array<(ClassType<any> | Function)>): T {
        return getAll<T, K>(metadataKey, targets);
    };

    //merges data from all targets
    public getAllAndMerge<T extends any[] = any[], K = any>(metadataKey: K, targets: Array<ClassType<any> | Function>): T {
        return getAllAndMerge<T, K>(metadataKey, targets);
    };

    //gets multiple data points, prefers the first target
    public getAllAndOverride<T = any, K = any>(metadataKey: K, targets: Array<ClassType<any> | Function>): T {
        return getAllAndOverride<T, K>(metadataKey, targets);
    }
}