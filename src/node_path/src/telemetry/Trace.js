import { Record, List, Map } from "immutable";
import assert from "assert";
import asciiTree from "asciitree";
import Uuid from "../util/Uuid";

export default class Trace extends Record({
    id:       null,
    start:    0,
    name:     "unknown",
    triggers: false,
    error:    null,
    end:      null,
    traces:   List(),
    params:   [],
    guards:   0,
    parent:   null,
    pos:      null,
    locked:   false
}) {
    constructor(data, context, parent = null) { // eslint-disable-line
        assert(data && typeof data.name === "string", "a trace needs a name");

        super(Object.assign(data, {
            id:     !data.id || data.id === null ? Uuid.uuid() : data.id,
            name:   context ? `${context}::${data.name}` : data.name,
            parent: parent ? parent : (data.parent || null),
            start:  Date.now(),
            params: data.params && data.params instanceof List ? data.params.map(x => x instanceof Map ? x.delete("_unit") : x).toJS() : []
        }));
    }

    addSubtrace(trace) {
        return this
            .update("traces", traces => trace.parent === this.id ? traces.push(trace) : traces.map(x => x.addSubtrace(trace)));
    }

    trace(data, context) {
        return new Trace(data, context, this.end === null ? this.id : this.parent);
    }

    ended() {
        assert(this.end === null, "A trace can only be ended once.");

        const now     = Date.now();
        const ended   = this.set("end", now);

        return ended;
    }

    errored(e) {
        const updated = this.set("error", e);

        return updated.ended();
    }

    triggered() {
        return this.set("triggers", true);
    }

    isConsistent() {
        return (
            this.end !== null &&
            this.traces.every(x => x.isConsistent())
        );
    }

    lockRec() {
        assert(this.isConsistent(), `You can only lock consistent traces. Some end calls are probably missing.\n\n${this}`);

        return this
            .set("locked", true)
            .update("traces", traces => traces.map(x => x.lockRec()));
    }

    lock() {
        assert(this.parent === null, "You can only lock the root of a trace");

        return this.lockRec();
    }

    toJS() {
        return {
            id:       this.id,
            locked:   this.locked,
            name:     this.name,
            guards:   this.guards,
            start:    this.start,
            end:      this.end,
            error:    this.error,
            traces:   this.traces.map(trace => trace.toJS()).toJS(),
            params:   this.params,
            triggers: this.triggers,
            parent:   this.parent
        };
    }

    toArray() {
        const node = `${this.error ? "#ERROR " : ""}${this.triggers ? "" : "!"}${this.name}(${this.params.map(x => typeof x === "object" ? x.constructor.name : JSON.stringify(x)).join(", ")}) - ${this.end !== null ? `${this.end - this.start}ms` : (new Date(this.start)).toTimeString().slice(0, 8)}${this.error ? " #" : ""}`;

        return [node].concat(this.traces.map(trace => trace.toArray()).toJS());
    }

    toString() {
        const result = this.toArray();

        return asciiTree(result);
    }
}
