import Immutable from "immutable";
import assert from "assert";

export default class Cursor {
    static Proxy = {
        get(target, name) { // eslint-disable-line
            if(name === "__target")                              return target;
            if(name === "__proxy")                               return true;
            if(name === "generic")                               return mapper => mapper(Cursor.of(target));
            if(!target[name])                                    return Cursor.of(target.get(name));
            if(target[name] && target[name] instanceof Function) return target[name].bind(target);

            return target[name];
        },

        set() {
            assert(false, "can't set on cursor.");
        }
    };

    static of(target) {
        return (
            (
                !(target instanceof Immutable.List) &&
                !(target instanceof Immutable.Map)
            ) || target.__proxy                        // eslint-disable-line
        ) ? target : new Proxy(target, Cursor.Proxy);
    }
}
