// @flow

import { List } from "immutable";
import DeclaredTrigger from "./DeclaredTrigger";
import defaults from "set-default-value";
import type { Guard } from "./DeclaredTrigger";

type DeclaredTriggerDescription = {
    name?:      ?string,                // eslint-disable-line
    triggers?:  ?List<DeclaredTrigger>, // eslint-disable-line
    operation?: ?Function
}

export default class DeclaredAction {
    triggers:  List<DeclaredTrigger>; // eslint-disable-line
    operation: ?Function;
    name:      string;                // eslint-disable-line

    static triggered = {
        by(action: any): any {
            return (new DeclaredAction()).by(action);
        },

        if(guard: any): any {
            return (new DeclaredAction()).if(guard);
        },

        with(argument: any): any {
            return (new DeclaredAction()).with(argument);
        },

        after(delay: any): any {
            return (new DeclaredAction()).after(delay);
        }
    };

    constructor(data?: DeclaredTriggerDescription = {}) {
        const name = defaults(data.name).to("anonymous");

        this.name      = name;
        this.triggers  = List(defaults(data.triggers).to(List.of(new DeclaredTrigger(name))));
        this.operation = data.operation;

        return this;
    }

    set(key: string, value: *): DeclaredAction {
        const updated = Object.assign({}, this);

        updated[key] = value;

        return new DeclaredAction(updated);
    }

    setName(name: string): DeclaredAction {
        const trigger = this.triggers.first();

        return new DeclaredAction(Object.assign({}, this, {
            name:     name,
            triggers: this.triggers.slice(1).unshift(trigger.setName(name))
        }));
    }

    updateCurrent(op: DeclaredTrigger => DeclaredTrigger): DeclaredAction {
        const current = this.triggers.last();

        return this.set("triggers", this.triggers.slice(0, -1).concat([op(current)]));
    }

    merge(action: DeclaredAction): DeclaredAction {
        return this.set("triggers", this.triggers
            .filter(x => !action.triggers.find(y => y.name === x.name))
            .concat(action.triggers));
    }

    by(action: string): DeclaredAction {
        return this.set("triggers", this.triggers.push(new DeclaredTrigger(action)));
    }

    if(guard: Guard): DeclaredAction {
        return this.updateCurrent(x => x.addGuard(guard));
    }

    or(guard: Guard): DeclaredAction {
        return this.updateCurrent(x => x.updateCurrentGuard(y => (...args) => y(...args) || guard(...args)));
    }

    with(...args: *): DeclaredAction {
        return this.updateCurrent(x => x.addArguments(args));
    }

    after(delay: number): DeclaredAction {
        return this.updateCurrent(x => x.setDelay(delay));
    }

    toJS(): Object {
        return {
            name:     this.name,
            triggers: this.triggers.map(trigger => trigger.toJS()).toJS()
        };
    }
}
