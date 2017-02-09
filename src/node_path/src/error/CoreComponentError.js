import Error from "es6-error";

export default class CoreComponentError extends Error {
    constructor(message, e) {
        super(message);

        this.recoverable = (
            e instanceof Error &&
            !(e instanceof TypeError)
        ) || !e;
        this._e = e;
    }

    isRecoverable() {
        return this.isRecoverable;
    }
}
