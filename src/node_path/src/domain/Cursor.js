// @flow

import TraceNotStartedError from "./error/TraceNotStartedError";
import { fromJS, Map, List, OrderedSet, OrderedMap, Iterable, Seq, Set, Collection, Record, Stack } from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import patch from "immutablepatch";
import diff from "immutablediff";
import Runtime from "../Runtime";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import CursorAbstractError from "./error/CursorAbstractError";
import UnknownMethodError from "./error/UnknownMethodError";
import assert from "assert";
import PendingAction from "./PendingAction";
// import Internals from "./Internals";
import { schedule } from "../Runloop";

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
            const cursor  = this.__cursor.callerChanged();
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
        return this.__data.x.get("_unit");
    }

    get send(): Object {
        return Object.assign({}, this.__actions, {
            __cursor: this
        });
    }

    get size(): number {
        return this.__data.x.size;
    }

    // _message => _unit.action.message
    get message(): ?Message {
        return this.currentAction && this.currentAction.message instanceof Message ? this.currentAction.message.setCursor(this) : null;
    }

    // _action => _unit.action
    get currentAction(): ?PendingAction {
        const maybeAction = this._unit.action;

        return maybeAction && maybeAction !== null ? maybeAction.cursorChanged(this) : maybeAction;
    }

    // _state => _unit.action.state
    get currentState(): ?string {
        return this.currentAction ? this.currentAction.state : null;
    }

    // _debug.currentTrace => _unit.debug.currentTrace
    get currentTrace(): ?Trace {
        return this.traces.first();
    }

    // _debug.traces => _unit.debug.traces
    get traces(): List<Trace> {
        return this._unit.traces;
    }

    // _state.currentError => _unit.action.state.currentError
    get currentError(): ?Error {
        return this.errors.last() || null;
    }

    // das hier müsste statisch im konstruktor gemacht werden
    // _unit.name
    get currentContext(): string {
        return this._unit.name;
    }

    // _action.shouldTrigger => _unit.action.shouldTrigger
    get shouldTrigger(): boolean {
        return !this.hasRecentlyErrored && this.currentAction instanceof PendingAction ? this.currentAction.willTrigger : false;
    }

    // _state.errors => _unit.action.state.errors
    get errors(): List<Error> {
        return this._unit.errors;
    }

    // _unit.children
    get children(): List<Runtime> {
        return this._unit.children;
    }

    // _state.hasErrored => _unit.action.state.hasErrored
    // _state.isRecoverable => _unit.action.state.isRecoverable
    get isRecoverable(): boolean {
        return this._unit.isRecoverable();
    }

    // _debug.isTracing -> besserer name => _unit.debug.isTracing
    get isTracing(): boolean {
        return this._unit && this._unit.isTracing();
    }

    // _state.hasRecentlyErrored => _unit.action.state.hasRecentlyErrored
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
        const updated = this._unit.traces
            .concat(patchSet.traces.filter(x => !x.locked))
            .groupBy(x => x.name)
            .map(x => x.first())
            .toList();

        const next = patched
            .update("_unit", internals => internals.set("action", this.currentAction))
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

    // _state.messageReceived
    messageReceived(message: Message): Cursor {
        return this.update("_unit", internals => internals.messageReceived(message.setCursor(this)));
    }

    callerChanged(): Cursor {
        return this.update("_unit", internals => internals.callerChanged());
    }

    // _state.messageProcessed
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

    // __state.error
    error(e: Error): Cursor {
        return this
            .update("_unit", internals => internals.error(e))
            .trace.error(e);
    }

    defer(op: Function, delay?: number): Promise<*> {
        return schedule(op, delay);
    }

    toString(): string {
        return `${this.constructor.name}<${this.__data.x instanceof Collection ? this.__data.x.filter((_, key) => key !== "_unit").toString() : JSON.stringify(this.__data)}>`;
    }

    done(): Cursor {
        return this
            .update("_unit", internals => internals.actionDone());
    }

    errored(): Cursor {
        return this
            .update("_unit", internals => internals.actionError());
    }

    triggers(): Cursor {
        return this
            .update("_unit", internals => internals.actionTriggers());
    }

    finish(error?: Error): Cursor {
        return (error ? this.trace.error(error) : this.trace.end())
            .update("_unit", internals => internals.actionFinished());
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
