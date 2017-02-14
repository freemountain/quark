// @flow
import RecoverableError from "./RecoverableError";

export default class MessageError extends RecoverableError {
    constructor(context: string, action?: string, reason?: string) {
        super(!action || !reason ? context : `${context}::${action} could not be processed, because ${reason}`);
    }
}
