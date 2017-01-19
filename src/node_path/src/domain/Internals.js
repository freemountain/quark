import { Record, List, Stack, Map } from "immutable";
import Trace from "../telemetry/Trace";
import assert from "assert";

export default class Internals extends Record({
    description: Map(),
    id:          null,
    revision:    0,
    history:     List(),
    errors:      List(),
    diffs:       List(),
    traces:      Stack(),
    current:     0,
    action:      null,
    name:        "Default"
}) {
    traceBegan(...args) {
        return this.update("traces", traces => this.action === null ? traces.push(new Trace(...args)) : traces.pop().push(traces.last().trace(...args)));
    }

    traceTriggered() {
        assert(this.action !== null, "Can't add trigger to trace before starting.");

        return this.update("traces", traces => traces.pop().push(traces.last().trace.triggered()));
    }

    traceErrored(...args) {
        assert(this.action !== null, "Can't end a trace before starting.");

        return this.update("traces", traces => traces.pop().push(traces.last().trace.error(...args)));
    }

    traceEnded() {
        assert(this.action !== null, "Can't end a trace before starting.");

        return this.update("traces", traces => traces.pop().push(traces.last().trace.end()));
    }

    messageReceived(action) {
        assert(this.action === null, "Can't start a message, if another message is currently processed.");

        return this.set("action", action);
    }

    messageProcessed() {
        assert(this.action !== null, "Can't finish a message before starting.");

        return this.set("action", null);
    }
}
