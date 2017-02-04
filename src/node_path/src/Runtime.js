import { Duplex } from "stream";
import assert from "assert";
import diff from "immutablediff";
import Immutable from "immutable";
// import Trigger from "./domain/Trigger";
// import uuid from "uuid";
// import Cursor from "./domain/Cursor";
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
            !(x instanceof DeclaredTrigger)
        );
    }

    static StateFilter(_, key) {
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
                    cursor: cursor,
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
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new Trigger(key, y))), Immutable.List())
            .groupBy(x => `${x.action}-${x.emits}`)
            .map(x => x.shift().reduce((dest, y) => dest.merge(y), x.first()))
            .toList();
    }

    static toUnit(instance, proto) {
        if(Object.hasOwnProperty(proto, "__Unit")) return instance;

        const triggers = Runtime.declToImpTriggers(Runtime.allTriggers(instance));
        const name     = instance.constructor.name;

        const actions0 = Runtime
            .allActions(instance)
            .map((x, key) => instance[key] && instance[key].__Action ? instance[key].__Action : new Action(name, key, triggers, instance[key] === Runtime.prototype.message ? null : instance[key]));

        const actions = actions0
            .concat(triggers
                .filter(x => !actions0.find(y => y.name === x.emits))
                .reduce((dest, x) => dest.set(x.emits, new Action(name, x.emits, triggers)), Immutable.Map()));

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

        const id           = Uuid.uuid();
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

        initialProps.bllalal = "test";

        /* this.readyPromise = unit
         .trigger(new Message("/actions/init", [initialProps]));*/

        return unit;
    }

    ready() {
        return this.readyPromise;
    }

    state() {
        if(this.cursor === null) return this.cursor;

        return this.cursor.update("_unit", x => x.toMap().filter(Runtime.StateFilter)).toJS();
    }

    actions() {
        return this.description.map(x => x.toJS()).toJS();
    }

    traces() {
        return this.cursor === null ? Immutable.List() : this.cursor
            .get("_unit")
            .get("traces");
    }

    trigger(data) {
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
            .then(x => this.message.call(x, x.currentMessage))
            // adde hier ne handle zeit zum trace
            .then(x => Runtime.diff(this, x))
            // adde hier ne diff zeit zum trace
            .then(update => !update.cursor.hasErrored ? this.done.call(update.cursor, update.diffs) : this.error.call(update.cursor))
            // adde hier ne diff zeit zum trace
            .then(x => Runtime.update(this, x));
    }

    init(action) { // eslint-disable-line
        return this;
    }

    message() {
        assert(false, "Every unit needs to implement a 'message' action");
    }

    before(message) {
        return this.messageReceived(message);
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
        return this.messageProcessed();
    }

    error() {
        if(!this.isRecoverable) throw this.currentError;

        return this.messageProcessed();
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
