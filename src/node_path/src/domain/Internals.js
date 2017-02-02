import { Record, List, Map, Set } from "immutable";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import assert from "assert";

export default class Internals extends Record({
    description: Map(),
    id:          null,
    revision:    0,
    children:    Map(),
    history:     List(),
    errors:      Set(),
    diffs:       List(),
    traces:      List(),
    current:     0,
    action:      null,
    name:        "Default"
}) {
    currentTrace() {
        return this.traces.findLast(x => x.end === null && !x.locked);
    }

    isTracing() {
        return (
            this.action !== null &&
            this.currentTrace() instanceof Trace
        );
    }

    hasErrored() {
        return this.errors.size > 0;
    }

    error(e) {
        return this.update("errors", errors => errors.add(e));
    }

    updateCurrentTrace(op) {
        assert(this.action !== null, "Can't update a trace before receiving a message.");

        const current = this.currentTrace();

        return this.update("traces", traces => traces.set(this.traces.findLastKey(x => x.end === null && !x.locked), op(current)));
    }

    trace(name, params, guards = 0) {
        const current = this.currentTrace();
        const args    = [{ name, params, guards }, this.name, current ? current.id : current];

        return this.update("traces", traces => traces.push(new Trace(...args)));
    }

    messageReceived(message) {
        Message.assert(message);
        assert(this.action === null, "Can't start a message, if another message is currently processed.");

        return this
            .trace(`Message<${message.resource}>`, message.payload)
            .set("action", message)
            .updateCurrentTrace(trace => trace.triggered());
    }

    mergeTraces(traces) {
        return this.updateCurrentTrace(trace => traces.reduce((dest, x) => dest.merge(x), trace));
    }

    messageProcessed() {
        assert(this.action !== null, "Can't finish a message before starting.");

        const filtered = this.traces.filter(x => !x.locked);
        const trace    = filtered
            .shift()
            .reduce((dest, x) => dest.addSubtrace(x), filtered.first().ended());

        return this
            .update("traces", traces => traces.filter(x => x.locked).push(trace.lock()))
            .update("errors", errors => errors.clear())
            .set("action", null);
    }

    isRecoverable() {
        return this.errors.every(x => x.isRecoverable && x.isRecoverable());
    }
}
