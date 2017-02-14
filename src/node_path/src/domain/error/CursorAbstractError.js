// @flow

import CursorError from "./CursorError";

export default class CursorAbstractError extends CursorError {
    constructor() {
        super("Cursor can only be used, when inherited.");
    }
}
