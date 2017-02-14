// @flow

import CoreComponentError from "./CoreComponentError";

export default class RecoverableError extends CoreComponentError {
    isRecoverable() {
        return true;
    }
}
