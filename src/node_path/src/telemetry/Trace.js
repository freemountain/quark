// @flow

import { Record, List, Map } from "immutable";
import asciiTree from "asciitree";
import Uuid from "../util/Uuid";
import chalk from "chalk";
import TraceEndedError from "./error/TraceEndedError";
import NotRootError from "./error/NotRootError";
import NotConsistentError from "./error/NotConsistentError";

type TraceDescription = {
    name:     string,   // eslint-disable-line
    id?:      ?string,  // eslint-disable-line
    parent?:  ?number,  // eslint-disable-line
    trigger?: ?string,  // eslint-disable-line
    params?:  ?List<*>, // eslint-disable-line
    start?:   ?number   // eslint-disable-line
}

type Context = ?string

type TraceList = Array<string | TraceList>

export default class Trace extends Record({
    id:       "",
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
    trigger:  null,
    locked:   false
}) {
    constructor(data: TraceDescription, context: Context) { // eslint-disable-line
        super(Object.assign({}, data, {
            name:    context ? `${context}::${data.name}` : data.name,
            parent:  data.parent || null,
            start:   Date.now(),
            trigger: !data.trigger || data.trigger === null || data.trigger === data.name ? null : data.trigger.split(".").pop(),
            params:  data.params instanceof List ? data.params.map(x => x instanceof Map ? x.delete("_unit") : x).toJS() : [],
            id:      !data.id ? Uuid.uuid() : data.id
        }));
    }

    addSubtrace(trace: Trace): Trace {
        return this
            .update("traces", traces => trace.parent === this.id ? traces.push(trace) : traces.map(x => x.addSubtrace(trace)));
    }

    trace(data: TraceDescription, context: Context, trigger: any): Trace {
        return new Trace(data, context, trigger, this.end === null ? this.id : this.parent);
    }

    ended(): Trace {
        if(this.end !== null) throw new TraceEndedError(this);

        const now     = Date.now();
        const ended   = this.set("end", now);

        return ended;
    }

    errored(e: Error): Trace {
        const updated = this.set("error", e);

        return updated.ended();
    }

    triggered(): Trace {
        return this.set("triggers", true);
    }

    isConsistent(): boolean {
        return (
            this.end !== null &&
            this.traces.every(x => x.isConsistent())
        );
    }

    lockRec(): Trace {
        if(!this.isConsistent()) throw new NotConsistentError(this);

        return this
            .set("locked", true)
            .update("traces", traces => traces.map(x => x.lockRec()).sort((x, y) => x.start - y.start));
    }

    lock(): Trace {
        if(this.parent !== null) throw new NotRootError(this);

        return this.lockRec();
    }

    toJS(): Object {
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
            parent:   this.parent,
            trigger:  this.trigger
        };
    }

    toArray(): TraceList { // eslint-disable-line
        const triggers = this.triggers ? "" : "!";
        const params   = this.params
            .map(x => x instanceof Object ? x.constructor.name : JSON.stringify(x)).join(", ");

        const name        = `${triggers}${this.name}(${params})`;
        const trigger     = this.trigger === null ? "" : this.trigger.concat("@");
        const delta       = this.end !== null ? this.end - this.start : Date.now() - this.start;
        const color       = this.error !== null || this.end === null ? "red" : "green";
        const color2      = this.triggers || this.error !== null ? color : "grey";
        const stringified = chalk.inverse[color2](` ${this.error ? "#ERROR " : ""}${name} - ${trigger}`)
            .concat(chalk.inverse[color2](`${delta}ms`))
            .concat(chalk.inverse[color2](`${this.error ? " #" : ""} `));

        return [stringified]
            .concat(this.traces.map(trace => trace.toArray()).toJS());
    }

    toString(): string {
        const result = this.toArray();

        return asciiTree(result);
    }
}
