import TraceError from "./TraceError";
import type Trace from "../Trace";

export default class TraceEndedError extends TraceError {
    constructor(trace: Trace) {
        super(`A trace can only be ended once, but got \n\n\t${trace.toString()}.`);
    }
}
