import Immutable from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import assert from "assert";

class Cursor {
    static of(data) {
        return new Cursor(data);
    }

    constructor(data) { // eslint-disable-line
        if((
            !(data instanceof Immutable.List) &&
            !(data instanceof Immutable.Map)
        ) || data instanceof Cursor) return data;

        this.__data = Immutable.fromJS(data);

        Object.defineProperty(this, "size", {
            enumerable:   false,
            configurable: false,
            get:          function() {
                return this.__data.size;
            }
        });

        if(!this.__data.get || !this.__data.get("_unit")) return Object.freeze(this);

        const description = this.__data.get("_unit").get("description");

        if(!description || !description.forEach) return Object.freeze(this);

        description.forEach((action, key) => {
            Object.defineProperty(this, key, {
                enumerable:   false,
                configurable: false,
                writable:     false,
                value:        function(...args) {
                    return action.func.call(this, ...args);
                }
            });
        });

        return Object.freeze(this);
    }

    generic(mapper) {
        return mapper(this);
    }

    triggers() {
        return assert(false, "Cursor.triggers: implement!");
    }
}

ImmutableMethods
    .filter(key => (
        key.slice(0, 1) !== "_" &&
        (
            Immutable.Map.prototype[key] instanceof Function ||
            Immutable.List.prototype[key] instanceof Function ||
            Immutable.Set.prototype[key] instanceof Function ||
            Immutable.OrderedMap.prototype[key] instanceof Function
        )
    ))
    .forEach(method => Object.defineProperty(Cursor.prototype, method, {
        enumerable:   false,
        configurable: false,
        value:        function(...args) {
            return this.__data[method](...args);
        }
    }));

export default Cursor;
