export const setMetadata = <K = string | symbol, V = any>(metadataKey: K, metadataValue: V) => {
    const decoratorFactory = (target: object, key?: any, descriptor?: any) => {
        if (descriptor) {
            Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
            return descriptor;
        };

        Reflect.defineMetadata(metadataKey, metadataValue, target);
        return target;
    };

    decoratorFactory.KEY = metadataKey;

    return decoratorFactory;
};

