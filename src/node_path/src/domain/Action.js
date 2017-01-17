import Immutable from "immutable";
import Trigger from "./Trigger";
import defaults from "set-default-value";
import assert from "assert";

export default class Action {
    static DEFAULT_OPERATION = function() {
        return this;
    }

    static triggered = {
        by(action) {
            return (new Action()).by(action);
        },

        if(guard) {
            return (new Action()).if(guard);
        },

        with(argument) {
            return (new Action()).with(argument);
        },

        after(delay) {
            return (new Action()).after(delay);
        }
    };

    constructor(data = {}) {
        assert(data instanceof Object, `Expected an action or an action description, but got ${data}`);

        if(data instanceof Action) return data;

        const name = defaults(data.name).to("anonymous");

        this.name      = name;
        this.triggers  = Immutable.List(defaults(data.triggers).to(Immutable.List.of(new Trigger(name))));
        this.operation = defaults(data.operation).to(Action.DEFAULT_OPERATION);

        return this;
    }

    set(key, value) {
        const updated = Object.assign({}, this);

        updated[key] = value;

        return new Action(updated);
    }

    setName(name) {
        const trigger = this.triggers.first();

        assert(trigger && trigger.name === "anonymous", "Can't set a name, if there is no anonymous trigger");

        return new Action(Object.assign({}, this, {
            name:     name,
            triggers: this.triggers.slice(1).unshift(trigger.setName(name))
        }));
    }

    updateCurrent(op) {
        const current = this.triggers.last();

        return this.set("triggers", this.triggers.slice(0, -1).concat(op(current)));
    }

    merge(action) {
        return this.set("triggers", this.triggers
            .filter(x => !action.triggers.find(y => y.name === x.name))
            .concat(action.triggers));
    }

    setOperation(operation) {
        return this.set("operation", operation);
    }

    by(action) {
        return this.set("triggers", this.triggers.push(new Trigger(action)));
    }

    if(guard) {
        return this.updateCurrent(x => x.addGuard(guard));
    }

    with(...args) {
        return this.updateCurrent(x => x.addArguments(args));
    }

    after(delay) {
        return this.updateCurrent(x => x.setDelay(delay));
    }

    toJS() {
        return {
            name:     this.name,
            triggers: this.triggers.map(trigger => trigger.toJS()).toJS()
        };
    }
}
