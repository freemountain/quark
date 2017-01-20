import { Record, List, Stack, Map } from "immutable";
import Trace from "../telemetry/Trace";
import Message from "../Message";
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
    updateCurrentTrace(op) {
        assert(this.action !== null, "Can't update a trace before receiving a message.");

        return this.update("traces", traces => traces.pop().push(op(traces.last())));
    }

    trace(name, params, guards = 0) {
        const args = [{ name, params, guards }, this.name];

        return this.action === null ? this.update("traces", traces => traces.push(new Trace(...args))) : this.updateCurrentTrace(trace => trace.trace(...args));
    }

    messageReceived(message) {
        Message.assert(message);
        assert(this.action === null, "Can't start a message, if another message is currently processed.");

        return this
            .trace(`Message<${message.resource}>`, message.payload)
            .set("action", message)
            .updateCurrentTrace(trace => trace.triggered());
    }

    messageProcessed(e) {
        assert(this.action !== null, "Can't finish a message before starting.");

        const updated = this
            .updateCurrentTrace(trace => e instanceof Error ? trace.errored(e) : trace.ended());

        assert(updated.traces.last().isConsistent(), "There are unfinished traces. Some end calls are missing.");

        return updated.set("action", null);
    }
}
