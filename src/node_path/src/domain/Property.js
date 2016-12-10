import Immutable from "immutable";
import set from "lodash.set";
import Transformation from "./Transformation";
import assert from "assert";
import Cursor from "./Cursor";
import Relation from "./Relation";

class Property {
    static derive = set(mapper => {
        return new Property(Immutable.List(), [new Transformation({
            op:   "generic",
            args: [mapper]
        })]);
    }, "from", (...aliases) => {
        const [self] = aliases;

        const relations = Immutable.List(aliases)
            .filter(alias => alias !== "*")
            .map(alias => new Relation(alias, alias === self ? Relation.SELF : Relation.INDIE));

        return new Property(relations, []);
    })

    constructor(relations, transformations = [], current) {
        this.relations       = relations;
        this.transformations = transformations;
        this.current         = current;
    }

    extractRelations(parent) {
        const mapped = this.relations
            .filter(x => x.tag === Relation.JOINED || x.tag === Relation.SELF)
            .map(({ name }) => parent.get(name));

        return mapped
            .slice(0, 1)
            .concat(mapped.slice(1).reverse());
    }

    compute(parent) {
        const values = this.relations.isEmpty() ? parent : this.extractRelations(parent);

        const indies = this.relations
            .filter(({ tag }) => tag === Relation.INDIE)
            .map(({ name }) => parent.get(name))
            .reduce((dest, x) => dest.set(x.name, x), Immutable.Map())
            .toObject();

        const result = this.transformations.reduce((dest, transformation) => transformation.compute(dest, indies), Immutable.fromJS(values));

        return result;
    }

    addTransformation(op, ...args) {
        return new Property(this.relations, this.transformations.concat(new Transformation({
            op:   op,
            args: args
        })), this.current);
    }

    setCurrent(current) {
        return new Property(this.relations, this.transformations, current);
    }

    setRelations(relations) {
        return new Property(relations, this.transformations, this.current);
    }

    // TODO automatisiert alle transformationen vom prototyp holen
    // und dann mit dem prototyp mergen
    map(...args) {
        return this.addTransformation("map", ...args);
    }

    tap(tapper) {
        return this.addTransformation("generic", cursor => {
            tapper(cursor);
            return cursor;
        });
    }

    filter(...args) {
        return this.addTransformation("filter", ...args);
    }

    pop(...args) {
        return this.addTransformation("pop", ...args);
    }

    shift(...args) {
        return this.addTransformation("shift", ...args);
    }

    last(...args) {
        return this.addTransformation("last", ...args);
    }

    sort(...args) {
        return this.addTransformation("sort", ...args);
    }

    reduce(...args) {
        return this.addTransformation("reduce", ...args);
    }

    slice(...args) {
        return this.addTransformation("slice", ...args);
    }

    cascade(...cascades) {
        assert(this.current);

        const key   = this.relations.findKey(x => x.name === this.current.name);
        const value = this.current.setCascades(cascades);

        return new Property(this.relations.set(key, value), this.transformations);
    }
}

Object.defineProperty(Property.prototype, "join", {
    enumerable:   false,
    configurable: false,
    get:          function join() {
        const on = (alias, key, predicate) => {
            const current   = new Relation(alias, Relation.JOINED, key);
            const relations = this.relations.push(current);

            return this
                .setRelations(relations)
                .setCurrent(current)
                .addTransformation("join", args => {
                    const relationData = args.last();
                    const dest         = args
                        .first()
                        .map(entity => {
                            const isOneToMany = entity.get(key) instanceof Immutable.List;
                            const idxs        = isOneToMany ? entity.get(key) : Immutable.List.of(entity.get(key));
                            const result      = relationData.filter(relation => {
                                return idxs.reduce((dest2, idx) => dest2 || predicate(Cursor.of(entity.set(key, idx)), Cursor.of(relation)), false); // eslint-disable-line
                            });

                            assert(!isOneToMany ? result.size <= 1 : true, `Ambigous relation, found for ${entity} ${result.size} matches: ${result}.`);

                            return entity.set(key, isOneToMany ? result : result.first());
                        })
                        .filter(x => x.get(current.key));

                    const transformed = args
                        .pop()
                        .shift()
                        .unshift(dest);

                    return Cursor.of(transformed);
                });
        };

        const func = name => ({
            on: on.bind(null, name)
        });

        func.self = {
            on: on.bind(null, this.relations.first().name)
        };

        return func;
    }
});

export default Property;
