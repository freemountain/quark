import GuardError from "./error/GuardError";
import DeclaredTrigger from "./DeclaredTrigger";
import assert from "assert";

export default class Trigger {
    constructor(action, trigger) {
        this.emits  = action;
        this.guards = trigger.guards;
        this.delay  = trigger.delay;
        this.params = trigger.params;
        this.action = trigger.name;
    }

    merge(trigger) {
        assert(this.emits === trigger.emits && this.action === trigger.action, "can only merge triggers with the same action n emits value");

        const guards = trigger.guards.concat(this.guards);
        const params = trigger.params.concat(this.params);

        return new Trigger(this.emits, new DeclaredTrigger(this.action, guards, params, this.delay));
    }

    toJS() {
        return {
            emits:  this.emits,
            delay:  this.delay,
            guards: this.guards.toJS(),
            params: this.params.toJS(),
            action: this.action
        };
    }

    shouldTrigger(cursor, params) { // eslint-disable-line
        let result  = true;
        let tracing = cursor;

        // for loop to be able to return instantly
        // if some guard does not trigger or errors
        for(let i = 0; i < this.guards.size; i++) { // eslint-disable-line
            tracing = tracing
                .trace(`${this.emits}<Guard${i + 1}>`, params, "guard")
                .trace.triggered();

            try {
                const guard = this.guards.get(i);

                result  = guard(...(params.toJS()), tracing);
                tracing = tracing.trace.end();

                if(!result) return { cursor: tracing, result };
            } catch(e) {
                return {
                    cursor: tracing.error(new GuardError(tracing.currentContext, this.emits, i + 1, e)),
                    result: false
                };
            }
        }

        return {
            result,
            cursor: tracing
        };
    }
}
