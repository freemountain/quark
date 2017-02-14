// @flow

import CursorError from "./CursorError";

export default class UnknownMethodError extends CursorError {
    constructor(data: any, method: string) {
        super(`Trying to call unknown method '${data ? data.constructor.name : data}::${method}'.`);
    }
}
