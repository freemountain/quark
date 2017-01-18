import ActionDescription from "../ActionDescription";
import { expect } from "chai";
import TestUnit from "../../__tests__/mocks/TestUnit";
import Immutable from "immutable";
import TriggerDescription from "../TriggerDescription";

describe("ActionDescriptionTest", function() {
    it("creates an ActionDescription", function() {
        const triggers = Immutable.Map(TestUnit.triggers)
            .map((x, key) => x.setName(key))
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new TriggerDescription(key, y))), Immutable.List()); // eslint-disable-line

        const descr = new ActionDescription("Test", "message", triggers);

        expect(descr.toJS()).to.eql({
            unit:   "Test",
            name:   "message",
            before: [{
                emits:  "action",
                delay:  0,
                guards: 1,
                params: []
            }, {
                emits:  "children",
                delay:  0,
                guards: 1,
                params: []
            }, {
                emits:  "diffs",
                delay:  0,
                guards: 1,
                params: []
            }],
            cancel:   [],
            progress: [],
            done:     [{
                emits:  "props",
                delay:  0,
                guards: 0,
                params: []
            }],
            error: []
        });
    });
});

