import { Record, List, Stack, Map } from "immutable";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import assert from "assert";

export default class Internals extends Record({
    description: Map(),
    id:          null,
    revision:    0,
    children:    Map(),
    history:     List(),
    errors:      List(),
    diffs:       List(),
    traces:      Stack(),
    current:     0,
    action:      null,
    name:        "Default"
}) {
    currentTrace() {
        const trace = this.traces.last();

        return trace && !trace.locked ? trace : null;
    }

    isTracing() {
        return this.currentTrace() instanceof Trace;
    }

    hasErrored() {
        assert(false, "Cursor.redo: implement!");

        return this.errors.size > 0;
    }

    error(e) {
        assert(false, "Cursor.redo: implement!");

        return this.update("errors", errors => errors.push(e));
    }

    updateCurrentTrace(op) {
        assert(this.action !== null, "Can't update a trace before receiving a message.");

        return this.update("traces", traces => {
            const current = this.currentTrace();

            assert(current instanceof Trace, "Please start a trace with Internals::trace, before trying to update it");
            return traces.pop().push(op(current));
        });
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

    messageProcessed() {
        assert(this.action !== null, "Can't finish a message before starting.");

        const updated = this
            .updateCurrentTrace(trace => trace.ended().lock());

        return updated
            .update("errors", errors => errors.clear())
            .set("action", null);
    }

    isRecoverable() {
        assert(false, "Cursor.redo: implement!");

        return this.errors.every(x => x.isRecoverable && x.isRecoverable());
    }
}
