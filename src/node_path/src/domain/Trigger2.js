import defaults from "set-default-value";
import patch from "immutablepatch";

export default class Trigger {
    static triggered = {
        by(actions) {
            return new Trigger([actions]);
        },

        if(guards) {
            return new Trigger([], [guards]);
        }
    };

    static DONE      = "done";      // eslint-disable-line
    static ERROR     = "error";     // eslint-disable-line
    static PROGRESS  = "progress";  // eslint-disable-line
    static BEFORE    = "before";    // eslint-disable-line
    static CANCELLED = "cancelled"; // eslint-disable-line

    constructor(triggers, guards = [], delays = [], bindings = [], action) {
        this.action   = action;
        this.triggers = triggers;
        this.guards   = guards;
        this.delays   = delays;
        this.bindings = bindings;

        return this;
    }

    addAction(action) {
        return new Trigger([action].concat(this.triggers), this.guards, this.delays, this.bindings, action);
    }

    by(action) {
        return new Trigger(this.triggers.concat(action), this.guards, this.delays, this.bindings, this.action);
    }

    if(guard) {
        return new Trigger(this.triggers, this.guards.concat(guard), this.delays, this.bindings, this.action);
    }

    after(delay) {
        return new Trigger(this.triggers, this.guards, this.delays.concat(delay), this.action);
    }

    with(binding) {
        return new Trigger(this.triggers, this.guards, this.delays, this.bindings.concat(binding), this.action);
    }

    shouldTrigger(state, diffs, action) {
        const idx     = this.triggers.indexOf(action);
        const current = patch(state, diffs.toList());

        return idx === -1 ? false : defaults(this.guards[idx]).to(() => true)(current, state);
    }

    map(state, diffs, action) {
        if(!this.shouldTrigger(state, diffs, action)) return undefined; // eslint-disable-line

        const result = this.triggers.find(x => x === action);

        return result ? result : action; // eslint-disable-line
    }
}
