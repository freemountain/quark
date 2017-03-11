// @flow

import { List } from "immutable";
import Cursor from "./Cursor";
import GuardError from "./error/GuardError";
import DeclaredTrigger from "./DeclaredTrigger";
import MergeError from "./error/MergeError";
import NoActionError from "./error/NoActionError";
import PendingAction from "./PendingAction";

export default class Trigger {
    emits:  string;    // eslint-disable-line
    guards: List<>;    // eslint-disable-line
    delay:  number;    // eslint-disable-line
    action: string;    // eslint-disable-line
    params: List<any>;

    constructor(action: string, trigger: DeclaredTrigger) {
        this.emits  = action;
        this.guards = trigger.guards;
        this.delay  = trigger.delay;
        this.params = trigger.params;
        this.action = trigger.name;
    }

    merge(trigger: Trigger): Trigger {
        if(this.emits !== trigger.emits || this.action !== trigger.action) throw new MergeError(this, trigger);

        const guards = trigger.guards.concat(this.guards);
        const params = trigger.params.concat(this.params);

        return new Trigger(this.emits, new DeclaredTrigger(this.action, guards, params, this.delay));
    }

    toJS(): {} {
        return {
            emits:  this.emits,
            delay:  this.delay,
            guards: this.guards.toJS(),
            params: this.params.toJS(),
            action: this.action
        };
    }

    shouldTrigger(cursor: Cursor, params: List<any>): Cursor { // eslint-disable-line
        let result  = true;   // eslint-disable-line
        let tracing = cursor; // eslint-disable-line

        if(!(tracing.action instanceof PendingAction)) throw new NoActionError(tracing.action);
        // for loop to be able to return instantly
        // if some guard does not trigger or errors
        for(let i = 0; i < this.guards.size; i++) { // eslint-disable-line
            tracing = tracing
                .debug.trace(`${this.emits}<Guard${i + 1}>`, params, "guard")
                .debug.trace.triggered();

            try {
                const guard = this.guards.get(i);

                result  = guard(...(params.toJS()), tracing);
                tracing = tracing.debug.trace.ended();

                if(!result) return tracing;
            } catch(e) {
                return tracing
                    .error(new GuardError(tracing._unit.name, this.emits, i + 1, e))
                    .debug.trace.errored();
            }
        }

        return tracing.action.willTrigger();
    }
}
