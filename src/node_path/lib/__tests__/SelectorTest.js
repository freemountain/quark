"use strict";

var _Selector = require("../Selector");

var _Selector2 = _interopRequireDefault(_Selector);

var _coreAssert = require("@circle/core-assert");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("SelectorTest", function () {
    it("uses a selector stream", function (done) {
        (0, _coreAssert.expect)(_Selector2.default.of("test/test/test")).to.exactly.produce("test", { test: "test" }, undefined) // eslint-disable-line
        .on({
            test: {
                test: {
                    test: "test"
                }
            }
        }, {
            test: {
                test: {
                    test: "test"
                }
            }
        }, {
            test: {
                test: {
                    test: {
                        test: "test"
                    }
                }
            }
        }, {}).notify(done);
    });
});

//# sourceMappingURL=SelectorTest.js.map