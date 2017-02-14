// @flow

import MessageError from "../../error/MessageError";

export default class NoMessageError extends MessageError {
    constructor() {
        super("Can't update a trace before receiving a message.");
    }
}
