import GCD from "../GCD";
import { expect } from "expect-stream";
import sinon from "sinon";

describe("GCDTest", function() {
    it("lets the gcd dispatch some intents", function(done) {
        const intents = {
            onData: sinon.spy(),
            blub:   sinon.spy()
        };

        const gcd = GCD.of(intents, {
            test: "blub"
        });

        expect(gcd)
            .to.produce(result => {
                result.intent();

                if(
                    result.payload &&
                    result.payload.key === "test" &&
                    intents.onData.callCount === 1 &&
                    intents.blub.callCount === 0
                ) return 0;

                if(
                    result.payload &&
                    result.payload.key === "test2" &&
                    intents.onData.callCount === 1 &&
                    intents.blub.callCount === 1
                ) return 1;

                return -1;
            })
            .on({
                type:    "data",
                payload: {
                    key: "test"
                }
            }, {
                type:    "test",
                payload: {
                    key: "test2"
                }
            })
            .notify(done);
    });

    it("produces an error when feeding malformed data", function() {
        const gcd = GCD.of();

        try {
            gcd.write({});
        } catch(e) {
            expect(e.message).to.equal("Your action is in the wrong format. Expected an object with key type, but got \'{}\' of type object.");
        }
    });

    it("produces an error for a non existing mapping", function() {
        const gcd = GCD.of();

        try {
            gcd.write({
                type: "test"
            });
        } catch(e) {
            expect(e.message).to.equal("There is exists no mapping for \'test\' in {}.");
        }
    });

    it("produces an error for an unknown action", function() {
        const gcd = GCD.of({}, {
            test: "blub"
        });

        try {
            gcd.write({
                type: "test"
            });
        } catch(e) {
            expect(e.message).to.equal("No intent found for \'test\' -> \'blub\' in intents [].");
        }
    });
});
