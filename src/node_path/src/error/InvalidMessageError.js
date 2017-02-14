// @flow
import MessageError from "./MessageError";

export default class InvalidMessageError extends MessageError {
    constructor(data: any) {
        super(`Your inputdata is not a valid message, got ${JSON.stringify(data)}.`);
    }
}
