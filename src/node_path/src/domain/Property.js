import Immutable from "immutable";
import set from "lodash.set";
import { EventEmitter } from "events";

export default class Property extends EventEmitter {
    static derive = set(mapper => {
        const property = new Property([], []);

        return property.map(mapper);
    }, "from", (...aliases) => new Property(aliases));

    constructor(aliases, transformations = [], cascades = []) {
        super();

        this.aliases         = aliases;
        this.transformations = transformations;
        this.cascades        = cascades;
    }

    compute(parent) {
        const values = this.aliases.length === 0 ? parent : this.aliases.map(alias => parent.get(alias));

        // hier muss die passende immutable datenstruktur genommen werden
        return this.transformations.reduce((dest, { op, args }) => dest[op](...args), Immutable.fromJS(values));
    }

    map(...args) {
        return new Property(this.aliases, this.transformations.concat({
            op:   "map",
            args: args
        }));
    }

    filter(...args) {
        return new Property(this.aliases, this.transformations.concat({
            op:   "filter",
            args: args
        }));
    }

    pop(...args) {
        return new Property(this.aliases, this.transformations.concat({
            op:   "pop",
            args: args
        }));
    }

    reduce(...args) {
        return new Property(this.aliases, this.transformations.concat({
            op:   "reduce",
            args: args
        }));
    }

    join(...args) {
        return {
            on: (...args2) => new Property(this.aliases, this.transformations.concat({
                op:   "join",
                args: args.concat(args2)
            }))
        };
    }

    cascade(...cascades) {
        return new Property(this.aliases, this.transformations, cascades);
    }
}
