// @flow

import WrongContextError from "./WrongContextError";
import type Action from "../Action";

export default class InvalidCursorError extends WrongContextError {
    constructor(cursor: any, description: Action) {
        super(`Invalid cursor of ${Object.getPrototypeOf(cursor)} for '${description.unit}[${description.name}]'.`);
    }
}
