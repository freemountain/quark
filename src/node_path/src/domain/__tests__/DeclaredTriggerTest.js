// @flow

import DeclaredTrigger from "../DeclaredTrigger";
import { expect } from "chai";
import { List } from "immutable";

describe("DeclaredTriggerTest", function() {
    it("declares a trigger", function() {
        const trigger  = new DeclaredTrigger("test");
        const guard1   = state => state.x;
        const guard2   = state => state.x;
        const trigger2 = trigger.addGuard(guard1).addGuard(guard2);
        const trigger3 = trigger2.addArguments(List.of("test"));
        const trigger4 = trigger3.setDelay(10);

        expect(trigger.toJS()).to.eql({
            name:   "test",
            guards: 0,
            params: [],
            delay:  0
        });

        expect(trigger2.toJS()).to.eql({
            name:   "test",
            guards: 2,
            params: [],
            delay:  0
        });

        expect(trigger3.toJS()).to.eql({
            name:   "test",
            guards: 2,
            params: ["test"],
            delay:  0
        });

        expect(trigger4.toJS()).to.eql({
            name:   "test",
            guards: 2,
            params: ["test"],
            delay:  10
        });
    });
});
