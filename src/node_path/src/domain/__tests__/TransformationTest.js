import Transformation from "../Transformation";
import { expect } from "chai";
import Immutable from "immutable";

describe("TransformationTest", function() {
    it("creates a transformation", function() {
        const transformation = new Transformation({
            op:   "map",
            args: [x => x.id]
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
            args: [x => x.id]
        });

        expect(() => transformation.compute(Immutable.Map({
            1: {
                id: 2
            }
        }))).to.throw();
    });
});
