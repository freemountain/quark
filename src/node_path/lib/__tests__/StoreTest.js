"use strict";

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _Store = require("../Store");

var _Store2 = _interopRequireDefault(_Store);

var _expectStream = require("expect-stream");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("StoreTest", function () {
    it("uses the methods on a store", function (done) {
        const state1 = {
            users: [{
                id: 0,
                name: "jupp"
            }, {
                id: 1,
                name: "hansi"
            }],
            state: "LOGGED_IN"
        };

        const state2 = {
            users: [{
                id: 0,
                name: "jupp"
            }],
            state: "LOGGED_OUT",
            test: "test"
        };

        (0, _expectStream.expect)(_Store2.default.of(state1)).to.exactly.produce(state1, state2).on({
            intent: (state, x) => state.mergeDeep(x),
            payload: state1
        }, {
            intent: x => new _promise2.default(resolve => resolve(x))
        }, {
            intent: (state, x) => state.mergeDeep(x),
            payload: state2
        }).notify(done);
    });

    it("listens to updates", function (done) {
        const loggedIn = {
            state: {
                loggedIn: true
            }
        };

        const loggedOut = {
            state: {
                loggedIn: false
            }
        };
        const store = _Store2.default.of(loggedIn);

        (0, _expectStream.expect)(store.listen("state/loggedIn")).to.exactly.produce(true, false, true).notify(done);

        store.write({ intent: state => state.mergeDeep(loggedOut) });
        store.write({ intent: state => state.mergeDeep(loggedOut) });
        store.write({ intent: state => state.mergeDeep(loggedIn) });
    });
});

//# sourceMappingURL=StoreTest.js.map