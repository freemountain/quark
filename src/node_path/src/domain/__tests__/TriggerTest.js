import Trigger from "../Trigger";
import { expect } from "chai";
import Immutable from "immutable";

describe("TriggerTest", function() {
    it("creates a trigger", function() {
        const trigger  = new Trigger("test");
        const guard1   = state => state.x;
        const guard2   = state => state.x;
        const trigger2 = trigger.addGuard(guard1).addGuard(guard2);
        const trigger3 = trigger2.addArgument("test");
        const trigger4 = trigger3.setDelay(10);

        expect(trigger).to.eql({
            name:   "test",
            guards: Immutable.List(),
            params: Immutable.List(),
            delay:  0
        });

        expect(trigger2).to.eql({
            name:   "test",
            guards: Immutable.List().push(guard1).push(guard2),
            params: Immutable.List(),
            delay:  0
        });

        expect(trigger3).to.eql({
            name:   "test",
            guards: Immutable.List().push(guard1).push(guard2),
            params: Immutable.List().push("test"),
            delay:  0
        });

        expect(trigger4).to.eql({
            name:   "test",
            guards: Immutable.List().push(guard1).push(guard2),
            params: Immutable.List().push("test"),
            delay:  10
        });
    });
});
