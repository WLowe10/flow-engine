import type { ClassType } from "./class";

export type ProvideType = string | symbol | Function;

export type ClassServiceType = {
    provide: ProvideType,
    useClass: ClassType<any>,
}

export type ValueServiceType = {
    provide: ProvideType,
    useValue: any,
}

export type FactoryServiceType = {
    provide: ProvideType,
    inject: Array<ProvideType>,
    useFactory: (...args: any[]) => any,
};

export type ServicesType = Array<(
    | Function 
    | ClassServiceType
    | ValueServiceType
    | FactoryServiceType
)>;

