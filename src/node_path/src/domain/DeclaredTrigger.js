import Immutable from "immutable";

export default class DeclaredTrigger {
    constructor(name, guards = Immutable.List(), params = Immutable.List(), delay = 0, destination) {
        this.name        = name;
        this.guards      = guards;
        this.params      = params;
        this.delay       = delay;
        this.destination = destination;
    }

    setDelay(delay) {
        return new DeclaredTrigger(this.name, this.guards, this.params, delay);
    }

    addGuard(guard) {
        return new DeclaredTrigger(this.name, this.guards.push(guard), this.params, this.delay);
    }

    addArguments(args) {
        return new DeclaredTrigger(this.name, this.guards, this.params.concat(args), this.delay);
    }

    setName(name) {
        return new DeclaredTrigger(name, this.guards, this.params, this.delay);
    }

    setDestination(destination) {
        return new DeclaredTrigger(this.name, this.guards, this.params, this.delay, destination);
    }

    toJS() {
        const obj = Object.assign({}, this, {
            guards: this.guards.size,
            params: this.params.toJS()
        });

        if(!this.destination) delete obj.destination;

        return obj;
    }
}
