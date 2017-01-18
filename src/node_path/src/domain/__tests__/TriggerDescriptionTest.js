import TriggerDescription from "../TriggerDescription";
import ActionDescription from "../ActionDescription";
import { expect } from "chai";
import Trigger from "../Trigger";
import Immutable from "immutable";
import sinon from "sinon";

describe("TriggerDescriptionTest", function() {
    it("creates a TriggerDescription", function() {
        const action = new ActionDescription("blub", Immutable.List());
        const guard1      = (x, param1, param2) => x.get("value") > 1 && param1 === 1 && param2 === "huhu";
        const guard2      = sinon.stub().returns(true);
        const trigger     = new Trigger("blub", Immutable.List([guard1, guard2]), Immutable.List.of("huhu"), 10);
        const description = new TriggerDescription("blub", trigger);

        expect(description.toJS()).to.eql({
            emits:  "blub",
            delay:  10,
            params: ["huhu"],
            guards: [guard1, guard2]
        });

        const data = Immutable.fromJS({
            _unit: {
                actions:     [[]],
                description: {
                    blub: action
                }
            },
            value: 2
        });

        action.func = function(a, b) {
            return this.update("value", x => x + 2 + a + b.length);
        };

        expect(action.func.call(data, 1, "huhu").get("value")).to.eql(9);

        return description.apply(data, [1]).then(cursor => {
            const updated = data
                .set("value", 9)
                .set("_unit", Immutable.fromJS({
                    description: {
                        blub: action
                    },
                    actions: [[{
                        name:     "blub",
                        triggers: true,
                        params:   [1, "huhu"]
                    }]]
                }));

            expect(cursor.toJS()).to.eql(updated.toJS());
        });
    });
});

