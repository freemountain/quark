// @flow

import CoreComponentError from "./CoreComponentError";

export default class NonRecoverableError extends CoreComponentError {
    isRecoverable() {
        return false;
    }
}
