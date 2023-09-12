export const extendArrayMetadata = <T extends Array<unknown>>(key: string | symbol, metadata: T, target: Function) => {
    const previousValue = Reflect.getMetadata(key, target) || [];
    const value = [...previousValue, ...metadata];

    Reflect.defineMetadata(key, value, target);
}