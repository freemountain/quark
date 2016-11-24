"use strict";

var _Intent = require("../Intent");

var _Intent2 = _interopRequireDefault(_Intent);

var _sinon = require("sinon");

var _sinon2 = _interopRequireDefault(_sinon);

var _chai = require("chai");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const undef = undefined; // eslint-disable-line

describe("IntentTest", function () {
    it("uses the methods on an intent", function (done) {
        const results = [];
        const payload = {};
        const action = _sinon2.default.spy();
        const intent = _Intent2.default.of(action, payload, {
            write(result) {
                try {
                    if (result.type !== "test4") return results.push(result);

                    (0, _chai.expect)(results.concat(result)).to.eql([{
                        type: "test",
                        payload: undef
                    }, {
                        type: "test2",
                        payload: undef
                    }, {
                        type: "test3",
                        payload: {
                            id: "test"
                        }
                    }, {
                        type: "test4",
                        payload: undef
                    }]);
                    return done();
                } catch (e) {
                    return done(e);
                }
            }
        });

        intent.trigger("test").after(10).trigger("test2").trigger("test3", { id: "test" }).after(20).trigger("test4");
    });
});

//# sourceMappingURL=IntentTest.js.map