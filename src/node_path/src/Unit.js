import Immutable from "immutable";
import Property from "./domain/Property";
import Trigger from "./domain/Trigger";
import isUndefined from "lodash.isUndefined";
import assert from "assert";
import Cursor from "./domain/Cursor";
import defaults from "set-default-value";
// import patch from "immutablepatch";
import diff from "immutablediff";
import Q from "q";
import { schedule } from "./Runloop";
import set from "lodash.set";

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
 *         items:    derive(x => x.loggedIn ? ["Menu", "Logout"] : ["Login"]
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
 *         return this.users.set(id, user).update(id, x => x.set("id", id))
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
export default class Unit {
    static PropertyFilter   = x => x instanceof Property;                        // eslint-disable-line
    static UnitFilter       = x => x instanceof Unit;                            // eslint-disable-line
    static DependencyFilter = x => Unit.PropertyFilter(x) || Unit.UnitFilter(x);

    constructor(descr = {}) {
        if(descr instanceof Unit) return descr;

        const { props = {}, triggers = {} } = Object.getPrototypeOf(this).constructor;
        const properties                    = Immutable.Map(props);
        const description                   = Immutable.fromJS(descr);
        const initialProps                  = properties
            .mergeDeep(description)
            .filter(x => (
                !(x instanceof Property) &&
                !(x instanceof Unit) &&
                !(x instanceof Trigger)
            ));

        this._dependencies       = properties.filter(Unit.DependencyFilter);
        this._parentDependencies = description.filter(Unit.DependencyFilter);
        this._cursor             = Cursor.of(Immutable.Map());

        this._triggers = Immutable
            .Map(triggers)
            .map((x, key) => x.addAction(key))
            .merge(this._dependencies.filter(Unit.PropertyFilter).map((x, key) => new Trigger(x.getDependencies(), [], [], [], key)))
            .set("props", (new Trigger(initialProps.keySeq().toJS())).addAction("props"));

        this._dependencies
            .filter(Unit.PropertyFilter)
            .forEach((prop, key) => set(this, key, function(parent) {
                return this.set(key, prop.compute(parent));
            }.bind(null, this)));

        this.trigger("props", initialProps);

        return this;
    }

    toJS() {
        return this.toImmutable().toJS();
    }

    toImmutable() {
        return this._cursor.merge(this._dependencies
            .filter(Unit.UnitFilter)
            .map(dep => dep.toImmutable()));
    }

    dispatch(name) {
        const mapped = this._triggers.has(name) ? this._triggers.get(name).map(this.cursor, name) : name;

        return mapped ? this[mapped] : mapped;
    }


    trigger(action, payload) {
        return this.receiveAction({
            type:    action,
            payload: payload
        });
    }

    props(properties) {
        return this.merge(properties);
    }

    done({ type: action, diffs }) {
        // todo this binding auf alle funktionen
        // bis auf internals erweiter, dafür den cursor
        // auch von domain abhängig machen
        console.log(this._triggers);
        console.log(this._triggers.filter(x => x.shouldTrigger(this._cursor, action)));

        console.error(`apply done stuff here (computed props etc) with action '${action}', produced [\n    ${diffs.join(",\n    ")}\n]`);
        return this;
    }

    childHandles(action) {
        return this._dependencies
            .filter(Unit.UnitFilter)
            .reduce((dest, unit) => unit.handles(action) || dest, false);
    }

    handles(action) {
        return !isUndefined(this.dispatch(action)) || this.childHandles(action);
    }

    handleError(data, e) {
        // hier werden alle <action>.error handler ausgeführt
        console.log(e);
        throw e;
    }

    handleResult(data, previous, result) {
        if(!result || typeof result.toJS !== "function") return assert(false, `\n\t### ${this.constructor.name}.${data.type}\n\tYour action '${data.type}' returned an unexpected result '${result}'${data.payload ? ` for '${data.payload}'` : ""}.\n\tPlease make sure to only return updated cursors of this unit.`);

        const old   = this._cursor;
        const diffs = previous.concat(diff(old, result));

        this._cursor = Cursor.of(result);

        return data.type === "done" ? Q.resolve(diffs) : schedule(() => this.receiveAction({
            type:    "done",
            payload: {
                type:  data.type,
                diffs: diffs
            }
        }, diffs));
    }

    applyAction(data, previous) {
        try {
            // hier werden alle <action> handler ausgeführt
            const { payload } = data;
            const args        = Array.isArray(payload) ? payload : [payload];
            const action      = defaults(this.dispatch(data.type)).to(() => this._cursor);
            // ?hier muss auf dem cursor eine progess methode sein, die quasi zwischendurch sachen triggert
            const result      = action.apply(this._cursor, args);
            const handler     = this.handleResult.bind(this, data, previous);

            return !(result && typeof result.then === "function") ? handler(result) : result
                .then(handler)
                .catch(this.handleError.bind(this));
        } catch(e) {
            return this.handleError(data, e);
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


    receiveAction(data, diffs = Immutable.List()) {
        assert(typeof data.type === "string", `${this.constructor.name}: Received invalied action ${data}.`);

        if(this.childHandles(data.type)) return this.applyOnChild(data, diffs).then(x => x.toJS());
        if(!this.handles(data.type))     return Q.resolve(diffs.toJS());

        return this.applyAction(data, diffs).then(x => x.toJS());
    }
}
