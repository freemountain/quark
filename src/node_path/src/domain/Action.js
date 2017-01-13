import Immutable from "immutable";
import Trigger from "./Trigger";
import defaults from "set-default-value";
import assert from "assert";

export default class Action {
    static DEFAULT_OPERATION = function() {
        return this;
    }

    constructor(data) {
        assert(data instanceof Object, `Expected an action or an action description, but got ${data}`);

        if(data instanceof Action) return data;

        assert(typeof data.name === "string", "Your action does not contain a name.");

        this.name      = data.name;
        this.triggers  = Immutable.Set(defaults(data.triggers).to([])).concat(new Trigger(data.name));
        this.operation = defaults(data.operation).to(Action.DEFAULT_OPERATION);

        return this;
    }

    set(key, value) {
        const updated = Object.assign({}, this);

        updated[key] = value;

        return new Action(updated);
    }

    updateCurrent(op) {
        const current = this.triggers.last();

        return this.set("triggers", this.triggers.slice(0, -1).concat(op(current)));
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

    with(argument) {
        return this.updateCurrent(x => x.addArgument(argument));
    }

    after(delay) {
        return this.updateCurrent(x => x.setDelay(delay));
    }
}
