import MessageError from "./MessageError";

export default class UnknownMessageError extends MessageError {
    constructor(context, action, message) {
        super(context, action, `your message is invalid. You gave me ${message}`);
    }
}
