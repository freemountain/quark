// @flow

import Error from "es6-error";

export default class CoreComponentError extends Error {
    recoverable: boolean;
    _e:          ?Error;  // eslint-disable-line

    constructor(message: string, e?: ?Error) {
        super(message);

        this.recoverable = !(e instanceof TypeError) || !e;
        this._e          = e;
    }

    isRecoverable(): boolean {
        return this.recoverable;
    }
}
