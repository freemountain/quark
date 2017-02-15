// @flow

import TraceNotStartedError from "./error/TraceNotStartedError";
import { fromJS, Map, List, OrderedSet, OrderedMap, Iterable, Seq, Set, Collection, Record, Stack } from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import patch from "immutablepatch";
import diff from "immutablediff";
import Runtime from "../Runtime";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import type { State } from "./PendingAction";
import CursorAbstractError from "./error/CursorAbstractError";
import UnknownMethodError from "./error/UnknownMethodError";
import assert from "assert";
import PendingAction from "./PendingAction";

export type Diffs = List<{
    op:    string, // eslint-disable-line
    path:  string, // eslint-disable-line
    value: any
}>

class Cursor {
    static call: any => Cursor;
    __data:      { x: any };                            // eslint-disable-line
    __inherited: boolean;
    __previous:  ?Cursor;                               // eslint-disable-line
    __next:      ?Cursor;                               // eslint-disable-line       
    update:      any => any;                            // eslint-disable-line
    trace:       (string, List<any>, string) => Cursor; // eslint-disable-line
    constructor: any => Cursor;
    get:         (string) => any;                       //eslint-disable-line
    set:         (string, any) => Cursor;               // eslint-disable-line

    static assertTraceStarted(cursor: Cursor, caller: string): void {
        if(!cursor.isTracing) throw new TraceNotStartedError(`You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to '${caller}'.`);
    }

    static trace(cursor: Cursor, ...args: *): Cursor {
        if(!cursor.isTracing) throw new TraceNotStartedError("You can only call 'Cursor::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance to the constructor of this class, which did receive a message.");

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

    static for(instance: Object, description: Map<*, *>) {
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

    constructor(data: any, previous?: Cursor, next?: Cursor) { // eslint-disable-line
        if(data instanceof Cursor) return data;
        if(!this.__inherited)      throw new CursorAbstractError();

        this.__data = {
            x: fromJS(data)
        };
        this.__previous = previous;
        this.__next     = next;

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
        return this.currentAction ? this.currentAction.message : null;
    }

    get currentAction(): ?Message {
        return this.__data.x.get("_unit").action;
    }

    get currentState(): State {
        return this.currentAction ? this.currentAction.getState() : "waiting";
    }

    get currentTrace(): ?Trace {
        return this.traces.first();
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

    get shouldTrigger(): boolean {
        return !this.hasRecentlyErrored && this.currentAction instanceof PendingAction ? this.currentAction.willTrigger : false;
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

    get hasRecentlyErrored(): boolean {
        return this.currentError !== this.undo().currentError;
    }

    patch(...results: Array<Cursor>): Cursor {
        const patchSet = results.reduce((dest, y) => {
            return Object.assign(dest, {
                diffs:  dest.diffs.concat(this.diff(y)),
                traces: dest.traces.concat(y.traces),
                errors: dest.errors.concat(y.errors)
            });
        }, { diffs: Set(), traces: List(), errors: List() });

        const patched = patch(this.__data.x, patchSet.diffs.toList());
        const updated = this.__data.x.get("_unit").traces
            .concat(patchSet.traces.filter(x => !x.locked))
            .groupBy(x => x.name)
            .map(x => x.first())
            .toList();

        const next = patched
            .update("_unit", internals => internals.set("traces", updated))
            .update("_unit", internals => internals.update("errors", x => x.concat(patchSet.errors)));

        return new this.constructor(next);
    }

    diff(cursor: Cursor): Diffs {
        return diff(this.__data.x, cursor.__data.x);
    }

    isEqual(cursor: Cursor): boolean {
        return cursor instanceof this.constructor && this.__data.x === cursor.__data.x;
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
        return this.__previous ? new this.constructor(this.__previous.__data.x, this.__previous.__previous, this) : this;
    }

    redo(): Cursor {
        return this.__next ? this.__next : this;
    }

    error(e: Error): Cursor {
        return this
            .update("_unit", internals => internals.error(e))
            .trace.error(e);
    }

    toString(): string {
        return `${this.constructor.name}<${this.__data.x instanceof Collection ? this.__data.x.filter((_, key) => key !== "_unit").toString() : JSON.stringify(this.__data)}>`;
    }

    BEFORE() {
        return this.update("_unit", internals => internals.actionBefore());
    }

    DONE() {
        return this.update("_unit", internals => internals.actionDone());
    }

    ERROR() {
        return this.update("_unit", internals => internals.actionError());
    }

    TRIGGERS() {
        return this.update("_unit", internals => internals.actionTriggers());
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
