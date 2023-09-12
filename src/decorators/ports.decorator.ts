import { PORTS } from "../constants";

type Props = {
    input?: {

    },
    output?: {

    }
};

export const ports = (ports: Props): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata(PORTS, ports, target);
    }
}