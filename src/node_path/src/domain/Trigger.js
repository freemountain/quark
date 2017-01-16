import Immutable from "immutable";

export default class Trigger {
    constructor(name, guards = Immutable.List(), params = Immutable.List(), delay = 0) {
        this.name   = name;
        this.guards = guards;
        this.params = params;
        this.delay  = delay;
    }

    setDelay(delay) {
        return new Trigger(this.name, this.guards, this.params, delay);
    }

    addGuard(guard) {
        return new Trigger(this.name, this.guards.push(guard), this.params, this.delay);
    }

    addArguments(args) {
        return new Trigger(this.name, this.guards, this.params.concat(args), this.delay);
    }

    setName(name) {
        return new Trigger(name, this.guards, this.params, this.delay);
    }

    toJS() {
        return Object.assign({}, this, {
            guards: this.guards.toJS(),
            params: this.params.toJS()
        });
    }
}
