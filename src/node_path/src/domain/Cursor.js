// @flow

import { fromJS, Map, List, Set, OrderedSet, OrderedMap, Stack, Record, Seq, Iterable, Collection } from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import assert from "assert";
import patch from "immutablepatch";
import diff from "immutablediff";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import Runtime from "../Runtime";

export type Diffs = List<{
    op:   string, // eslint-disable-line
    path: string
}>

class Cursor {
    static call: any => Cursor;
    __data:      { x: any }; // eslint-disable-line
    __inherited: boolean;
    update:      any => any; // eslint-disable-line
    trace:       (string, List<any>, string) => Cursor; // eslint-disable-line
    constructor: any => Cursor;
    get:         (string) => any; //eslint-disable-line
    set:         (string, any) => Cursor; // eslint-disable-line

    static assertTraceStarted(cursor: Cursor, caller: string): void {
        assert(cursor.isTracing, `You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to '${caller}'.`);
    }

    static trace(cursor: Cursor, ...args: *): Cursor {
        assert(cursor.isTracing, "You can only call 'Cursor::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance to the constructor of this class, which did receive a message.");

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

    static for(instance: {}, description: Map<*, *>) {
        assert(instance instanceof Object, `instance has to be an object, but got ${JSON.stringify(instance)}`);
        assert(description instanceof Map, `description has to be an Immutable.Map, but got ${JSON.stringify(description)}`);

        const inherited = function(...args) {
            Object.defineProperty(this, "__inherited", {
                enumerable:   false,
                value:        true,
                writable:     false,
                configurable: false
            });

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

        description.forEach((action, key) => {
            Object.defineProperty(inherited.prototype, key, {
                enumerable:   false,
                configurable: false,
                writable:     false,
                value:        function(...args) {
                    return action.func.call(this, ...args);
                }
            });
        });

        // TODO: add props getter

        return inherited;
    }

    constructor(data: {} | Cursor) { // eslint-disable-line
        if(!(data instanceof Object) || data instanceof Cursor) return data;

        assert(this.__inherited, "Cursor can only be used, when inherited");

        this.__data = {
            x: fromJS(data)
        };

        // needs to be copied, since we are mutating the Function
        // object otherwise
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

    get size(): number {
        return this.__data.x.size;
    }

    get currentMessage(): ?Message {
        const message = this.__data.x.get("_unit").action;

        return message;
    }

    get currentTrace(): ?Trace {
        return this.__data.x.get("_unit").currentTrace();
    }

    get traces(): List<Trace> {
        return this.__data.x.get("_unit").traces;
    }

    get currentError(): ?Error {
        return this.errors.last() || null;
    }

    get currentContext(): string {
        return this.__data.x.get("_unit").name;
    }

    get errors(): List<Error> {
        return this.__data.x.get("_unit").errors;
    }

    get children(): List<Runtime> {
        return this.__data.x.get("_unit").children;
    }

    get hasErrored(): boolean {
        return this.__data.x.get("_unit").hasErrored();
    }

    get isRecoverable(): boolean {
        return this.__data.x.get("_unit").isRecoverable();
    }

    get isTracing(): boolean {
        return this.__data.x.get("_unit") && this.__data.x.get("_unit").isTracing();
    }

    patch(diffs: Diffs, traces: List<Trace> = List(), errors: List<Error> = List()) {
        assert(diffs instanceof List, `Diffs need to be of type Immutable.List or Immutable.Set, got '${typeof diffs === "object" ? diffs.constructor.name : JSON.stringify(diffs)}'.`);

        const first = diffs.first();

        assert(!first || (first instanceof Map && first.get("op") && first.get("path")), `a diff needs to have the keys 'op' and 'path', got '${typeof first === "object" ? first.constructor.name : JSON.stringify(first)}'.`);

        const patched = patch(this.__data.x, diffs);
        const updated = this.__data.x.get("_unit").traces
            .concat(traces.filter(x => !x.locked))
            .groupBy(x => x.name)
            .map(x => x.first())
            .toList();

        const next = patched
            .update("_unit", internals => internals.set("traces", updated))
            .update("_unit", internals => internals.update("errors", x => x.concat(errors)));

        return new this.constructor(next);
    }

    diff(cursor: Cursor): Diffs {
        return diff(this.__data.x, cursor.__data.x);
    }

    equals(cursor: Cursor): boolean {
        assert(false, "Cursor.equals: implement!");

        assert(cursor instanceof this.constructor, `You can only compare two cursors of the same type ('${this.constructor.name}'), got '${typeof cursor === "object" ? cursor.constructor.name : JSON.stringify(cursor)}'.`);

        return this.__data.x === cursor.__data.x;
    }

    progress(): Cursor {
        assert(false, "Cursor.progress: implement!");

        // hier soll der progress wert hochgesetzt werden um den gegebenen param
        return this;
    }

    messageReceived(message: Message): Cursor {
        return this.update("_unit", internals => internals.messageReceived(message));
    }

    messageProcessed(): Cursor {
        return this.update("_unit", internals => internals.messageProcessed());
    }

    cancel(): Cursor {
        assert(false, "Cursor.cancel: implement (use Action.cancel)!");

        // hiermit soll die aktuelle action gecanceled, werden + state revert
        return this;
    }

    undo(): Cursor {
        assert(false, "Cursor.undo: implement!");

        // hiermit soll die history en schritt zurückgesetzt werden
        return this;
    }

    redo(): Cursor {
        assert(false, "Cursor.redo: implement!");

        // hiermit soll ein schritt in der history nach vorne gegangen werden
        return this;
    }

    error(e: Error): Cursor {
        assert(e instanceof Error, `You can only error with an error, but got ${e.toString()}`);

        return this
            .update("_unit", internals => internals.error(e))
            .trace.error(e);
    }

    toString(): string {
        return `${this.constructor.name}<${this.__data ? this.__data.x : this.__data}>`;
    }
}

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
            const op = this.__data.x[method];

            assert(op instanceof Function, `Method '${this.__data.x.constructor.name}::${method}' is undefined.`);

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
