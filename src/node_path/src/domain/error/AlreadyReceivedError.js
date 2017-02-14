// @flow

import MessageError from "../../error/MessageError";

export default class AlreadyReceivedError extends MessageError {
    constructor() {
        super("Can't start a message, if another message is currently processed.");
    }
}
