// @flow

import TraceNotStartedError from "./error/TraceNotStartedError";
import { fromJS, Map, List, OrderedSet, OrderedMap, Iterable, Seq, Set, Collection, Record, Stack } from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import patch from "immutablepatch";
import diff from "immutablediff";
import Message from "../Message";
import CursorAbstractError from "./error/CursorAbstractError";
import UnknownMethodError from "./error/UnknownMethodError";
import PendingAction from "./PendingAction";
import { schedule } from "../Runloop";
import type Debug from "./Debug";

export type Diffs = List<{
    op:    string, // eslint-disable-line
    path:  string, // eslint-disable-line
    value: any
}>

class Cursor {
    static call: any => Cursor;
    __data:        { x: any };                            // eslint-disable-line
    __inherited:   boolean;                               // eslint-disable-line
    __previous:    ?Cursor;                               // eslint-disable-line
    __next:        ?Cursor;                               // eslint-disable-line       
    update:        any => any;                            // eslint-disable-line
    trace:         (string, List<any>, string) => Cursor; // eslint-disable-line
    constructor:   any => Cursor;                         // eslint-disable-line
    get:           (string) => any;                       // eslint-disable-line
    set:           (string, any) => Cursor;               // eslint-disable-line
    __actions:     Object;                                // eslint-disable-line
    __actionProto: Object;

    static assertTraceStarted(cursor: Cursor, caller: string): void {
        if(!cursor.debug.isTracing) throw new TraceNotStartedError(`You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to '${caller}'.`);
    }

    // >>>>> in debug
    static trace(cursor: Cursor, ...args: *): Cursor {
        if(!cursor.debug.isTracing) throw new TraceNotStartedError("You can only call 'Cursor::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance to the constructor of this class, which did receive a message.");

        const data = cursor.__data.x.update("_unit", internals => internals.trace(...args));

        return new cursor.constructor(data);
    }

    static triggered(cursor: Cursor): Cursor {
        Cursor.assertTraceStarted(cursor, "triggered");

        const data = cursor.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(trace => trace.triggered()));

        return new cursor.constructor(data);
    }

    static error(cursor: Cursor, e: Error): Cursor {
        Cursor.assertTraceStarted(cursor, "errored");

        const data = cursor.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(trace => trace.errored(e)));

        return new cursor.constructor(data);
    }

    static end(cursor: Cursor): Cursor {
        Cursor.assertTraceStarted(cursor, "ended");

        const data = cursor.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(trace => trace.ended()));

        return new cursor.constructor(data);
    }
    // >>> in debug

    static for(instance: Object, description: Map<*, *>) {
        const inherited = function(...args) {
            return Cursor.call(this, ...args);
        };

        Object.defineProperty(inherited, "name", ({
            writable: true
        }: Object));

        inherited.name = `${instance.constructor.name}Cursor`;

        Object.defineProperty(inherited, "name", ({
            writable: false
        }: Object));

        inherited.prototype             = Object.create(Cursor.prototype);
        inherited.prototype.constructor = inherited;
        inherited.prototype.__actions   = {};
        inherited.prototype.__inherited = true;

        Object.assign(inherited.prototype.__actions, description.map((action, key) => function(...payload: Array<mixed>) {
            const message = new Message(key, List(payload), this.__headers);
            const cursor  = this.__cursor;
            const func    = action.func.bind(cursor, message);

            // hier muss en cursor rauskommen der das alles abwartet, damit das chainbar wird
            return this.__delay ? cursor.defer(func, this.__delay) : func();
        }).set("headers", function(headers: Object): { headers: Function, after: Function } {
            this.__headers = Map(headers);

            return Object.assign({}, this);
        }).set("delay", function(delay: number): { headers: Function, after: Function } {
            this.__delay = delay;

            return Object.assign({}, this);
        }).toJS());

        return inherited;
    }

    constructor(data: any, previous?: Cursor, next?: Cursor) {
        if(data instanceof Cursor) return data;
        if(!this.__inherited)      throw new CursorAbstractError();

        const x = fromJS(data);

        this.__data = {
            x: x
        };
        this.__previous = previous;
        this.__next     = next;

        // needs to be copied, since we are mutating
        // the Function object otherwise
        this.trace           = Cursor.trace.bind(null, this);
        this.trace.triggered = Cursor.triggered.bind(null, this);
        this.trace.error     = Cursor.error.bind(null, this);
        this.trace.end       = Cursor.end.bind(null, this);

        Object.freeze(this);
        Object.freeze(this.trace);

        return this;
    }

    generic(mapper: (cursor: Cursor) => Cursor): Cursor {
        return mapper(this);
    }

    get _unit() {
        return this.__data.x.get("_unit").setCursor(this);
    }

    get send(): Object {
        return Object.assign({}, this.__actions, {
            __cursor: this
        });
    }

    get size(): number {
        return this.__data.x.size;
    }

    get message(): ?Message {
        return this.action ? this.action.message : null;
    }

    get action(): ?PendingAction {
        return this._unit.action;
    }

    get debug(): Debug {
        return this._unit.debug;
    }

    patch(...results: Array<Cursor>): Cursor {
        const patchSet = results.reduce((dest, y) => Object.assign(dest, {
            diffs:  dest.diffs.concat(this.diff(y)),
            traces: dest.traces.concat(y.debug.traces),
            errors: dest.errors.concat(y.action instanceof PendingAction ? y.action.state.errors : [])
        }), { diffs: Set(), traces: List(), errors: Set() });

        const patched = patch(this.__data.x, patchSet.diffs.toList());
        const updated = this.debug.traces
            .concat(patchSet.traces.filter(x => !x.locked))
            .groupBy(x => x.name)
            .map(x => x.first())
            .toList();

        const action = !(this.action instanceof PendingAction) ? this.action : this.action
            .update("state", state => state.set("errors", state.errors.concat(patchSet.errors)));

        const debug = this.debug.set("traces", updated);
        const next  = patched
            .update("_unit", internals => internals.set("action", action))
            .update("_unit", internals => internals.set("debug", debug));

        return new this.constructor(next);
    }

    diff(cursor: Cursor): Diffs {
        return diff(this.__data.x, cursor.__data.x);
    }

    isEqual(cursor: Cursor): boolean {
        return cursor instanceof this.constructor && this.__data.x === cursor.__data.x;
    }

    undo(): Cursor {
        return this.__previous ? new this.constructor(this.__previous.__data.x, this.__previous.__previous, this) : this;
    }

    redo(): Cursor {
        return this.__next ? this.__next : this;
    }

    error(e: Error): Cursor {
        return this
            .addError(e)
            .trace.error(e);
    }

    // das hier noch rausbekommen, durch trace.error conditional argument error
    addError(e: Error): Cursor {
        return this
            .update("_unit", internals => internals.set("action", internals.action.addError(e)));
    }

    defer(op: Function, delay?: number): Promise<*> {
        return schedule(op, delay);
    }

    toString(): string {
        return `${this.constructor.name}<${this.__data.x instanceof Collection ? this.__data.x.filter((_, key) => key !== "_unit").toString() : JSON.stringify(this.__data)}>`;
    }
}

// das bei cursor.for machen je nach props
ImmutableMethods
    .filter(key => ( // eslint-disable-line
        key.slice(0, 1) !== "_" &&
        (
            (Map.prototype: Object)[key] instanceof Function ||
            (List.prototype: Object)[key] instanceof Function ||
            (Set.prototype: Object)[key] instanceof Function ||
            (OrderedSet.prototype: Object)[key] instanceof Function ||
            (OrderedMap.prototype: Object)[key] instanceof Function ||
            (Stack.prototype: Object)[key] instanceof Function ||
            (Record.prototype: Object)[key] instanceof Function ||
            (Seq.prototype: Object)[key] instanceof Function ||
            (Iterable.prototype: Object)[key] instanceof Function ||
            (Collection.prototype: Object)[key] instanceof Function
        )
    ))
    .forEach(method => Object.defineProperty(Cursor.prototype, method, {
        enumerable:   false,
        configurable: false,
        value:        function(...args) { // eslint-disable-line
            const op = this.__data.x instanceof Object ? this.__data.x[method] : null;

            if(!(op instanceof Function)) throw new UnknownMethodError(this.__data.x, method);

            const result = op.call(this.__data.x, ...args);

            // TODO: hier muss nach den props gecheckt werden
            return (
                result instanceof Map ||
                result instanceof List ||
                result instanceof Set ||
                result instanceof OrderedSet ||
                result instanceof OrderedMap ||
                result instanceof Stack ||
                result instanceof Seq
            ) ? new this.constructor(result, this) : result;
        }
    }));

export default Cursor;
