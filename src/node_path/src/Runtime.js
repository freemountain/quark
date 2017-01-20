import { Duplex } from "stream";
import assert from "assert";
import diff from "immutablediff";
import Immutable from "immutable";
// import Trigger from "./domain/Trigger";
// import uuid from "uuid";
// import Cursor from "./domain/Cursor";
import curry from "lodash.curry";
import TriggerDescription from "./domain/TriggerDescription";
import ActionDescription from "./domain/ActionDescription";
import Action from "./domain/Action";
import Trigger from "./domain/Trigger";
import Cursor from "./domain/Cursor";
import defaults from "set-default-value";
import uuid from "uuid";
import { schedule } from "./Runloop";
import Internals from "./domain/Internals";
import Message from "./Message";

export default class Runtime extends Duplex {
    static SetAction = curry(function(key, value) {
        return this.set(key, value);
    });

    static is(x) {
        return x instanceof Runtime;
    }

    static ValueFilter(x) {
        return (
            !Runtime.is(x) &&
            !(x instanceof Trigger)
        );
    }

    static StateFilter(_, key) {
        return (
            key !== "description" &&
            key !== "id" &&
            key !== "history" &&
            key !== "diffs" &&
            key !== "actions"
        );
    }

    static ActionFilter(x) {
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
            x !== "shouldThrow"
        );
    }

    static update(instance, cursor) {
        instance.cursor = cursor;

        return cursor.get("_unit", "diffs");
    }

    static diff(instance, updated) {
        return new Promise((resolve, reject) => {
            try {
                if(!(updated instanceof Cursor)) return assert(false, `Every action needs to return a cursor, but got ${updated}`);

                const previous = instance.cursor === null ? updated.__data.constructor() : instance.cursor.__data;
                const cursor   = updated.update("_unit", x => x
                    .update("revision", y => y + 1)
                    .update("history", y => y.push(previous))
                );

                const diffs = diff(previous, cursor.__data);

                return resolve({
                    cursor: Cursor.of(cursor),
                    diffs
                });
            } catch(e) {
                return reject(e);
            }
        });
    }

    static allActions(x, carry = Immutable.Map()) {
        const proto = Object.getPrototypeOf(x);

        if(proto === Duplex.prototype) return carry;

        const keys    = Object.getOwnPropertyNames(proto);
        const actions = Immutable.List(keys)
            .filter(y => proto[y] instanceof Function)
            .filter(Runtime.ActionFilter)
            .reduce((dest, key) => dest.set(key, x[key]), Immutable.Map());

        return Runtime.allActions(proto, actions.merge(carry));
    }

    static allTriggers(x, carry = Immutable.Map()) {
        const proto = Object.getPrototypeOf(x);

        if(proto === Duplex.prototype) return carry;

        const triggers = Immutable.Map(proto.constructor.triggers)
            .map((y, key) => y.setName(key));

        return Runtime.allTriggers(proto, triggers.mergeWith((prev, next) => prev.merge(next), carry));
    }

    static declToImpTriggers(triggers) {
        return Immutable.Map(triggers)
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new TriggerDescription(key, y))), Immutable.List());
    }

    static toUnit(instance, proto) {
        if(proto.__Unit) return instance;

        const triggers = Runtime.declToImpTriggers(Runtime.allTriggers(instance));
        const name     = instance.constructor.name;

        const actions = Runtime
            .allActions(instance)
            .map((x, key) => new ActionDescription(name, key, triggers, instance[key] === Runtime.prototype.message ? null : instance[key]));

        proto.__actions = actions;
        proto.__Unit    = uuid();
        proto.__Cursor  = Cursor.for(instance, actions);

        Object.assign(proto, actions.map(action => action.func).toJS());

        return instance;
    }

    static triggers = {
        init: Action.triggered
            .by("message")
            .if((_, unit) => (
                unit.currentMessage.isAction() &&
                unit.currentMessage.resource.indexOf("/actions/init") === 0
            ))
    };

    constructor(bindings) { // eslint-disable-line
        if(bindings instanceof Runtime) return bindings;

        super({
            objectMode: true
        });

        const id           = uuid();
        const proto        = Object.getPrototypeOf(this);
        const unit         = Runtime.toUnit(this, proto, bindings);
        const properties   = Immutable.fromJS(defaults(proto.constructor.props).to({}));
        const deps         = properties.filter(Runtime.is);
        const initialProps = properties
            .merge(Immutable.fromJS(bindings))
            .filter(Runtime.ValueFilter)
            .merge(deps.map(() => null))
            .set("_unit", new Internals({
                description: proto.__actions,
                id:          id,
                name:        this.constructor.name
            }));

        this.id           = id;
        this.Props        = properties.constructor;
        this.description  = proto.__actions;
        this.buffers      = [];
        this.cursor       = null;
        this.readyPromise = unit.trigger(new Message("/actions/init", [initialProps]));

        return unit;
    }

    ready() {
        return this.readyPromise;
    }

    state() {
        if(this.cursor === null) return this.cursor;

        return this.cursor.update("_unit", x => x.filter(Runtime.StateFilter)).toJS();
    }

    actions() {
        return this.description.map(x => x.toJS()).toJS();
    }

    traces() {
        return this.cursor === null ? Immutable.List() : this.cursor
            .get("_unit")
            .get("traces");
    }

    trace() {
        return this.traces().last();
    }

    onError(state, e) {
        return e.isRecoverable && e.isRecoverable() ? this.error.call(state, e) : this.emit("error", e);
    }

    trigger(data) {
        const message = new Message(data);
        const cursor  = defaults(this.cursor).to(new this.__Cursor(message.payload.first(), this));

        const before = new Promise((resolve, reject) => {
            try {
                return resolve(this.before.call(cursor, message));
            } catch(e) {
                return reject(e);
            }
        });

        return before
            // adde hier ne before zeit zum trace
            .then(x => this.message.call(x, x.currentMessage).catch(this.onError.bind(this, x)))
            // adde hier ne handle zeit zum trace
            .then(x => Runtime.diff(this, Cursor.of(x)))
            // adde hier ne diff zeit zum trace
            .then(update => this.done.call(update.cursor, update.diffs))
            // adde hier ne diff zeit zum trace
            .then(x => Runtime.update(this, x));
            // adde hier ne update zeit zum trace
    }

    init(action) { // eslint-disable-line
        return this;
    }

    message() {
        assert(false, "Every unit needs to implement a 'message' action");
    }

    before(action) {
        return this
            .update("_unit", internals => internals.messageReceived(action));
    }

    // muss man sehn, ob das nötig is
    progress() {
        assert(false, "Every unit needs to implement a 'progress' action");
    }

    // vlt eher revert?
    cancel() {
        assert(false, "Every unit needs to implement a 'cancel' action");
    }

    done(diffs) { // eslint-disable-line
        return this.update("_unit", internals => internals.messageProcessed());
    }

    error(error) {
        return this.update("_unit", x => x.update("errors", y => y.push(error)));
    }

    _write(message, enc, cb) {
        this.ready()
            .then(() => this.trigger(message))
            .then(() => cb())
            .catch(e => this.emit("error", e));
    }

    _read() { // eslint-disable-line
        if(this.buffers.length === 0) return schedule(() => this._read());

        this.push(this.buffers.shift());
    }
}
