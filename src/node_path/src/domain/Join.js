// @flow

import { List, Collection } from "immutable";
import assert from "assert";
import Cursor from "./Cursor";

/**
 * This class is used to create joins. the of function is
 * curried, so that the first 3 arguments describe a join,
 * while the last one applies it
 *
 * @author  Marco Sliwa <marco@circle.ai>
 * @example
 * const dest     = new Relation("dest", Relation.SELF);
 * const relation = new Relation("relations", Relation.JOINED, "relation", ["PUT"]);
 * const join     = Join.of(relation, dest, (dest, relation) => dest.relation === relation.id);
 *
 * const joined = join(Immutable.fromJS({
 *     dest: [{
 *          id:       0,
 *          name:     "jens",
 *          relation: 0
 *     }, {
 *          id:       1,
 *          name:     "peter",
 *          relation: 0
 *     }, {
 *          id:       2,
 *          name:     "hugo",
 *          relation: 1
 *     }, {
 *          id:       3,
 *          name:     "heinz",
 *     }],
 *     relations: [{
 *          id:       0,
 *          text:     "good person",
 *          relation: null
 *     }, {
 *          id:       1,
 *          text:     "average person",
 *     }, {
 *          id:       2,
 *          name:     "bad person"
 *     }]
 * }).toList());
 *
 * console.log(joined
 *     .map(({ relation,  name }) => `${name}: ${relation.text},`)
 *     .toJS()); // prints "jens: good person, peter: good person, hugo: average person"
 */
class Join {

    /**
     * this mapper is used when joining relational data
     *
     * @private
     * @param  {Relation}                   current   relation
     * @param  {Immutable.Collection}       data      of relation
     * @param  {function(args: *): boolean} predicate to join on
     * @param  {Immutable.Map}              entity    current entity to join into
     * @return {Immutable.Map}
     */
    static mapper({ key }: { key: string }, data: Collection<*, *>, predicate: any => boolean, entity: Map<string, *>) {
        const isOneToMany = entity.get(key) instanceof List;
        const idxs        = isOneToMany ? entity.get(key) : List.of(entity.get(key));
        const result      = data.filter(relation => {
            return idxs instanceof List ? idxs.some(idx => predicate(new Cursor(entity.set(key, idx)), new Cursor(relation))) : false; // eslint-disable-line
        });

        assert(!isOneToMany ? result.size <= 1 : true, `Ambigous relation, found for ${entity.toString()} ${result.size} matches: ${result.toString()}.`);

        return entity.set(key, isOneToMany ? result : result.first());
    }

    /**
     * curried function, that joins two relations
     * with incoming data
     *
     * @param  {Relation}                   current   relation
     * @param  {key}                        first     relation => self
     * @param  {function(args: *): boolean} predicate to join on
     * @param  {Immutable.Collection}       args      to extract data from
     * @return {Cursor}
     */
    static of(current, first, predicate, args) {
        assert(args.first() instanceof Collection, "All relations have to be of type Immutable.Collection.");

        const data = current.name === first.name ? args.first() : args.last();
        const dest = args
            .first()
            .map(Join.mapper.bind(null, current, data, predicate))
            .filter(x => x.get(current.key));

        const transformed = args
            .pop()
            .shift()
            .unshift(dest);

        return new Cursor(transformed);
    }
}

export default Join;
