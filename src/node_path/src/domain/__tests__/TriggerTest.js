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
        const action = new Action("Test", "blub", List(), function(x) {
            return this.set("x", 8 + x);
        });
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
                id:          "id",
                name:        "unit",
                actions:     fromJS([[]]),
                description: Map({
                    blub: action
                })
            })).messageReceived(message),
            value: 2
        });

        const TestCursor = Cursor.for(class Test {}, data.get("_unit").description);
        const cursor     = new TestCursor(data);

        return action.func
            .call(cursor, new Message("/blub", List([1, "huhu"])))
            .then(x => expect(x.get("x")).to.equal(9));
    });

    it("merges two triggers", function() {
        const guard1       = sinon.stub().returns(true);
        const guard2      = sinon.stub().returns(true);
        const guard3      = sinon.stub().returns(true);
        const trigger      = new DeclaredTrigger("blub", List([guard1, guard2]), List.of("huhu"), 10);
        const description  = new Trigger("blub", trigger);
        const trigger2     = new DeclaredTrigger("blub", List([guard3]), List.of(3, true), 20);
        const description2 = new Trigger("blub", trigger2);
        const trigger3     = new DeclaredTrigger("blub", List([guard3, guard1, guard2]), List.of(3, true, "huhu"), 10);

        expect(description.merge(description2)).to.eql(new Trigger("blub", trigger3));
        expect(() => description.merge(new Trigger("blub2", new DeclaredTrigger("blub", List(), List(), 0)))).to.throw("MergeError: You can only merge triggers with the same action and emits value, got (blub, blub) and (blub2, blub).");
    });
});

