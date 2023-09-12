import { inject } from "inversify";
import { ID } from "../constants";

export const id = () => {
    return inject(ID);
}