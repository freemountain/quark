import TriggerDescription from "../TriggerDescription";
import ActionDescription from "../ActionDescription";
import { expect } from "chai";
import Trigger from "../Trigger";
import Immutable from "immutable";
import sinon from "sinon";
import Cursor from "../Cursor";
import Internals from "../Internals";

describe("TriggerDescriptionTest", function() {
    before(function() {
        this.now = global.Date.now;

        global.Date.now = () => 0;
    });

    after(function() {
        global.Date.now = this.now;
    });

    it("creates a TriggerDescription", function() {
        const action      = new ActionDescription("Test", "blub", Immutable.List());
        const guard1      = (param1, param2, x) => x.get("value") > 1 && param1 === 1 && param2 === "huhu";
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
            _unit: new Internals({
                actions:     Immutable.fromJS([[]]),
                description: Immutable.Map({
                    blub: action
                })
            }),
            value: 2
        });

        const cursor = Cursor.for(class Test {}, data.get("_unit").description);

        action.func = function(a, b) {
            return this.update("value", x => x + 2 + a + b.length);
        };

        expect(action.func.call(new cursor(data), 1, "huhu").get("value")).to.eql(9);

        return description.apply(new cursor(data), [1]).then(x => {
            const updated = data
                .set("value", 9)
                .set("_unit", Immutable.fromJS({
                    description: {
                        blub: action
                    },
                    action:   null,
                    current:  0,
                    diffs:    [],
                    errors:   [],
                    history:  [],
                    id:       null,
                    name:     "Default",
                    revision: 0,
                    actions:  [[{
                        start:    0,
                        end:      0,
                        name:     "blub",
                        triggers: true,
                        params:   [1, "huhu"],
                        error:    null
                    }]]
                }));

            expect(x.toJS()).to.eql(updated.toJS());
        });
    });
});

