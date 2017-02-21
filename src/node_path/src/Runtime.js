import { Duplex } from "stream";
import assert from "assert";
import diff from "immutablediff";
import { Map, List, fromJS } from "immutable";
// import Trigger from "./domain/Trigger";
// import uuid from "uuid";
import curry from "lodash.curry";
import Trigger from "./domain/Trigger";
import Action from "./domain/Action";
import DeclaredAction from "./domain/DeclaredAction";
import DeclaredTrigger from "./domain/DeclaredTrigger";
import Cursor from "./domain/Cursor";
import defaults from "set-default-value";
import Uuid from "./util/Uuid";
import { schedule } from "./Runloop";
import Internals from "./domain/Internals";
import Message from "./Message";
import type { Diffs } from "./domain/Cursor";
import Trace from "./telemetry/Trace";
import PendingAction from "./domain/PendingAction";

export default class Runtime extends Duplex {
    id:               string;                  // eslint-disable-line
    buffers:          Array<Message>;          // eslint-disable-line
    cursor:           ?Cursor;                 // eslint-disable-line
    locked:           boolean;                 // eslint-disable-line
    __Cursor:         Class<Cursor>;           // eslint-disable-line
    isReady:          boolean;                 // eslint-disable-line
    readyPromise:     Promise<Runtime>;        // eslint-disable-line
    description:      Map<string, Action>;     // eslint-disable-line
    Props:            Class<*>;                // eslint-disable-line
    set:              (string, any) => Cursor; // eslint-disable-line
    messageReceived:  Message => Cursor;       // eslint-disable-line
    messageProcessed: () => Cursor;            // eslint-disable-line
    get:              string => any            // eslint-disable-line
    handle:           any => Cursor;           // eslint-disable-line

    static SetAction = curry(function(key, value) {
        return this.set(key, value);
    });

    static is(x: *): boolean {
        return x instanceof Runtime;
    }

    static ValueFilter(x: *): boolean {
        return (
            !Runtime.is(x) &&
            !(x instanceof DeclaredTrigger)
        );
    }

    static StateFilter(_: *, key: string): boolean {
        return (
            key !== "description" &&
            key !== "id" &&
            key !== "history" &&
            key !== "diffs" &&
            key !== "action" &&
            key !== "diffs" &&
            key !== "history" &&
            key !== "traces" &&
            key !== "id" &&
            key !== "current"
        );
    }

    static ActionFilter(x: string): boolean {
        return (
            x.indexOf("_") === -1 &&
            x !== "constructor" &&
            x !== "done" &&
            x !== "error" &&
            x !== "cancel" &&
            x !== "progress" &&
            x !== "before" &&
            x !== "trigger" &&
            x !== "ready" &&
            x !== "state" &&
            x !== "cursor" &&
            x !== "readyPromise" &&
            x !== "buffers" &&
            x !== "actions" &&
            x !== "traces" &&
            x !== "trace" &&
            x !== "onError" &&
            x !== "shouldThrow" &&
            x !== "toJS"
        );
    }

    static update(instance: Runtime, cursor: Cursor): Runtime {
        instance.cursor = cursor;
        instance.locked = false;

        return instance;
    }

    static diff(instance: Runtime, updated: Cursor): Promise<{ cursor: Cursor, diffs: Diffs}> {
        return new Promise((resolve, reject) => {
            try {
                const previous = !(instance.cursor instanceof Cursor) ? updated.__data.constructor() : instance.cursor.__data;
                const cursor   = updated.update("_unit", x => x
                    .update("revision", y => y + 1)
                    .update("history", y => y.push(previous))
                );

                const diffs = diff(previous, cursor.__data);

                return resolve({
                    cursor: cursor,
                    diffs
                });
            } catch(e) {
                return reject(e);
            }
        });
    }

    static onResult(cursor: Cursor, result: (Promise<Cursor> | Error | Cursor | void)): Promise<Cursor> { // eslint-disable-line
        if(result instanceof Error)   return cursor.update("_unit", internals => internals.error(result));
        if(result instanceof Promise) return result
            .then(Runtime.onResult.bind(null, cursor))
            .catch(Runtime.onResult.bind(null, cursor));

        return Promise.resolve(result instanceof Cursor ? result : cursor);
    }

    static allActions(x: Object, carry: Map<string, DeclaredAction> = Map()): Map<string, DeclaredAction> {
        const proto = Object.getPrototypeOf(x);

        if(proto === Duplex.prototype) return carry;

        const keys    = Object.getOwnPropertyNames(proto);
        const actions = List(keys)
            .filter(y => proto[y] instanceof Function)
            .filter(Runtime.ActionFilter)
            .reduce((dest, key) => dest.set(key, x[key]), Map());

        return Runtime.allActions(proto, actions.merge(carry));
    }

    static allTriggers(x: Object, carry: Map<string, DeclaredTrigger> = Map()): Map<string, DeclaredTrigger> {
        const proto = Object.getPrototypeOf(x);

        if(proto === Duplex.prototype) return carry;

        const triggers = Map(proto.constructor.triggers || {})
            .map((y, key) => y.setName(key));

        return Runtime.allTriggers(proto, triggers.mergeWith((prev, next) => prev.merge(next), carry));
    }

    static declToImpTriggers(triggers: Object): List<Trigger> {
        return Map(triggers)
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new Trigger(key, y))), List())
            .groupBy(x => `${x.action}-${x.emits}`)
            .map(x => x.shift().reduce((dest, y) => dest.merge(y), x.first()))
            .toList();
    }

    static toUnit(instance: Object, proto: Object): Object {
        if(Object.hasOwnProperty(proto, "__Unit")) return instance;

        const triggers = Runtime.declToImpTriggers(Runtime.allTriggers(instance));
        const name     = instance.constructor.name;

        const actions0 = Runtime
            .allActions(instance)
            .map((x, key) => {
                const op = (instance: Object)[key];

                // fieser hack, hier muss der konstruktor von
                // action angepasst werden
                if(key === "handle") {
                    op.__Action = true;

                    return new Action(name, key, triggers, op);
                }

                return op && op.__Action ? op.__Action : new Action(name, key, triggers, op);
            });

        const actions = actions0
            .concat(triggers
                .filter(x => !actions0.find(y => y.name === x.emits))
                .reduce((dest, x) => dest.set(x.emits, new Action(name, x.emits, triggers)), Map()));

        proto.__triggers = triggers;
        proto.__actions  = actions;
        proto.__Cursor   = Cursor.for(instance, actions);

        Object.assign(proto, actions.map(action => action.func).toJS());

        Object.defineProperty(proto, "__Unit", {
            writeable:    false,
            enumerable:   false,
            configurable: false,
            value:        Uuid.uuid()
        });

        return instance;
    }

    static triggers = {
        init: DeclaredAction.triggered
            .by("message.before")
            .if((_, unit) => (
                unit.message.isAction() &&
                unit.message.resource.indexOf("/actions/init") === 0
            ))
    };

    constructor(bindings?: ?Object) { // eslint-disable-line
        if(bindings instanceof Runtime) return bindings;

        super({
            objectMode: true
        });

        const id           = Uuid.uuid();
        const proto        = Object.getPrototypeOf(this);
        const unit         = Runtime.toUnit(this, proto, bindings);
        const properties   = fromJS(proto.constructor.props || {});
        const deps         = properties.filter(Runtime.is);
        const initialProps = properties
            .merge(fromJS(bindings))
            .filter(Runtime.ValueFilter)
            // TODO: use deps
            .merge(deps.map(() => null))
            .set("_unit", new Internals({
                description: unit.__actions,
                id:          id,
                name:        this.constructor.name
            }));

        this.id           = id;
        this.Props        = properties.constructor;
        this.description  = unit.__actions;
        this.buffers      = [];
        this.cursor       = null;
        this.locked       = false;
        this.isReady      = false;

        this.readyPromise = unit
            .trigger(new Message("/actions/init", List.of(initialProps)));

        this.ready()
            .then(() => {
                this.isReady = true;
            });

        return unit;
    }

    ready(): Promise<Runtime> {
        return this.readyPromise;
    }

    state(): ?Object {
        if(!(this.cursor instanceof Cursor)) return null;

        return this.cursor.update("_unit", x => x.toMap().filter(Runtime.StateFilter)).toJS();
    }

    actions(): Map<string, Object> {
        return this.description.map(x => x.toJS()).toJS();
    }

    traces(): List<Trace> {
        return !(this.cursor instanceof Cursor) ? List() : this.cursor
            .get("_unit")
            .get("traces");
    }

    trigger(data: Object): Promise<Runtime> {
        if(this.locked || (!this.isReady && data.resource !== "/actions/init")) return schedule(() => this.trigger(data));

        this.locked = true;

        const message = new Message(data);
        const cursor  = defaults(this.cursor).to(new this.__Cursor(message.payload.first(), this));

        const before = new Promise(resolve => {
            try {
                return resolve(this.before.call(cursor, message.setCursor(cursor)));
            } catch(e) {
                return resolve(e);
            }
        });

        return before
            // adde hier ne before zeit zum trace
            // hier wird iwie messag noch nit richtig gesetzt,
            // wg mismatch resource <-> action beim einstieg
            .then(x => this.message.call(x, x.currentMessage))
            // adde hier ne handle zeit zum trace
            .then(x => Runtime.diff(this, x))
            // adde hier ne diff zeit zum trace
            .then(update => !update.cursor.hasErrored ? this.done.call(update.cursor, update.diffs) : this.error.call(update.cursor))
            // adde hier ne diff zeit zum trace
            .then(x => {
                if(x.isRecoverable) return Runtime.update(this, x);

                this.emit("error", x.currentError);

                return this;
            });
    }

    init(): Cursor {
        if(this instanceof Cursor) return this;

        assert(false, "Every unit needs to implement an 'init' action");

        return new Cursor({});
    }

    handle(): Promise<Cursor> { // eslint-disable-line
        if(!(this instanceof Cursor))                      return Promise.reject(new Error("fucking cursor"));
        if(!(this.message instanceof Message))             return Promise.reject(new Error("fucking cursor"));
        if(!(this.currentAction instanceof PendingAction)) return Promise.reject(new Error("fucking cursor"));

        try {
            const cursor  = this.triggers();
            const delay   = cursor.currentAction.delay;
            const op      = cursor.currentAction.op;
            const payload = cursor.message.payload;

            if(!op) return cursor.defer(() => cursor, delay);

            const result = cursor.defer(op.bind(cursor, ...payload.toJS()), delay);

            return Runtime.onResult(cursor, result);
        } catch(e) {
            return Promise.resolve(this.update("_unit", internals => internals.error(e)));
        }
    }

    message(...args: Array<*>): Cursor {
        // assert(false, "Every unit needs to implement a 'message' action");

        if(this instanceof Cursor) return this;

        console.log(args);
        return new Cursor({});
    }

    before(message: Message): Cursor {
        if(!(this.get("_unit") instanceof Object)) return this.messageReceived(message);

        return this
            .messageReceived(message);
            // hier muss als trigger message rein
            // .before(this.get("_unit").description.get("message"), message);
    }

    done(diffs: Diffs): Cursor { // eslint-disable-line
        return this.messageProcessed();
    }

    error(): Cursor {
        return this.messageProcessed();
    }

    // muss man sehn, ob das nötig is,
    // glaube eher nich, vlt bei io?
    progress(): void {
        assert(false, "Every unit needs to implement a 'progress' action");
    }

    // vlt eher revert?
    cancel(): void {
        assert(false, "Every unit needs to implement a 'cancel' action");
    }

    _write(message: *, enc: string, cb: Function) {
        this.trigger(message)
            .then(() => cb())
            .catch(e => this.emit("error", e));

        return true;
    }

    _read() { // eslint-disable-line
        if(this.buffers.length === 0) return schedule(() => this._read());

        this.push(this.buffers.shift());
    }

    toJS() {
        return this.description.toJS();
    }
}
