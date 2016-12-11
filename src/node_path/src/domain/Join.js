import Immutable from "immutable";
import assert from "assert";
import Cursor from "./Cursor";
import curry from "lodash.curry";

class Join {
    static mapper(key, relationData, predicate, entity) {
        const isOneToMany = entity.get(key) instanceof Immutable.List;
        const idxs        = isOneToMany ? entity.get(key) : Immutable.List.of(entity.get(key));
        const result      = relationData.filter(relation => {
            return idxs.reduce((dest2, idx) => dest2 || predicate(Cursor.of(entity.set(key, idx)), Cursor.of(relation)), false); // eslint-disable-line
        });

        assert(!isOneToMany ? result.size <= 1 : true, `Ambigous relation, found for ${entity} ${result.size} matches: ${result}.`);

        return entity.set(key, isOneToMany ? result : result.first());
    }

    static of(alias, key, predicate, current, first, args) {
        const relationData = alias === first.name ? args.first() : args.last();
        const dest         = args
            .first()
            .map(Join.mapper(key, relationData, predicate))
            .filter(x => x.get(current.key));

        const transformed = args
            .pop()
            .shift()
            .unshift(dest);

        return Cursor.of(transformed);
    }
}

Join.mapper = curry(Join.mapper, 4);
Join.of     = curry(Join.of, 6);

export default Join;
