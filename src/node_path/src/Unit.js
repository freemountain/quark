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

        const {
            props = {},
            triggers = {}
        } = Object.getPrototypeOf(this).constructor;

        const properties   = Immutable.fromJS(props);
        const description  = Immutable.fromJS(descr);
        const dependencies = properties
            .filter(Unit.DependencyFilter)
            .map(x => Unit.UnitFilter(x) ? x.setParent(this) : x);

        const initialProps = properties
            .mergeDeep(description)
            .filter(Unit.OnlyValueFilter);

        const computed = dependencies
            .filter(Unit.PropertyFilter)
            .map(Unit.PropertyMapper);

        const propsTrigger = new Trigger(initialProps.keySeq().toJS());
        const allTriggers  = Immutable.Map(triggers)
            .map((x, key) => x.addAction(key))
            .merge(computed)
            .set("props", propsTrigger.addAction("props"));

        const unit = Immutable.Map({
            revision:     0,
            id:           uuid(),
            dependencies: dependencies,
            progress:     this.onProgress.bind(this),
            trigger:      this.trigger.bind(this),
            triggers:     allTriggers
        });

        this.buffers            = [];
        this.parentDependencies = description.filter(Unit.DependencyFilter);
        this.cursor             = Cursor.of(Immutable.Map({
            _unit: unit
        }));

        Object.assign(this, this.cursor._unit.dependencies
            .filter(Unit.PropertyFilter)
            .map((prop, key) => Unit.PropertyAction(key, prop)).toJS());

        this.trigger("props", initialProps.filter(x => x !== null))
            .then(diffs => this.buffers.push(diffs.toJS()))
            .catch(e => this.emit("error", e));

        return this;
    }

    setParent() {
        assert(false, "implement");
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

    dispatch(name) {
        const triggers = this.cursor._unit.triggers;

        if(triggers.has(name)) return this[triggers.get(name).map(this.cursor, this.previous, name)];

        const ops = triggers
            .filter(x => x.triggers.indexOf(name) !== -1)
            .keySeq()
            .map(key => this[key]);

        if(ops.size > 1) return function(...args) {
            return Q.all(ops.map(op => op.call(this, ...args))
                .then(results => results.reduce((dest, result) => dest.concat(result), [])));
        };

        return ops.isEmpty() ? this[name] : ops.first();
    }


    trigger(action, payload, diffs) {
        return this.receive({
            type:    action,
            payload: payload
        }, diffs);
    }

    props(properties) {
        return this.merge(properties);
    }

    // todo: raceconditions bei parallelem shit
    done({ type: action, diffs, previous }) {
        const payload  = patch(Immutable.Map(), Immutable.fromJS(diffs));
        const promises = this._unit.triggers
            .filter(x => x.shouldTrigger(this, previous, action))
            .keySeq()
            .map(name => this._unit.trigger(name, payload))
            .toJS();

        return Q.all(promises).then(() => this);
    }

    onError(data, e) {
        // hier wird <action>.error getriggert
        console.error(e);
        throw e;
    }

    onProgress() {
        // hier wird <action>.progess getriggert
        assert(false, "implement");
    }

    onResult(data, previous, result) { // eslint-disable-line
        if(!result || typeof result.toJS !== "function") return assert(false, `\n\t### ${this.constructor.name}.${data.type}\n\tYour action '${data.type}' returned an unexpected result '${result}'${data.payload ? ` for '${data.payload}'` : ""}.\n\tPlease make sure to only return updated cursors of this unit.`);

        this.previous = this.cursor;
        this.cursor   = Cursor.of(result.update("_unit", x => x.update("revision", y => y + 1)));

        // race conditions, wahrscheinlich bei done nich parallel
        console.error(data.type, "revision: ", this.previous._unit.revision, this.cursor._unit.revision);
        const diffs = previous.concat(diff(this.previous, this.cursor));

        if(data.type === "done") return Q.resolve(diffs);

        return schedule(() => this.trigger("done", {
            type:     `${data.type}.${Trigger.DONE}`,
            diffs:    diffs,
            previous: this.previous
        }, diffs));
    }

    apply(data, diffs) {
        try {
            // hier werden alle <action> handler ausgeführt
            const { payload } = data;
            const args        = Array.isArray(payload) ? payload : [payload];
            const action      = defaults(this.dispatch(data.type)).to(() => this.cursor);
            const result      = action.apply(this.cursor, args);
            const handler     = this.onResult.bind(this, data, diffs);

            return !(result && typeof result.then === "function") ? handler(result) : result
                .then(handler)
                .catch(this.onError.bind(this));
        } catch(e) {
            return this.onError(data, e);
        }
    }

    applyOnChild(data, diffs) {
        assert(false, "implement");

        return diffs;

        /* Q.all(this.domains.map(domain => domain.receive(data)).toJS())
            .then(x => x.reduce((dest, diffs) => dest.concat(diffs), Immutable.List.of()))
            .then(diffs => patch(this.cursor, diffs))
            .then(this.update.bind(this));*/
    }

    childHandles(action) {
        return this.cursor._unit.dependencies
            .filter(Unit.UnitFilter)
            .some(unit => unit.handles(action));
    }

    handles(action) {
        return !isUndefined(this.dispatch(action)) || this.childHandles(action);
    }

    receive(data, diffs = Immutable.List()) {
        assert(typeof data.type === "string", `${this.constructor.name}: Received invalied action '${data.type}'.`);

        // hier wird <action>.cancel verarbeitet
        if(this.childHandles(data.type)) return this.applyOnChild(data, diffs).then(x => x.toJS());
        if(!this.handles(data.type))     return Q.resolve(diffs.toJS());

        return this.apply(data, diffs);
    }

    _write(data, enc, cb) {
        this.receive(data)
            .then(diffs => this.buffers.push(diffs.toJS()))
            .then(() => cb())
            .catch(cb);
    }

    _read() {
        if(this.buffers.length === 0) return schedule(() => this._read(), 17);

        return this.push(this.buffers.shift());
    }
}

Unit.PropertyAction = curry(Unit.PropertyAction, 3);

export default Unit;
