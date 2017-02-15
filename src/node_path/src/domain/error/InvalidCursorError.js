// @flow

import WrongContextError from "./WrongContextError";
import type Action from "../Action";

export default class InvalidCursorError extends WrongContextError {
    constructor(cursor: any, description: Action) {
        const name = cursor instanceof Object ? cursor.constructor.name : cursor;

        super(`Invalid cursor of ${name} for '${description.unit}[${description.name}]'.`);
    }
}
