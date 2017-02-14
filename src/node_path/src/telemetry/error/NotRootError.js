// @flow

import TraceLockError from "./TraceLockError";
import type Trace from "../Trace";

export default class NotRootError extends TraceLockError {
    constructor(trace: Trace) {
        super(`You can only lock the root of a trace @${trace.name}`);
    }
}
