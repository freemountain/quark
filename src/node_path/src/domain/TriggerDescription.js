import { schedule } from "../Runloop";
import Immutable from "immutable";
import GuardError from "./error/GuardError";
import assert from "assert";
import Cursor from "./Cursor";

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
                // der muss noch den error speichern, damit oben
                // entschieden werden kann, ob der emittet werden
                // soll
                throw new GuardError(this.emits, key + 1, e);
            }
        }, true);
    }

    addTrace(cursor, params) {
        const traces = cursor.get("_unit").get("actions");
        const trace  = Immutable.fromJS({
            start:    Date.now(),
            name:     this.emits,
            triggers: false,
            error:    null,
            params:   params
        });

        const updated = traces.pop().push(traces.last().push(trace));

        return cursor.update("_unit", unit => unit.set("actions", updated));
    }

    addTriggered(cursor) {
        const traces  = cursor.get("_unit").get("actions");
        const current = traces.last();
        const updated = traces.pop().push(current.pop().push(current.last().update(trace => trace.set("triggers", true).set("end", Date.now()))));

        return cursor.update("_unit", unit => unit.set("actions", updated));
    }

    apply(data, params) {
        assert(data instanceof Cursor, `Expected a cursor, got ${data}`);

        const enhanced = params.concat(this.params.toJS());
        const cursor   = data;
        const op       = cursor[this.emits];
        const traced   = op instanceof Function ? this.addTrace(cursor, enhanced) : cursor;

        if((
            !(op instanceof Function) ||
            !this.shouldTrigger(traced, enhanced)
        )) return schedule(() => traced);

        return schedule(() => op.apply(this.addTriggered(traced), enhanced), this.delay);
    }
}
