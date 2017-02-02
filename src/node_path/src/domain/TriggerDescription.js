import { schedule } from "../Runloop";
import GuardError from "./error/GuardError";
import assert from "assert";
import Cursor from "./Cursor";
import Message from "../Message";

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

    shouldTrigger(cursor, message) {
        const params = message.get("payload").toJS();

        let result  = true;
        let tracing = cursor;

        // for loop to be able to return instantly
        // if some guard does not trigger or errors
        for(let i = 0; i < this.guards.size; i++) { // eslint-disable-line
            tracing = tracing
                .trace(`${this.emits}<Guard${i + 1}>`, message.get("payload"))
                .trace.triggered();

            try {
                const guard = this.guards.get(i);

                result  = guard(...params, tracing);
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
            cursor
        };
    }

    apply(data, message) {
        try {
            Message.assert(message);
            assert(data instanceof Cursor, `Expected a Cursor, got ${data}`);

            const enhanced = message.update("payload", payload => payload.concat(this.params));
            const cursor   = data;
            const op       = cursor[this.emits];
            const tracing  = cursor.trace(this.emits, enhanced.payload, this.guards.size);

            if(!(op instanceof Function)) return schedule(() => cursor);

            const x = this.shouldTrigger(tracing, enhanced);

            if(!x.result) return schedule(() => x.cursor.trace.end());

            return schedule(() => op.call(x.cursor.trace.triggered(), enhanced), this.delay)
                .then(y => y.trace.end())
                .catch(e => x.cursor.error(e));
        } catch(e) {
            return schedule(() => data.error(e));
        }
    }
}
