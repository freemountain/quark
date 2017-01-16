import { Duplex } from "stream";
import assert from "assert";
import diff from "immutablediff";
import Immutable from "immutable";
// import Trigger from "./domain/Trigger";
// import uuid from "uuid";
// import Cursor from "./domain/Cursor";
// import Action from "./domain/Action";
import curry from "lodash.curry";

export default class Runtime extends Duplex {
    static SetAction = curry(function(key, value) {
        return this.set(key, value);
    });

    static ActionFilter(x) {
        return (
            x !== "constructor" &&
            x !== "done" &&
            x !== "error" &&
            x !== "cancel" &&
            x !== "progress" &&
            x !== "before" &&
            x !== "trigger"
        );
    }

    static update() {
        const cursor = this.cursor
            .update("_unit", x => x
                .update("revision", y => y + 1)
                .update("history", y => y.push(this.cursor))
            );

        const diffs = diff(this.cursor, cursor);

        this.cursor = cursor;

        return diffs;
    }

    static allActions(x, carry = Immutable.Map()) {
        const proto = Object.getPrototypeOf(x);

        if(proto === Duplex.prototype) return carry;

        const keys    = Object.getOwnPropertyNames(proto);
        const actions = Immutable.List(keys)
            .filter(Runtime.ActionFilter)
            .reduce((dest, key) => dest.set(key, x[key]), Immutable.Map());

        return Runtime.allActions(proto, actions.merge(carry));
    }

    static toUnit(instance, bindings) {
        const proto = Object.getPrototypeOf(instance);

        if(proto.__Unit) return instance;

        // update prototype, and thus instance
        //
        console.log(bindings);

        return instance;
    }

    constructor(bindings) { // eslint-disable-line
        if(bindings instanceof Runtime) return bindings;

        super({
            objectMode: true
        });

        const proto = Object.getPrototypeOf(this);

        const {
            triggers
        } = proto.constructor;

        const unit    = Runtime.toUnit(this, bindings);
        const actions = triggers;

        this.actions = actions;
        this.buffers = [];


        return unit;

    /* const proto = Object.getPrototypeOf(this);

        const {
            props,
            triggers
        } = proto.constructor;

        const properties   = Immutable.fromJS(props);
        const description  = Immutable.fromJS(additions);
        const deps         = properties.filter(Runtime.DependencyFilter);
        const initialProps = properties
            .mergeDeep(description)
            .filter(Runtime.OnlyValueFilter)
            .merge(deps.filter(Runtime.UnitFilter).map(() => null));

        const dependencies = deps
            .merge(deps.filter(Runtime.UnitFilter).map(x => x.parentDependencies));

        console.log(dependencies, triggers);
        // TODO: hier müssen keys die existieren mit den triggers gemerged werden
        /* const actions = Immutable.fromJS(proto)
            .map((operation, name) => new Action({ name, operation }))
            .merge(properties
                .filter(Runtime.OnlyValueFilter)
                .map((_, name) => new Action({ name, operation: Runtime.SetAction(name) })))
            .merge(properties
                .filter(Runtime.OnlyUnitFilter)
                .map((_, name) => new Action({ name, operation: Runtime.SetAction(name) })))
            .merge(triggers
                .map((x, name) => x.setName(name))
                .map((x, name) => this[name] instanceof Function ? x.setOperation(this[name]) : x));

            Object.assign(this, actions.map(action => action.getFunction()).toJS());*/

        /* const computed = dependencies
            .merge(description)
            .filter(Runtime.PropertyFilter)
            .map(Runtime.PropertyMapper);

        const propsTrigger = new Trigger(initialProps
            .keySeq()
            .toJS()
            .concat(Object.getOwnPropertyNames(proto))
            .filter(x => x !== "constructor")
            .map(x => `${x}.done`));

        const childrenTrigger = new Trigger(Immutable.List.of("props.done", "children"));
        const childTriggers   = deps
            .filter(Runtime.UnitFilter)
            .map(x => new Trigger(x.parentDependencies
                .reduce((dest, y) => dest.concat(y.getDependencies()), Immutable.List())
            ));

        const allTriggers = Immutable.Map(triggers)
            .map((x, key) => x.addAction(key))
            .merge(computed)
            .merge(childTriggers)
            .set("props", propsTrigger.addAction("props"))
            .set("children", childrenTrigger);

        const unit = Immutable.Map({
            revision: 0,
            id:       uuid(),
            action:   null,
            name:     this.constructor.name
        });

        deps
            .filter(Runtime.UnitFilter)
            .forEach((x, key) => x.on("data", this.receiveFromChild.bind(this, key)));

        this.deps               = deps;
        this.buffers            = [];
        this.parentDependencies = description.filter(Runtime.DependencyFilter);
        this.cursor             = Cursor.of(Immutable.Map({
            _unit:  unit,
            errors: Immutable.List()
        }));

        Object.assign(this, this.cursor._unit.dependencies
            .filter(Runtime.PropertyFilter)
            .map((prop, key) => Runtime.PropertyAction(key, prop))
            .toJS());

        this.write({
            type:    "props",
            payload: initialProps.filter(x => x !== null)
        });*/
    }

    trigger(action) {
        return this.message.apply(this.cursor, action)
            .then(cursor => Runtime.update(this, cursor))
            .catch(error => Runtime.update(this, this.cursor.update("_unit", x => x.update("errors", y => y.push(error)))));
    }

    message() {
        assert(false, "Every unit needs to implement a 'message' action");
    }

    before() {
        assert(false, "Every unit needs to implement an 'before' action");
    }

    progress() {
        assert(false, "Every unit needs to implement a 'progress' action");
    }

    cancel() {
        assert(false, "Every unit needs to implement a 'cancel' action");
    }

    done() {
        assert(false, "Every unit needs to implement a 'done' action");
    }

    error() {
        assert(false, "Every unit needs to implement an 'error' action");
    }
}
