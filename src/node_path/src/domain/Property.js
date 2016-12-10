import Immutable from "immutable";
import set from "lodash.set";
import Transformation from "./Transformation";
import assert from "assert";
import Cursor from "./Cursor";
import Relation from "./Relation";

export default class Property {
    static derive = set(mapper => {
        return new Property(Immutable.OrderedMap(), [new Transformation({
            op:   "generic",
            args: [mapper]
        })]);
    }, "from", (...aliases) => {
        const [self] = aliases;

        const relations = aliases
            .filter(alias => alias !== "*")
            .map(alias => new Relation(alias, alias === self ? Relation.SELF : Relation.INDIE))
            .reduce((dest, relation) => dest.set(relation.name, relation), Immutable.OrderedMap());

        return new Property(relations, []);
    })

    constructor(relations, transformations = [], current) {
        this.relations       = relations;
        this.transformations = transformations;
        this.current         = current;
    }

    compute(parent) {
        const values = this.relations.isEmpty() ? parent : this.relations.map(({ name }) => parent.get(name)).toList();
        const indies = this.relations
            .filter(({ tag }) => tag === Relation.INDIE)
            .map(({ name }) => parent.get(name))
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

    join(alias) {
        const current   = new Relation(alias, Relation.JOINED);
        const relations = this.relations.set(alias, current);

        return {
            on: (key, predicate) => this
                .setRelations(relations)
                .setCurrent(current)
                .addTransformation("generic", args => {
                    const dest         = args.first();
                    const relationData = args.last();

                    return Cursor.of(dest.map(entity => {
                        const result = relationData.filter(relation => predicate(Cursor.of(entity), Cursor.of(relation)));

                        assert(result.size <= 1, `Ambigous relation, found for ${entity} ${result.size} matches: ${result}.`);

                        return entity.set(key, result.first());
                    }).filter(x => x.get(key)));
                })
        };
    }

    cascade(...cascades) {
        assert(this.current);

        const relations = this.relations.set(this.current.name, this.current.setCascades(cascades));

        return new Property(relations, this.transformations);
    }
}
