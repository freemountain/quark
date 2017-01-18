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
import NonRecoverableError from "./error/NonRecoverableError";
import defaults from "set-default-value";
import uuid from "uuid";
import { schedule } from "./Runloop";

export default class Runtime extends Duplex {
    static UnitFilter  = x => x instanceof Runtime; // eslint-disable-line
    static ValueFilter = x => (
        !Runtime.UnitFilter(x) &&
        !(x instanceof Trigger)
    );

    static SetAction = curry(function(key, value) {
        return this.set(key, value);
    });

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

        const actions = Runtime
            .allActions(instance)
            .map((x, key) => new ActionDescription(key, triggers, instance[key] === Runtime.prototype.message ? null : instance[key]));

        proto.__actions = actions;
        proto.__Unit    = uuid();

        Object.assign(proto, actions.map(action => action.func).toJS());

        return instance;
    }

    static triggers = {
        init: Action.triggered
            .by("message")
            .if(x => {
                console.log("Runtime.triggers ", Object.getPrototypeOf(x));
                return x.triggers("action");
            })
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
        const deps         = properties.filter(Runtime.UnitFilter);
        const initialProps = properties
            .merge(Immutable.fromJS(bindings))
            .filter(Runtime.ValueFilter)
            .merge(deps.map(() => null))
            .set("_unit", Immutable.fromJS({
                description: proto.__actions,
                id:          id,
                revision:    0,
                history:     [],
                errors:      [],
                diffs:       [],
                actions:     []
            }));

        this.id           = id;
        this.description  = proto.__actions;
        this.buffers      = [];
        this.cursor       = null;
        this.readyPromise = unit.trigger({
            type:    "init",
            payload: initialProps
        });

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
            .get("actions");
    }

    trace() {
        return this.traces().last();
    }

    shouldThrow(e) {
        return (
            e instanceof TypeError ||
            e instanceof NonRecoverableError
        );
    }

    onError(state, e) {
        return this.shouldThrow(e) ? this.emit("error", e) : this.error.call(state, e);
    }

    trigger(data) {
        const action = Immutable.fromJS(data);
        const cursor = defaults(this.cursor).to(Cursor.of(action.get("payload"), this))
            .update("_unit", unit => unit.update("actions", actions => actions.push(Immutable.List())));

        const before = new Promise((resolve, reject) => {
            try {
                return resolve(this.before.call(cursor, data));
            } catch(e) {
                return reject(e);
            }
        });

        return before
            .then(x => this.message.call(x, x.get("_unit").get("action")).catch(this.onError.bind(this, x)))
            .then(x => Runtime.diff(this, Cursor.of(x)))
            .then(update => this.done.call(update.cursor, update.diffs))
            .then(x => Runtime.update(this, x));
    }

    init(action) {
        console.log("#####", "init");
        return action.get("payload");
    }

    message() {
        assert(false, "Every unit needs to implement a 'message' action");
    }

    before(action) {
        return this.update("_unit", x => x.set("action", Immutable.fromJS(action)));
    }

    // muss man sehn, ob das nötig is
    progress() {
        assert(false, "Every unit needs to implement a 'progress' action");
    }

    // vlt eher revert?
    cancel() {
        assert(false, "Every unit needs to implement a 'cancel' action");
    }

    done(diffs) {
        return this.update("_unit", x => x.set("diffs", diffs).delete("action"));
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
