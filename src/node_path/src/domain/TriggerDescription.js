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

        let result = true;

        // for loop to be able to return instantly
        // if some guard does not trigger or errors
        for(let i = 0; i < this.guards.size; i++) { // eslint-disable-line
            cursor.trace(`${this.emits}<Guard${i + 1}>`, message.get("payload"));

            try {
                const guard = this.guards.get(i);

                cursor.trace.triggered();

                result = guard(...params, cursor);

                cursor.trace.end();

                if(!result) return { cursor, result };
            } catch(e) {
                return {
                    cursor: cursor.error(new GuardError(cursor.currentContext, this.emits, i + 1, e)),
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
        Message.assert(message);
        assert(data instanceof Cursor, `Expected a Cursor, got ${data}`);

        const enhanced = message.update("payload", payload => payload.concat(this.params));
        const cursor   = data;
        const op       = cursor[this.emits];

        if(!(op instanceof Function)) return schedule(() => cursor);

        cursor.trace(this.emits, enhanced.payload, this.guards.size);

        const x = this.shouldTrigger(cursor, enhanced);

        if(!x.result) return schedule(() => x.cursor.trace.end());

        x.cursor.trace.triggered();
        return schedule(() => op.call(x.cursor, enhanced), this.delay)
            .then(y => y.trace.end())
            .catch(e => x.cursor.error(e));
    }
}
