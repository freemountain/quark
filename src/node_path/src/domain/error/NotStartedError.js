// @flow

import RecoverableError from "../../error/RecoverableError";

export default class NotStartedError extends RecoverableError {
    constructor() {
        super("Can't finish a message before starting.");
    }
}
