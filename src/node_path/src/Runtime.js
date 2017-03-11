import { Duplex } from "stream";
import assert from "assert";
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
            x !== "cancel" &&
            x !== "progress" &&
            x !== "receive" &&
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

    static onResult(cursor: Cursor, result: (Promise<Cursor> | Error | Cursor | void)): Promise<Cursor> { // eslint-disable-line
        if(result instanceof Error)   return cursor.action.state.error(result);
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
            .map((x, key) => { // eslint-disable-line
                const op = (instance: Object)[key];

                return op && op.__Action ? op.__Action.setUnit(name) : new Action(name, key, triggers, op);
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
            .if((...args) => {
                const unit = args[args.length - 1];

                return (
                    unit.message.isAction() &&
                    unit.message.resource.indexOf("/actions/init") === 0
                );
            })
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

    // zu gettern
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
        return !(this.cursor instanceof Cursor) ? List() : this.cursor.debug.traces;
    }
    //

    trigger(data: Object): Promise<Runtime> {
        if(this.locked || (!this.isReady && data.resource !== "/actions/init")) return schedule(() => this.trigger(data));

        this.locked = true;

        const message = new Message(data);
        const cursor  = defaults(this.cursor).to(new this.__Cursor(message.payload.first(), this));

        return this.receive.call(cursor, message.setCursor(cursor))
            .then(x => this.message.call(x, x.currentMessage))
            .then(x => {
                if(!x.action.state.isRecoverable) return this.emit("error", x.action.state.currentError);

                return x;
            })
            .then(x => x.send.diff(cursor))
            .then(x => x.send.finish())
            .then(x => {
                this.cursor = x;
                this.locked = false;

                return this;
            });
    }

    // checken, ob die überhaupt aufgerufen wird
    init(): Cursor {
        if(this instanceof Cursor) return this;

        assert(false, "Every unit needs to implement an 'init' action");

        return new Cursor({});
    }

    diff(message: Message) {
        try {
            const previous = message.payload.first();
            const cursor   = this.update("_unit", x => x
                .update("revision", y => y + 1)
                .update("history", y => y.push(previous)))
                .set("diffs", this.diff(previous));

            return Promise.resolve(cursor);
        } catch(e) {
            return Promise.reject(e);
        }
    }

    handle(): Promise<Cursor> { // eslint-disable-line
        if(!(this instanceof Cursor))               return Promise.reject(new Error("fucking cursor"));
        if(!(this.message instanceof Message))      return Promise.reject(new Error("fucking cursor"));
        if(!(this.action instanceof PendingAction)) return Promise.reject(new Error("fucking cursor"));

        try {
            const cursor  = this.action.triggered();
            const op      = cursor.action.op;
            const payload = cursor.message.payload;

            if(!op) return Promise.resolve(cursor);

            const result = op.call(cursor, ...payload.toJS());

            return Runtime.onResult(cursor, result);
        } catch(e) {
            return Promise.resolve(this.action.state.error(e));
        }
    }

    before(data): Promise<Cursor> {
        const description = data.payload.first();
        const message     = data.payload.get(1).setCursor(this);
        const updated     = this.action.before(description, message);

        const trigger = !(updated.action instanceof PendingAction) || updated.action.description.name === "message" ? undefined : updated.action.previous.state.type; // eslint-disable-line
        const name    = updated.action.description.name;
        const payload = updated.message.payload;
        const guards  = updated.action.guard.count;

        return Promise.resolve(updated.debug.trace(name, payload, trigger, guards));
    }

    message(): Promise<Cursor> {
        if(!(this instanceof Cursor)) return Promise.reject(new Error("fucking Cursor"));

        return Promise.resolve(this);
    }

    triggers(): Promise<Cursor> {
        const action  = this.action;
        const message = this.message;

        if(!(action instanceof PendingAction)) return Promise.reject(new Error("fucking cursor"));
        if(!(message instanceof Message))      return Promise.reject(new Error("fucking cursor"));

        return Promise
            .all((action.description: Object)[action.state.type]
                .map(x => (this.send: Object)[x.emits](...message.originalPayload.toJS())))
            .then(x => this.patch(...x));
    }

    receive(message: Message): Promise<Cursor> {
        if(!(this.get("_unit") instanceof Object)) return Promise.reject(new Error("unit not present"));

        return Promise.resolve(this._unit.messageReceived(message));
    }

    after(): Promise<Cursor> {
        const hasRecentlyErrored = this.action.hasRecentlyErrored;
        const error              = hasRecentlyErrored ? this.action.state.currentError : null;

        return (hasRecentlyErrored ? this.send.error() : this.send.done())
            .then(cursor => cursor.send.triggers())
            .then(cursor => error ? cursor.debug.trace.errored(error) : cursor.debug.trace.ended())
            .then(cursor => cursor.action.finished());
    }

    guards(): Promise<Cursor> {
        if(!(this instanceof Cursor))               return Promise.reject(new Error("fucking cursor"));
        if(!(this.action instanceof PendingAction)) return Promise.reject(new Error("fucking cursor"));

        const cursor = this.action.guards();

        return Promise.resolve(cursor.action.triggers ? cursor.debug.trace.triggered() : cursor.debug.trace.ended());
    }

    done() {
        return Promise.resolve(this.action.done());
    }

    error() {
        return Promise.resolve(this.action.errored());
    }

    finish(): Promise<Cursor> {
        return Promise.resolve(this._unit.messageProcessed());
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
