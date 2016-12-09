import Immutable from "immutable";
import set from "lodash.set";
import { EventEmitter } from "events";
import Transformation from "./Transformation";
import assert from "assert";
import Cursor from "./Cursor";

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
        const result = this.transformations.reduce((dest, transformation) => transformation.compute(dest), Immutable.fromJS(values));

        return result;
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

    shift(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "shift",
            args: args
        })));
    }

    last(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "last",
            args: args
        })));
    }

    sort(...args) {
        return new Property(this.aliases, this.transformations.concat(new Transformation({
            op:   "sort",
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

    join(alias) {
        return {
            on: (key, predicate) => new Property(this.aliases.concat(alias), this.transformations.concat(new Transformation({
                op:   "generic",
                args: [([dest, relations]) => Cursor.of(dest.map(entity => {
                    const result = relations.filter(relation => predicate(Cursor.of(entity), Cursor.of(relation)));

                    assert(result.size <= 1, `Ambigous relation, found for ${entity} ${result.size} matches: ${result}.`);

                    return entity.set(key, result.first());
                }).filter(x => x.get(key)))]
            })))
        };
    }

    cascade(...cascades) {
        // FIXME: das muss in die aliases mit rein:
        // - die müssen zu relations werden, dabei Relation { name: String (<- alias), cascades:[POST, PUT, DELETE]}
        // - dann kann bei jedem update eines relation-keys das weitergeleitet werden:
        //
        // Key: string
        // Relations: Key -> Relation
        //
        // Dann kann domain beim compute die relation keys diffen und diese
        // diffs rekursiv auf dem parent applyen, bis sich nix mehr ändert (diff.ength === 0)
        // danach is das update der domain komplett.
        return new Property(this.aliases, this.transformations, cascades);
    }
}
