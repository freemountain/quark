// @flow

import TraceLockError from "./TraceLockError";
import type Trace from "../Trace";

export default class NotConsistentError extends TraceLockError {
    constructor(trace: Trace) {
        super(`You can only lock consistent traces. Some end calls are probably missing @${trace.name}.`);
    }
}
