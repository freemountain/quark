import Immutable from "immutable";
import Property from "./domain/Property";
import Trigger from "./domain/Trigger";
import isUndefined from "lodash.isUndefined";
import assert from "assert";
import Cursor from "./domain/Cursor";
import defaults from "set-default-value";
import patch from "immutablepatch";
import diff from "immutablediff";
import Q from "q";
import { schedule } from "./Runloop";
import uuid from "uuid";
import curry from "lodash.curry";
import { Duplex } from "stream";

/**
 * a Unit represents coherent set of logically
 * cohesive operations and the properties they
 * operate on. A quark app uses a domain to send
 * it actions to and retrieve the diffs of the global
 * state.
 * Its a recursive structure to enable the user to
 * build his app as granular as he wants to.
 *
 *                                             App
 *           /                                  |                                     \
 *     title: string   navigation: new Navigation({ loggedIn: has.currentUser)   currentUser: User?
 *                               /                          \
 *                         loggedIn: boolean         login: Action
 *
 * @author Marco Sliwa <marco@circle.ai>
 * @example
 * class Navigation extends Unit {
 *     static props = {
 *         loggedIn: false,
 *         current:  null
 *         items:    derive(x => x.loggedIn ? ["Menu", "Logout"] : ["Login"])
 *     }
 *
 *     menuChanged(item) {
 *          return this.set("current", item);
 *     }
 * }
 *
 * class Users extends Unit {
 *     static props = {
 *         id:      derive(x => x.users.size)
 *         users:   {},
 *         current: null
 *     }
 *
 *     add(user) {
 *         const id = this.id;
 *
 *         return this.users.set(id, user).update(id, x => x.set("id", id));
 *     }
 *
 *     login(id, password) {
 *          const user = this.users.get(id);
 *
 *          return this.set("current", user && user.password === password ? user : this.current);
 *     }
 *
 *     logout() {
 *         return this.unset("current");
 *     }
 * }
 *
 * class App extends Unit {
 *     static props = {
 *         title:      "My App",
 *         navigation: new Navigation({
 *             loggedIn: derive(x => x.has("users.current"))
 *         }),
 *         users: new Users()
 *     }
 * }
 *
 * const app = new App();
 *
 * console.log(app.toJS());
 * // prints {
 * //     title:      "My App",
 * //     navigation: {
 * //         loggedIn: false,
 * //         items:    ["Login"]
 * //     },
 * //     users: {
 * //         users:   [],
 * //         current: null
 * //     }
 * // }
 *
 * app.receive({
 *     type:    "users.add",
 *     payload: {
 *         name:     "skankhunt42",
 *         password: "suckmydick"
 *     }
 * }).then(() => app.receive({
 *     type:    "login",
 *     payload: [0, "suckmydick"]
 * }).then(x => console.log(app.toJS())).catch(console.error.bind(this));
 * // prints {
 * //     title:      "My App",
 * //     navigation: {
 * //         loggedIn: true,
 * //         items:    ["Menu", "Logout"]
 * //     },
 * //     users: {
 * //         users: [{
 * //             id:       0,
 * //             name:     "skankhunt42",
 * //             password: "suckmydick"
 * //         }],
 * //         current: {
 * //             id:       0,
 * //             name:     "skankhunt42",
 * //             password: "suckmydick"
 * //         }
 * //     }
 * // }
 */
class Unit extends Duplex {
    static PropertyFilter   = x => x instanceof Property;                        // eslint-disable-line
    static UnitFilter       = x => x instanceof Unit;                            // eslint-disable-line
    static DependencyFilter = x => Unit.PropertyFilter(x) || Unit.UnitFilter(x);
    static OnlyValueFilter  = x => (                                             // eslint-disable-line
        !(x instanceof Property) &&
        !(x instanceof Unit) &&
        !(x instanceof Trigger)
    );

    static PropertyAction(key, prop) {
        return this.set(key, prop.receive(this));
    }

    static UnitAction(key) {
        console.error("###unitaction", key);

        return this.set(key, "huhu");
    }

    static PropertyMapper(x, key) {
        const deps   = x.getDependencies();
        const mapped = deps.map(y => y.replace(Trigger.DONE, "").replace(".", ""));
        const guard  = (state, prev) => mapped.some(y => y === "props" ? state !== prev : state.get(x) !== prev.get(x));

        return new Trigger(deps.concat(key), [guard], [], [], key);
    }

    constructor(descr = {}) { // eslint-disable-line
        if(descr instanceof Unit) return descr;

        super({
            objectMode: true
        });

        const proto = Object.getPrototypeOf(this);
        const {
            props = {},
            triggers = {}
        } = proto.constructor;

        const properties   = Immutable.fromJS(props);
        const description  = Immutable.fromJS(descr);
        const deps         = properties.filter(Unit.DependencyFilter);
        const dependencies = deps
            .merge(deps.filter(Unit.UnitFilter).map(x => x.parentDependencies));

        const initialProps = properties
            .mergeDeep(description.filter(Unit.OnlyValueFilter))
            .filter(Unit.OnlyValueFilter)
            .merge(deps.filter(Unit.UnitFilter).map(() => Immutable.Map()));

        const computed = dependencies
            .merge(description)
            .filter(Unit.PropertyFilter)
            .map(Unit.PropertyMapper);

        const propsTrigger = new Trigger(initialProps
            .keySeq()
            .toJS()
            .concat(Object.getOwnPropertyNames(proto))
            .filter(x => x !== "constructor")
            .map(x => `${x}.done`));

        const childrenTrigger = new Trigger(Immutable.List.of("props.done", "children"));

        const childTriggers = deps
            .filter(Unit.UnitFilter)
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
            revision:     0,
            id:           uuid(),
            dependencies: dependencies,
            progress:     this.onProgress.bind(this),
            trigger:      this.trigger.bind(this),
            triggers:     allTriggers,
            children:     deps
                .filter(Unit.UnitFilter)
                .map(x => x.parentDependencies.filter(Unit.PropertyFilter).keySeq())
        });

        deps
            .filter(Unit.UnitFilter)
            .forEach((x, key) => x.on("data", this.receiveFromChild.bind(this, key)));

        this.deps               = deps;
        this.buffers            = [];
        this.parentDependencies = description.filter(Unit.DependencyFilter);
        this.cursor             = Cursor.of(Immutable.Map({
            _unit:  unit,
            errors: Immutable.List()
        }));

        Object.assign(this, this.cursor._unit.dependencies
            .filter(Unit.PropertyFilter)
            .map((prop, key) => Unit.PropertyAction(key, prop))
            .toJS());

        this.write({
            type:    "props",
            payload: initialProps.filter(x => x !== null)
        });

        return this;
    }

    toJS() {
        return this.state().toJS();
    }

    state() {
        const deps = this.cursor._unit.dependencies
            .filter(Unit.UnitFilter)
            .map(dep => dep.state());

        return this.cursor
            .filter((_, key) => key.indexOf("_") === -1)
            .merge(deps);
    }

    triggers() {
        return this.cursor._unit.triggers
            .map(x => x.triggers)
            .toJS();
    }

    dispatch(name, diffs) { // eslint-disable-line
        const triggers = this.cursor._unit.triggers;

        if(triggers.has(name)) return this[triggers.get(name).map(this.cursor, diffs, name)];

        const ops = triggers
            .filter(x => x.triggers.indexOf(name) !== -1)
            .keySeq()
            .map(key => this[key])
            .filter(op => op instanceof Function);

        if(ops.size > 1) return function(...args) {
            // hier stimmt iwas nich mit den ops
            return Q.all(ops.map(op => op.call(this, ...args)))
                .then(results => results.reduce((dest, result) => dest.concat(result), []));
        };

        return ops.isEmpty() ? this[name] : ops.first();
    }

    receiveFromChild(key, data) {
        const map = Immutable.Map();

        schedule(() => this.write({
            type:    `${key}.done`,
            payload: map.set(key, patch(Immutable.Map(), Immutable.fromJS(data)))
        }), 32);
    }

    trigger(...args) { // eslint-disable-line
        const diffs   = args.length > 1 ? args.pop() : args;
        const payload = diffs instanceof Immutable.Set && args.length > 1 ? args.pop() : diffs;

        return this.receive(args.concat(diffs instanceof Immutable.Set || typeof diffs !== "string" ? [] : diffs).map(action => ({ type: action, payload })), diffs instanceof Immutable.Set ? diffs : Immutable.Set());
    }

    props(properties) {
        const props = Immutable.fromJS(properties);

        return this.merge(props);
    }

    done({ type: action, diffs, previous }) {
        const payload  = patch(previous, Immutable.fromJS(diffs).toList());

        // hier brauchen wir einen circuitbreaker
        const actions  = this._unit.triggers
            .filter(x => x.shouldTrigger(previous, diffs, action))
            .keySeq()
            .toJS();

        return actions.length === 0 ? previous : this._unit
            .trigger(...actions, payload, diffs)
            .then(diffs2 => patch(previous, diffs2.toList()));
    }

    children() {
        return Q.all(this._unit.children
            .map((bindings, key) => this._unit.trigger(`${key}/props`, bindings.reduce((dest, x) => dest.set(x, this.get(x)), Immutable.Map())))
            .valueSeq()
            .toJS())
            .then(() => this);
    }

    onError(e) {
        return schedule(() => this.receive([{
            type:    "props",
            payload: Immutable.fromJS({
                errors: this.cursor.errors.push(e)
            })
        }]));
    }

    onProgress() {
        // hier wird <action>.progess getriggert
        assert(false, "implement");
    }

    onResult(data, previous, result) { // eslint-disable-line
        if(!result || typeof result.toJS !== "function") return assert(false, `\n\t### ${this.constructor.name}.${data.type}\n\tYour action '${data.type}' returned an unexpected result '${result}'${data.payload ? ` for '${data.payload}'` : ""}.\n\tPlease make sure to only return updated cursors of this unit.`);

        const cursor = Cursor.of(result.update("_unit", x => x.update("revision", y => y + 1)));
        const diffs  = previous.concat(diff(this.cursor, cursor));

        if(
            data.type === "props.done" &&
            this.cursor._unit.revision + 1 === cursor._unit.revision &&
            diffs.size < 2
        )                        return Q.resolve(Immutable.Set());
        if(data.type === "done") return Q.resolve(diffs);

        return schedule(() => this.trigger("done", {
            type:     `${data.type}.${Trigger.DONE}`,
            diffs:    diffs,
            previous: this.cursor
        }, diffs));
    }

    apply(data, diffs) {
        try {
            const { payload } = data;
            const args        = Array.isArray(payload) ? payload : [payload];
            const cursor      = Cursor.of(patch(this.cursor, diffs.toList()));
            const action      = defaults(this.dispatch(data.type, diffs)).to(() => this.cursor);
            const result      = action.apply(cursor, args);
            const handler     = this.onResult.bind(this, data, diffs);

            return !(result && typeof result.then === "function") ? handler(result) : result
                .then(handler)
                .catch(this.onError.bind(this));
        } catch(e) {
            return this.onError(e);
        }
    }

    applyOnChild(data, diffs) {
        return Q.all(this.deps.map((domain, key) => domain
            .receive([Object.assign(data, { type: this.trimAction(data.type, key) })], diffs)
            .then(x => {
                domain.cursor = Cursor.of(patch(domain.cursor, x.toList()));

                return x.map(y => y.get("path").indexOf("/errors") !== -1 ? y : y.update("path", path => `/${key}${path}`)); // eslint-disable-line
            })
        ).toList().toJS())
            .then(x => x.reduce((dest, diffs2) => dest.concat(diffs2), Immutable.List.of()))
            .then(x => {
                const isError = x.filter(y => y.get("path").indexOf("/errors") !== -1).size > 0;

                schedule(() => this.write({
                    type:    `${data.type}.${Trigger.DONE}`,
                    payload: {
                        type:     `${data.type}.${isError ? Trigger.ERROR : Trigger.DONE}`,
                        diffs:    diffs,
                        previous: this.cursor
                    }
                }));
                return x;
            });
    }

    trimAction(action, key) {
        if(action.indexOf("/") === -1) return action;

        return action.indexOf(key) === 0 ? action.split("/").slice(1).join() : action;
    }

    childHandles(action) {
        return (
            (
                action.indexOf("/") !== -1 &&
                Immutable.Map(this.deps)
                    .filter(Unit.UnitFilter)
                    .some((unit, key) => unit.handles(this.trimAction(action, key)))
            ) || (
                action.indexOf("children") === -1 &&
                action !== "props" &&
                action.indexOf("done") === -1 &&
                Immutable.Map(this.deps)
                    .filter(Unit.UnitFilter)
                    .some(unit => unit.handles(action))
            )
        );
    }

    handles(action, diffs = Immutable.Set()) {
        return !isUndefined(this.dispatch(action, diffs)) || this.childHandles(action);
    }

    handle(data, diffs) {
        assert(typeof data.type === "string", `${this.constructor.name}: Received invalied action '${data.type}'.`);

        // hier wird <action>.cancel verarbeitet
        if(this.childHandles(data.type))    return this.applyOnChild(data, diffs);
        if(!this.handles(data.type, diffs)) return Q.resolve(diffs);

        return this.apply(data, diffs);
    }

    receive(actions, diffs = Immutable.Set()) {
        return Q.all(actions.map(action => this.handle(action, diffs)))
            .then(results => results.reduce((dest, x) => dest.concat(x), Immutable.Set()))
            .then(results => results.filter(x => x.get("path") !== "/_unit/revision").size < 1 ? Immutable.Set() : results);
    }

    _write(data, enc, cb) {
        this.receive([data])
            .then(result => {
                if(result.size === 0) return cb();

                this.cursor = Cursor.of(patch(this.cursor, result.toList()));

                this.buffers.push(result.toJS());

                return cb();
            })
            .catch(cb);
    }

    _read() { // eslint-disable-line
        if(this.buffers.length === 0) return schedule(() => this._read(), 1);

        this.push(this.buffers.shift());
    }
}

Unit.PropertyAction = curry(Unit.PropertyAction, 3);
Unit.UnitAction     = curry(Unit.UnitAction, 3);

export default Unit;
