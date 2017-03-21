// @flow

import { fromJS, Map, List, OrderedSet, OrderedMap, Iterable, Seq, Set, Collection, Record, Stack } from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import patch from "immutablepatch";
import diff from "immutablediff";
import Message from "../Message";
import CursorAbstractError from "./error/CursorAbstractError";
import UnknownMethodError from "./error/UnknownMethodError";
import InvalidUnitError from "./error/InvalidUnitError";
import DeferredMethodError from "./error/DeferredMethodError";
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
    then:          ?any => Cursor;                        // eslint-disable-line
    __promise:     ?Promise<*>;                           // eslint-disable-line

    static box(cursor: Cursor, op: Function, args?: Array<*> = []): Cursor {
        const promise = cursor.__promise;

        if(!(promise instanceof Promise)) return op.call(cursor, ...args);

        return Cursor.wrap(cursor, promise.then(x => x instanceof Cursor ? op.call(x, ...args) : op.call(cursor, x, ...args)));
    }

    static wrap(cursor, promise) {
        return new cursor.constructor(cursor.__data.x, cursor.__previous, cursor.__next, promise);
    }

    static then(cursor: Cursor, ...args: Array<*>): Cursor {
        const promise = cursor.__promise instanceof Promise ? cursor.__promise : Promise.resolve(cursor);

        return Cursor.wrap(cursor, promise.then(...args));
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
        inherited.prototype.__inherited = true;
        inherited.prototype.__actions   = description.map((action, key) => function(...payload: Array<mixed>) {
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
        }).toJS();

        // hier das muss im zuge von anderem stuff sein
        /* inherited.prototype = getAllProperties(inherited.prototype)
            .reduce((dest, key) => {
                const op = dest[key];

                if(key === "constructor") return dest;

                dest[key] = op instanceof Function ? function(...args) {
                    return Cursor.box(this, op, args);
                } : op;

                return dest;
            }, inherited.prototype);*/

        return inherited;
    }

    constructor(data: any, previous?: Cursor, next?: Cursor, promise?: Promise<*>) { // eslint-disable-line
        if(data instanceof Cursor) return data;
        if(!this.__inherited)      throw new CursorAbstractError();

        const x = fromJS(data);

        if(!(x instanceof Map)) throw new InvalidUnitError(x);

        this.__data = {
            x: x
        };
        this.__previous = previous;
        this.__next     = next;
        this.__promise  = promise;

        if(this.__promise instanceof Promise) this.then = Cursor.then.bind(null, this);

        Object.freeze(this);

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
        return this.action instanceof PendingAction ? this.action.message : null;
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

        const debug = this.debug
            .set("traces", updated)
            .setCursor(null);

        const next = patched
            .update("_unit", unit => unit.set("action", action))
            .update("_unit", unit => unit.set("debug", debug));

        return new this.constructor(next, this);
    }

    diff(cursor: Cursor): Diffs | Promise<Diffs> {
        return diff(this.__data.x, cursor.__data.x);
    }

    isEqual(cursor: Cursor): boolean | Promise<boolean> {
        return cursor instanceof this.constructor && this.__data.x === cursor.__data.x;
    }

    undo(): Cursor {
        return this.__previous instanceof Cursor ? new this.constructor(this.__previous.__data.x, this.__previous.__previous, this, this.__promise) : this;
    }

    redo(): Cursor {
        return this.__next instanceof Cursor ? this.__next : this;
    }

    defer(op: Function, delay?: number): Cursor {
        return Cursor.wrap(this, schedule(op, delay));
    }

    toString(): string | Promise<string> {
        return `${this.constructor.name}<${this.__data.x instanceof Collection ? this.__data.x.filter((_, key) => key !== "_unit").toString() : JSON.stringify(this.__data)}>`;
    }

    catch(...args: Array<*>): Cursor {
        const promise = this.__promise instanceof Promise ? this.__promise : Promise.resolve(this);

        return Cursor.wrap(this, promise.catch(...args));
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

            try {
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
                ) ? new this.constructor(result, this, null, this.__promise) : result;
            } catch(e) {
                throw new DeferredMethodError(this, method, e);
            }
        }
    }));

export default Cursor;
