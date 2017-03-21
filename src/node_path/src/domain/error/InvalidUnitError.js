// @flow

import CursorError from "./CursorError";

export default class InvalidUnitError extends CursorError {
    constructor(x: any) {
        super(`Your data has to contain a UnitState, got ${x}`);
    }
}

