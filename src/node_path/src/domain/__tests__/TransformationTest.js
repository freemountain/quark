import Transformation from "../Transformation";
import { expect } from "chai";
import Immutable from "immutable";

describe("TransformationTest", function() {
    it("creates a transformation", function() {
        const transformation = new Transformation({
            op:   "map",
            args: [x => x.get("id")]
        });

        expect(transformation.compute(Immutable.Map({
            1: {
                id: 2
            }
        })).toJS()).to.eql({
            1: 2
        });
    });

    it("triggers an error", function() {
        const transformation = new Transformation({
            op:   "lulu",
            args: [x => x.get("id")]
        });

        expect(() => transformation.compute(Immutable.Map({
            1: {
                id: 2
            }
        }))).to.throw("AssertionError: \n\tYou are trying to apply the non-existing method \'lulu\' on \n\t\tMap { \"1\": [object Object] }.\n\n\tTry one of these instead: \n\t.constructor()\n\t.toString()\n\t.get()\n\t.set()\n\t.setIn()\n\t.remove()\n\t.deleteIn()\n\t.update()\n\t.updateIn()\n\t.clear()\n\t.merge()\n\t.mergeWith()\n\t.mergeIn()\n\t.mergeDeep()\n\t.mergeDeepWith()\n\t.mergeDeepIn()\n\t.sort()\n\t.sortBy()\n\t.withMutations()\n\t.asMutable()\n\t.asImmutable()\n\t.wasAltered()\n\t.delete()\n\t.removeIn()\n\t.constructor()\n\t.flip()\n\t.mapEntries()\n\t.mapKeys()\n\t.constructor()\n\t.constructor()\n\t.toArray()\n\t.toIndexedSeq()\n\t.toJS()\n\t.toJSON()\n\t.toKeyedSeq()\n\t.toMap()\n\t.toObject()\n\t.toOrderedMap()\n\t.toOrderedSet()\n\t.toSet()\n\t.toSetSeq()\n\t.toSeq()\n\t.toStack()\n\t.toList()\n\t.toString()\n\t.concat()\n\t.includes()\n\t.entries()\n\t.every()\n\t.filter()\n\t.find()\n\t.forEach()\n\t.join()\n\t.keys()\n\t.map()\n\t.reduce()\n\t.reduceRight()\n\t.reverse()\n\t.slice()\n\t.some()\n\t.sort()\n\t.values()\n\t.butLast()\n\t.isEmpty()\n\t.count()\n\t.countBy()\n\t.equals()\n\t.entrySeq()\n\t.filterNot()\n\t.findEntry()\n\t.findKey()\n\t.findLast()\n\t.findLastEntry()\n\t.findLastKey()\n\t.first()\n\t.flatMap()\n\t.flatten()\n\t.fromEntrySeq()\n\t.get()\n\t.getIn()\n\t.groupBy()\n\t.has()\n\t.hasIn()\n\t.isSubset()\n\t.isSuperset()\n\t.keyOf()\n\t.keySeq()\n\t.last()\n\t.lastKeyOf()\n\t.max()\n\t.maxBy()\n\t.min()\n\t.minBy()\n\t.rest()\n\t.skip()\n\t.skipLast()\n\t.skipWhile()\n\t.skipUntil()\n\t.sortBy()\n\t.take()\n\t.takeLast()\n\t.takeWhile()\n\t.takeUntil()\n\t.valueSeq()\n\t.hashCode()\n\t.toSource()\n\t.inspect()\n\t.chain()\n\t.contains()\n.");
    });
});
