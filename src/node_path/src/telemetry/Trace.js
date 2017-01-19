import { Record } from "immutable";

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
    pos:      0
}) {
    constructor(data, cursor, parent, pos) {
        super(Object.assign(data, {
            name:   cursor.get("_unit").name.concat("[").concat(data.name).concat("]"),
            start:  Date.now(),
            parent: parent,
            pos:    pos
        }));

        this.trace.end       = this.stop.bind(this);
        this.trace.error     = this.errored.bind(this);
        this.trace.triggered = this.triggered.bind(this);
    }

    trace(data, cursor) {
        const child = new Trace(data, cursor, this, this.traces.length);

        this.traces.push(child);

        return child;
    }

    stop() {
        this.parent.children[this.pos] = this.set("end", Date.now());

        return this.parent;
    }

    errored(e) {
        this.parent.children[this.pos] = this.set("error", e);

        return this.parent;
    }

    triggered() {
        return this.set("triggered", true);
    }

    toString() {
        return `
        ${this.name}
    ${this.children.map(x => x.toString().join())}
        `;
    }
}
