// @flow

import MessageError from "./MessageError";

export default class UnknownMessageError extends MessageError {
    constructor(context: string, action: string, message: any) {
        super(context, action, `your message is invalid. You gave me ${message}`);
    }
}
