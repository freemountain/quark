// @flow

import { List } from "immutable";

export type Guard = any => boolean;

export default class DeclaredTrigger {
    name:        string;      // eslint-disable-line
    guards:      List<Guard>; // eslint-disable-line
    params:      List<*>;     // eslint-disable-line
    delay:       number;      // eslint-disable-line

    constructor(name: string, guards: List<Guard> = List(), params: List<*> = List(), delay: number = 0) {
        this.name        = name;
        this.guards      = guards;
        this.params      = params;
        this.delay       = delay;
    }

    setDelay(delay: number): DeclaredTrigger {
        return new DeclaredTrigger(this.name, this.guards, this.params, delay);
    }

    addGuard(guard: Guard): DeclaredTrigger {
        return new DeclaredTrigger(this.name, this.guards.push(guard), this.params, this.delay);
    }

    updateCurrentGuard(op: Guard => Guard): DeclaredTrigger {
        return this.guards.size === 0 ? this : new DeclaredTrigger(this.name, this.guards.pop().push(op(this.guards.last())), this.params, this.delay);
    }

    addArguments(args: List<*>): DeclaredTrigger {
        return new DeclaredTrigger(this.name, this.guards, this.params.concat(args), this.delay);
    }

    setName(name: string): DeclaredTrigger {
        return new DeclaredTrigger(name, this.guards, this.params, this.delay);
    }

    toJS(): Object {
        return Object.assign({}, this, {
            guards: this.guards.size,
            params: this.params.toJS()
        });
    }
}
