import Trigger from "./domain/Trigger";
import mapValues from "lodash.mapvalues";
import pickBy from "lodash.pickby";
import Q from "q";
import Immutable from "immutable";
import Property from "./domain/Property";
import isUndefined from "lodash.isundefined";
import map from "lodash.map";
import diff from "immutablediff";
import reduce from "lodash.reduce";
import defaults from "set-default-value";
import Cursor from "./domain/Cursor";

export default class Domain {
    constructor(description = {}) {
        const { props = {}, triggers = {} } = Object.getPrototypeOf(this).constructor;

        this.computed = pickBy(Object.assign(props, description), x => x instanceof Property);
        this.domains  = pickBy(Object.assign(props, description), x => x instanceof Domain);
        this.triggers = mapValues(pickBy(Object.assign(triggers, description), x => x instanceof Trigger), (x, key) => x.by(key));
        // TODO: hier muss gecheckt werden,
        // dass keine der props im prototype
        // von immutable vorkommt, weil das komische
        // nebeneffekte haben kann
        this.cursor   = Immutable
            .fromJS(pickBy(Object.assign(props, description), x => (
                !(x instanceof Property) &&
                !(x instanceof Domain) &&
                !(x instanceof Trigger)
            )));

        // TODO: hier is noch die reihenfolge der abhängigkeiten
        // unbeachtet, daher gibts fehler
        // this.update();
    }

    dispatch(name) {
        const mapped = this.triggers[name] ? this.triggers[name].map(this.cursor, name) : name;

        return mapped ? this[mapped] : mapped;
    }

    update(results = Immutable.List.of()) {
        const old = this.cursor
            .mergeDeep(...results);

        this.cursor = old
            .mergeDeep(mapValues(this.computed, x => x.compute(results)));

        return results.concat(diff(this.cursor, old)).toJS();
    }

    childHandles(action) {
        return reduce(this.domains, (dest, domain) => domain.handles(action) || dest, false);
    }

    handles(action) {
        return !isUndefined(this.dispatch(action)) || this.childHandles(action);
    }

    receive(data) {
        if(this.childHandles(data.type)) return Q.all(map(this.domains, domain => domain.receive(data)))
            .then(x => x.reduce((dest, diffs) => dest.concat(diffs), Immutable.List.of()))
            .then(this.update.bind(this));

        if(!this.handles(data.type)) return Q.resolve([]);

        const result = defaults(this.dispatch(data.type)).to(() => this.cursor)
            .apply(Cursor.of(this.cursor), Array.isArray(data.payload) ? data.payload : [data.payload]);

        if(result && result.then) return result
            .then(x => diff(this.cursor, x))
            .then(this.update.bind(this));

        return this.update(diff(this.cursor, result));
    }
}
