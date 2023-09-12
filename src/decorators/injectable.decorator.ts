import { injectable as baseInjectable } from "inversify";
import { setMetadata } from "./set-metadata.decorator";
import { applyDecorators } from "../utils";
import { INJECTABLE_OPTIONS } from "../constants";

type InjectableOptions = {
    scope?: "singleton" | "transient" | "request"
}

export const injectable = (options: InjectableOptions = {}) => applyDecorators(
    baseInjectable() as ClassDecorator,
    setMetadata(INJECTABLE_OPTIONS, options),
)
