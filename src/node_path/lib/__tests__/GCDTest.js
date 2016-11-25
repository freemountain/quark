"use strict";

var _GCD = require("../GCD");

var _GCD2 = _interopRequireDefault(_GCD);

var _expectStream = require("expect-stream");

var _sinon = require("sinon");

var _sinon2 = _interopRequireDefault(_sinon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("GCDTest", function () {
    it("lets the gcd dispatch some intents", function (done) {
        const intents = {
            onData: _sinon2.default.spy(),
            blub: _sinon2.default.spy()
        };

        const gcd = _GCD2.default.of(intents, {
            test: "blub"
        });

        (0, _expectStream.expect)(gcd).to.produce(result => {
            result.intent();

            if (result.payload && result.payload.key === "test" && intents.onData.callCount === 1 && intents.blub.callCount === 0) return 0;

            if (result.payload && result.payload.key === "test2" && intents.onData.callCount === 1 && intents.blub.callCount === 1) return 1;

            return -1;
        }).on({
            type: "data",
            payload: {
                key: "test"
            }
        }, {
            type: "test",
            payload: {
                key: "test2"
            }
        }).notify(done);
    });

    it("produces an error when feeding malformed data", function () {
        const gcd = _GCD2.default.of();

        try {
            gcd.write({});
        } catch (e) {
            (0, _expectStream.expect)(e.message).to.equal("Your action is in the wrong format. Expected an object with key type, but got \'{}\' of type object.");
        }
    });

    it("produces an error for a non existing mapping", function () {
        const gcd = _GCD2.default.of();

        try {
            gcd.write({
                type: "test"
            });
        } catch (e) {
            (0, _expectStream.expect)(e.message).to.equal("There is exists no mapping for \'test\' in {}.");
        }
    });

    it("produces an error for an unknown action", function () {
        const gcd = _GCD2.default.of({}, {
            test: "blub"
        });

        try {
            gcd.write({
                type: "test"
            });
        } catch (e) {
            (0, _expectStream.expect)(e.message).to.equal("No intent found for \'test\' -> \'blub\' in intents [].");
        }
    });
});

//# sourceMappingURL=GCDTest.js.map