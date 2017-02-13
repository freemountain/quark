// @flow
import CoreComponentError from "../../error/CoreComponentError";

export default class MessageError extends CoreComponentError {
    constructor(context: string, action: string, reason: string) {
        super(`${context}::${action} could not be processed, because ${reason}`);
    }
}
