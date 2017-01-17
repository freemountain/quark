import { schedule } from "../Runloop";

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

    shouldTrigger() {
        console.log("###shouldTrigger");
        return false;
    }

    apply(cursor, params) {
        const enhanced = params.concat(this.params.toJS());
        const op       = cursor[this.emits];

        if((
            !(op instanceof Function) ||
            !this.shouldTrigger(cursor, enhanced)
        )) return cursor;

        return schedule(() => op.apply(cursor, enhanced), this.delay);
    }
}
