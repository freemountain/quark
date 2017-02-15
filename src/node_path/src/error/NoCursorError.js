// @flow
import MessageError from "./MessageError";

export default class NoCursorError extends MessageError {
    constructor(method: string) {
        super(`${method} - you need to set the cursor before using it.`);
    }
}
