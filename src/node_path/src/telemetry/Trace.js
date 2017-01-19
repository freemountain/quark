import { Record, List } from "immutable";
import Cursor from "../domain/Cursor";
import assert from "assert";

export default class Trace extends Record({
    start:    0,
    name:     "unknown",
    triggers: false,
    error:    null,
    end:      null,
    traces:   [],
    params:   List(),
    guards:   0,
    parent:   null,
    pos:      null
}) {
    constructor(data, cursor, parent = null, pos = null) {
        assert(cursor instanceof Cursor, "Need a cursor");

        super(Object.assign(data, {
            name:   cursor.get("_unit").get("name").concat("[").concat(data.name).concat("]"),
            start:  Date.now(),
            parent: parent,
            pos:    pos,
            traces: []
        }));

        this.trace.end       = this.stop.bind(this);
        this.trace.error     = this.errored.bind(this);
        this.trace.triggered = this.triggered.bind(this);
    }

    trace(data, cursor) {
        const child = new Trace(data, cursor, this, this.traces.length);

        child.parent.traces.push(child);

        return child;
    }

    stop() {
        assert(this.pos !== null, "Can't end a trace, when not started.");

        this.parent.get("traces")[this.pos] = this.set("end", Date.now());

        return this.parent;
    }

    errored(e) {
        this.parent.get("traces")[this.pos] = this.set("error", e);

        return this.stop();
    }

    triggered() {
        return this.set("triggered", true);
    }

    /* toString() {
        return `
        ${this.name}
    ${this.traces.map(x => x.toString().join())}
        `;
    }*/

    toJS() {
        return {
            name:     this.name,
            guards:   this.guards,
            start:    this.start,
            end:      this.end,
            error:    this.error,
            traces:   this.traces.map(trace => trace.toJS()),
            params:   this.params.toJS(),
            triggers: this.triggers
        };
    }
}
