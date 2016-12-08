import defaults from "set-default-value";

export default class Trigger {
    static triggered = {
        by(actions) {
            return new Trigger([actions]);
        },

        if(guards) {
            return new Trigger([], [guards]);
        }
    };

    constructor(actions, guards = [], delays = [], bindings = []) {
        this.actions  = actions;
        this.guards   = guards;
        this.delays   = delays;
        this.bindings = bindings;
    }

    by(action) {
        return new Trigger(this.actions.concat(action), this.guards, this.delays, this.bindings);
    }

    if(guard) {
        return new Trigger(this.actions, this.guards.concat(guard), this.delays, this.bindings);
    }

    after(delay) {
        return new Trigger(this.actions, this.guards, this.delays.concat(delay));
    }

    with(binding) {
        return new Trigger(this.actions, this.guards, this.delays, this.bindings.concat(binding));
    }

    shouldTrigger(state, action) {
        const idx = this.actions.indexOf(action);

        return idx === -1 ? false : defaults(this.guards[idx]).to(() => true)(state);
    }

    map(state, action) {
        if(!this.shouldTrigger(state, action)) return undefined; // eslint-disable-line

        const result = this.actions.find(x => x === action);

        return result ? result : action;
    }
}
