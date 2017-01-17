import Join from "../Join";
import Relation from "../Relation";
import { expect } from "chai";
import Immutable from "immutable";

describe("JoinTest", function() { // eslint-disable-line
    it("creates and applies a join", function() {
        const dest     = new Relation("dest", Relation.SELF);
        const relation = new Relation("relations", Relation.JOINED, "relation", ["PUT"]);
        const join     = Join.of(relation, dest, (x, y) => x.get("relation") === y.get("id"));

        const joined = join(Immutable.fromJS([[{
            id:       0,
            name:     "jens",
            relation: 0
        }, {
            id:       1,
            name:     "peter",
            relation: 0
        }, {
            id:       2,
            name:     "hugo",
            relation: 1
        }, {
            id:   3,
            name: "heinz"
        }], [{
            id:   0,
            text: "good person"
        }, {
            id:   1,
            text: "average person"
        }, {
            id:   2,
            name: "bad person"
        }]]));

        expect(joined.first().toJS()).to.eql([{
            id:       0,
            name:     "jens",
            relation: {
                id:   0,
                text: "good person"
            }
        }, {
            id:       1,
            name:     "peter",
            relation: {
                id:   0,
                text: "good person"
            }
        }, {
            id:       2,
            name:     "hugo",
            relation: {
                id:   1,
                text: "average person"
            }
        }]);
    });
});
