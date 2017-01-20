import { schedule } from "../Runloop";
import GuardError from "./error/GuardError";
import assert from "assert";
import Cursor from "./Cursor";
import { List } from "immutable";

export default class TriggerDescription {
    constructor(action, trigger) {
        this.emits  = action;
        this.guards = trigger.guards;
        this.delay  = trigger.delay;
        this.params = trigger.params;
        this.action = trigger.name;
    }

    toJS() {
        return {
            emits:  this.emits,
            delay:  this.delay,
            guards: this.guards.toJS(),
            params: this.params.toJS()
        };
    }

    shouldTrigger(cursor, params) {
        return this.guards.reduce((dest, guard, key) => {
            try {
                const result = guard(...params, cursor);

                return dest && result;
            } catch(e) {
                throw new GuardError(cursor.currentContext, this.emits, key + 1, e);
            }
        }, true);
    }

    apply(data, params) {
        assert(params instanceof List, `params need to be an Immutable.List, got ${params.constructor.name}`);
        assert(data instanceof Cursor, `Expected a Cursor, got ${data}`);

        const enhanced = params.concat(this.params);
        const cursor   = data;
        const op       = cursor[this.emits];
        const traced   = op instanceof Function ? cursor.trace(this.emits, enhanced, this.guards.size) : cursor;
        const jsParams = enhanced.toJS();

        if((
            !(op instanceof Function) ||
            !this.shouldTrigger(traced, jsParams)
        )) return schedule(() => traced);

        return schedule(() => op.apply(cursor.trace.triggered(), jsParams), this.delay)
            .then(x => x.trace.end(cursor));
    }
}
