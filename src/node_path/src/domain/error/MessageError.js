import NonRecoverableError from "../../error/NonRecoverableError";

export default class MessageError extends NonRecoverableError {
    constructor(context, action, reason) {
        super(`${context}::${action} could not be processed, because ${reason}`);
    }
}
