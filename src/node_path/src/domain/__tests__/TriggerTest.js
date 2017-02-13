// @flow

import Trigger from "../Trigger";
import Action from "../Action";
import { expect } from "chai";
import DeclaredTrigger from "../DeclaredTrigger";
import { List, Map, fromJS } from "immutable";
import sinon from "sinon";
import Cursor from "../Cursor";
import Internals from "../Internals";
import Message from "../../Message";
import Uuid from "../../util/Uuid";

describe("TriggerTest", function() {
    beforeEach(function() {
        let id      = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid", () => ++id);

        global.Date.now = () => 0;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("creates a Trigger", function() {
        const action      = new Action("Test", "blub", List());
        const guard1      = (param1, param2, x) => x instanceof Object && x.get instanceof Function && x.get("value") > 1 && param1 === 1 && param2 === "huhu";
        const guard2      = sinon.stub().returns(true);
        const trigger     = new DeclaredTrigger("blub", List([guard1, guard2]), List.of("huhu"), 10);
        const description = new Trigger("blub", trigger);
        const message     = new Message("/test", List());

        expect(description.toJS()).to.eql({
            emits:  "blub",
            delay:  10,
            params: ["huhu"],
            guards: [guard1, guard2],
            action: "blub"
        });

        const data = fromJS({
            _unit: (new Internals({
                actions:     fromJS([[]]),
                description: Map({
                    blub: action
                })
            })).messageReceived(message),
            value: 2
        });

        const TestCursor = Cursor.for(class Test {}, data.get("_unit").description);

        action.func = function(y) {
            const [a, b] = y.get("payload").toJS();

            return this.update("value", value => value + a + b.length + 2);
        };

        const cursor = new TestCursor(data);

        expect(action.func.call(cursor, new Message("/blub", List([1, "huhu"]))).get("value")).to.equal(9);
    });
});

