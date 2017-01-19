import Internals from "../Internals";
import { expect } from "chai";
import { List } from "immutable";
import Message from "../../Message";

describe("InternalsTest", function() {
    it("creates internals", function() {
        const internals = new Internals({
            name: "Blub"
        });

        expect(internals.toJS()).to.eql({
            traces:      [],
            name:        "Blub",
            diffs:       [],
            errors:      [],
            history:     [],
            id:          null,
            description: [],
            revision:    0,
            current:     0,
            action:      null
        });

        expect(internals.get("description")).to.eql(List());
    });

    it("checks the action functions", function() {
        const message   = new Message("/blub", []);
        const internals = new Internals({
            name: "blub"
        });

        expect(() => internals.messageProcessed()).to.throw("AssertionError: Can't finish a message before starting.");
        expect(internals.messageReceived(message).action).to.equal(message);
        expect(() => internals.messageReceived(message).messageReceived(message)).to.throw("AssertionError: Can't start a message, if another message is currently processed.");
        expect(internals.messageReceived(message).messageProcessed().action).to.equal(null);
    });
});
