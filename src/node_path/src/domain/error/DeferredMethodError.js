// @flow

import CursorError from "./CursorError";
import type Cursor from "../Cursor";

export default class DeferredMethodError extends CursorError {
    _e: Error
    constructor(cursor: Cursor, key: string, e: Error) {
        super(`DeferredMethod '${cursor.constructor.name}::${key}' threw an error:\n\t${e.message}`);

        this._e = e;
    }
}
