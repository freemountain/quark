import { Record, List, Map } from "immutable";
import assert from "assert";
import asciiTree from "asciitree";

export default class Trace extends Record({
    start:    0,
    name:     "unknown",
    triggers: false,
    error:    null,
    end:      null,
    traces:   [],
    params:   [],
    guards:   0,
    parent:   null,
    pos:      null,
    locked:   false
}) {
    constructor(data, context, parent = null, pos = null) {
        assert(data && typeof data.name === "string", "a trace needs a name");

        super(Object.assign(data, {
            name:   context ? `${context}::${data.name}` : data.name,
            start:  Date.now(),
            parent: parent,
            pos:    pos,
            traces: [],
            params: data.params && data.params instanceof List ? data.params.map(x => x instanceof Map ? x.delete("_unit") : x).toJS() : []
        }));
    }

    trace(data, context) {
        const child = new Trace(data, context, this, this.traces.length);

        child.parent.traces.push(child);

        return child;
    }

    ended() {
        assert(this.end === null, "Can't stop a trace, that is already finished.");

        const now     = Date.now();
        const ended   = this.set("end", now);
        const updated = ended
            .update("traces", traces => traces.map(trace => trace.set("parent", ended)));

        if(this.parent === null) return updated;

        const parent = updated.parent;

        parent.get("traces")[this.pos] = updated;

        return parent;
    }

    errored(e) {
        assert(this.end === null, "Can't error a trace, that is already finished.");

        const updated = this.set("error", e);

        return updated.ended();
    }

    triggered() {
        const updated = this.set("triggers", true);

        if(this.parent === null) return updated;

        this.parent.get("traces")[this.pos] = updated;

        return updated;
    }

    __isSelfConsistent() {
        return (
            this.end !== null &&
            this.traces.reduce((dest, child) => dest && child.__isSelfConsistent(), true)
        );
    }

    __isParentConsistent() {
        return this.end !== null && (this.parent === null || this.parent.__isParentConsistent());
    }

    isConsistent() {
        return this.__isSelfConsistent() && this.__isParentConsistent();
    }

    lock() {
        assert(this.isConsistent(), `You can only lock consistent traces. Some end calls are probably missing.\n\n${this}`);

        return this.set("locked", true);
    }

    toJS() {
        return {
            name:     this.name,
            guards:   this.guards,
            start:    this.start,
            end:      this.end,
            error:    this.error,
            traces:   this.traces.map(trace => trace.toJS()),
            params:   this.params,
            triggers: this.triggers
        };
    }

    toArray() {
        const node = `${this.error ? "#ERROR " : ""}${this.triggers ? "" : "!"}${this.name}(${this.params.map(x => typeof x === "object" ? x.constructor.name : JSON.stringify(x)).join(", ")}) - ${this.end !== null ? `${this.end - this.start}ms` : (new Date(this.start)).toTimeString().slice(0, 8)}${this.error ? " #" : ""}`;

        return [node].concat(this.traces.map(trace => trace.toArray()));
    }

    toString() {
        const result = this.toArray();

        return asciiTree(result);
    }
}
