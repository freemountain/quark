import Immutable from "immutable";
import assert from "assert";

export default class Cursor {
    static Proxy = {
        get(target, name) {
            if(name === "__proxy")          return true;
            if(name === "generic")          return mapper => mapper(Cursor.of(target));
            if(target.get && !target[name]) return target.get(name);
            if(target[name])                return target[name].bind(target);

            return target;
        },

        set() {
            assert(false, "can't set on cursor.");
        }
    };

    static of(target) {
        return (
            !(target instanceof Immutable.Map) ||
            target.__proxy                        // eslint-disable-line
        ) ? target : new Proxy(target, Cursor.Proxy);
    }
}
