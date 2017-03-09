// @flow

import WrongContextError from "./WrongContextError";
import Action from "../Action";

export default class InvalidCursorError extends WrongContextError {
    constructor(cursor: any, description?: Action) {
        const kind   = cursor instanceof Object ? cursor.constructor.name : cursor;
        const action = description instanceof Action ? `${description.unit}[${description.name}]` : "unknown Action";

        super(`Invalid cursor of ${kind} for '${action}'.`);
    }
}
