import Immutable from "immutable";
import set from "lodash.set";
import { EventEmitter } from "events";
import Cursor from "./Cursor";
import Transformation from "./Transformation";

export default class Property extends EventEmitter {
    static derive = set(mapper => {
        return new Property([], [new Transformation({
            op:   "generic",
            args: [mapper]
        })]);
    }, "from", (...aliases) => new Property(aliases.filter(alias => alias !== "*")));

    constructor(aliases, transformations = [], cascades = []) {
        super();

        this.aliases         = aliases;
        this.transformations = transformations;
        this.cascades        = cascades;
    }

    compute(parent) {
        const values = this.aliases.length === 0 ? parent : this.aliases.map(alias => parent.get(alias));
        const cursor = Cursor.of(Immutable.fromJS(values));

        // hier muss die passende immutable datenstruktur genommen werden
        return this.transformations.reduce((dest, { op, args }) => dest[op](...args), cursor);
    }

    map(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "map",
            args: args
        })));
    }

    tap(tapper) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "generic",
            args: [cursor => {
                tapper(cursor);
                return cursor;
            }]
        })));
    }

    filter(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "filter",
            args: args
        })));
    }

    pop(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "pop",
            args: args
        })));
    }

    reduce(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "reduce",
            args: args
        })));
    }

    slice(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "slice",
            args: args
        })));
    }

    join(...args) {
        return {
            on: (...args2) => new Property(this.aliases, this.transformations.concat(new Transformation({
                op:   "join",
                args: args.concat(args2)
            })))
        };
    }

    cascade(...cascades) {
        return new Property(this.aliases, this.transformations, cascades);
    }
}
