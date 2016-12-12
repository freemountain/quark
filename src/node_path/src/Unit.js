import Trigger from "./domain/Trigger";
import Q from "q";
import Immutable from "immutable";
import Property from "./domain/Property";
import isUndefined from "lodash.isundefined";
import diff from "immutablediff";
import defaults from "set-default-value";
import Cursor from "./domain/Cursor";
import patch from "immutablepatch";
import uuid from "uuid";
import assert from "assert";
import ImmutableMethods from "./util/ImmutableMethods";

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
    constructor(description = {}) {
        if(description instanceof Unit) return description;

        const { props = {}, triggers = {} } = Object.getPrototypeOf(this).constructor;
        const properties                    = Immutable.fromJS(props);

        this.id          = uuid();
        this.computed    = properties.filter(x => x instanceof Property);
        this.domains     = properties.filter(x => x instanceof Unit);
        this.triggers    = Immutable.Map(triggers)
            .mergeDeep(description)
            .filter(x => x instanceof Trigger)
            .map((x, key) => x.by(key));

        const filtered = properties
            .filter((x, key) => !ImmutableMethods.has(key));

        assert(filtered.size === properties.size, `Your properties: ${properties.filter((x, key) => !filtered.has(key)).map((x, key) => `'${key}'`).join(",")} are also operations on the global state, please rename them`);

        this.cursor = properties
            .mergeDeep(description)
            .filter(x => (
                !(x instanceof Property) &&
                !(x instanceof Unit) &&
                !(x instanceof Trigger)
            ));

        this.domains = this.domains.map(x => x.setParent(this));
        this.update();

        return this;
    }

    setParent(parent) {
        this.key = Immutable.Map(parent.domains)
            .findKey(domain => domain.id === this.id);
        // TODO: der parent state is hier noch nich initialisiert,
        // also muss das umgekehrt passieren:
        // - jede domain hat eine updateUnits funktion:
        // this.cursor = statische props
        // this.domain = this.domains.map(domain => domain.parentChanged(this.state));
        // - property pfade in domains müssen mit dem key der domain geprefixt werden,
        // wodurch jede domain den parent cursor hält

        // der prefix muss nur verändert werden, wenn es sich um eine nicht
        // im nachhinein hinzugefügte property handelt (kanns ja keine relation
        // zu parent geben): diff der computed mit this props
        this.computed = this.computed.map(x => x.setPrefix(this.key));
        this.update();

        return this;
    }

    dispatch(name) {
        const mapped = this.triggers.has(name) ? this.triggers.get(name).map(this.cursor, name) : name;

        return mapped ? this[mapped] : mapped;
    }

    // Wie wird der state geupdated?
    //
    // -> es gibt einen neuen parent state
    // -> alle properties werden computed mit dem parent state
    // -> der cursor wird extrahiert aus dem parent state und applied
    // -> nun werden die kind domains mit dem parent state geupdated
    // -> am ende werden die kind diffs, so gemapped, dass der eigene key eingefügt
    // wird + mit den eigenen diffs geconcated

    // Dann kann domain beim compute die relation keys diffen und diese
    // diffs rekursiv auf dem parent applyen, bis sich nix mehr ändert (diff.ength === 0)
    // danach is das update der domain komplett.
    //
    // #### wat passiert bei root?
    // alle pfade abhängig vom parent, außer wenn kein parent vorhanden
    //  -> heißt setParent() und dabei die computed umschreiben
    //  -> bei constructor domains setParent
    update(data = this.cursor, previous = Immutable.List()) {
        const old = this.cursor;

        // iwie rekursion, wg dem mit den diffs bestimmt
        //
        // es muss noch iwie geguckt werden, welche diffs hier applied werden können
        // (wenn data this cursor alle, die nur eine ebene tief sind, ansonsten ers
        // den prefix entfernen und dann berechnen
        // console.log(Object.getPrototypeOf(this), this.cursor);
        this.cursor = patch(this.cursor, this.domains.map(x => x.update(this.cursor))
            .map(diffs => diffs.map(x => x.set("path", `/${this.key}${x.get("path")}`))))
            .reduce((dest, diffs) => dest.concat(diffs), Immutable.List());
        this.cursor = this.cursor.merge(this.computed.map(x => x.receive(data)));

        const diffs = diff(old, this.cursor);

        console.log(diffs, previous);

        return diffs.filter(x => previous.has(x)).size === 0 ? previous : this.update(this.cursor, diffs.concat(previous));
    }

    childHandles(action) {
        return this.domains.reduce((dest, domain) => domain.handles(action) || dest, false);
    }

    handles(action) {
        return !isUndefined(this.dispatch(action)) || this.childHandles(action);
    }

    receive(data) {
        if(this.childHandles(data.type)) return Q.all(this.domains.map(domain => domain.receive(data)).toJS())
            .then(x => x.reduce((dest, diffs) => dest.concat(diffs), Immutable.List.of()))
            .then(diffs => patch(this.cursor, diffs))
            .then(this.update.bind(this));

        if(!this.handles(data.type)) return Q.resolve([]);

        const result = defaults(this.dispatch(data.type)).to(() => this.cursor)
            .apply(Cursor.of(this.cursor), Array.isArray(data.payload) ? data.payload : [data.payload]);

        if(result && result.then) return result
            .then(this.update.bind(this));

        return this.update(result);
    }
}
