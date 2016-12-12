import Immutable from "immutable";
import assert from "assert";

/**
 * This class creates cursor from a target, if
 * its an instance of immutable, otherwise the
 * argument is returned. It is primarily used
 * to proxy some calls to the respective immutable
 * methods, but is also used for some other operations
 *
 * @author Marco Sliwa <marco@circle.ai>
 * @example
 * const cursor = Cursor.of(Immutable.Map({
 *      key: "test"
 * });
 *
 * console.log(cursor.key);                                        // prints "test"
 * console.log(cursor.map((x, key) => `${key}: ${x}`).get("key")); // prints "key: test"
 * console.log(cursor.noKey);                                      // prints undefined
 * console.log(cursor.generic(state => state.get("key")));         // prints "test"
 */
export default class Cursor {

    /**
     * holds the proxy description used in of
     */
    static Proxy = {
        get(target, name) { // eslint-disable-line
            if(name === "__target")                              return target;
            if(name === "__proxy")                               return true;
            if(name === "generic" || name === "join")            return mapper => mapper(Cursor.of(target));
            if(!target[name])                                    return Cursor.of(target.get(name));
            if(target[name] && target[name] instanceof Function) return target[name].bind(target);

            return target[name];
        },

        set() {
            assert(false, "can't set on cursor.");
        }
    };

    /**
     * lifts a value to Cursor
     *
     * @constructor
     * @param       {*}          target of cursor
     * @return      {Cursor|*}
     */
    static of(target) {
        return (
            (
                !(target instanceof Immutable.List) &&
                !(target instanceof Immutable.Map)
            ) || target.__proxy                        // eslint-disable-line
        ) ? target : new Proxy(target, Cursor.Proxy);
    }
}
