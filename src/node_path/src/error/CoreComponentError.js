import Error from "es6-error";

export default class CoreComponentError extends Error {
    constructor(message, e) {
        super(message);

        this._e = e;
    }

    isRecoverable() {
        return (
            this._e instanceof Error &&
            !(
                this._e instanceof TypeError
            )
        );
    }
}
