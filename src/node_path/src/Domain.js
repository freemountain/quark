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
import assert from "assert";

export default class Domain {
    static Proxy = {
        get(target, name) {
            if(!Immutable.Map.prototype[name] && !Immutable.List.prototype[name]) return target.cursor.get(name);

            return target.cursor[name];
        },

        set() {
            assert(false, "can't set on cursor.");
        }
    };

    constructor() {
        const { props, triggers } = Object.getPrototypeOf(this).constructor;

        this.computed = pickBy(props, x => x instanceof Property);
        this.domains  = pickBy(props, x => x instanceof Domain);
        this.triggers = mapValues(pickBy(triggers, x => x instanceof Trigger), (x, key) => x.by(key));
        this.cursor   = Immutable
            .fromJS(pickBy(props, x => (
                !(x instanceof Property) &&
                !(x instanceof Domain)
            )));

        this.update();
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
            .call(new Proxy(this, Domain.Proxy), data.payload);

        if(result && result.then) return result
            .then(x => diff(this.cursor, x))
            .then(this.update.bind(this));

        return this.update(diff(this.cursor, result));
    }
}
