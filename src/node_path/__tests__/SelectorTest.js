const Selector   = require("../Selector");
const sinon      = require("sinon");
const { expect } = require("@circle/core-assert");

describe("SelectorTest", function() {
    it("uses a selector stream", function(done) {
        expect(Selector.of("test/test/test"))
            .to.exactly.produce("test", { test: "test" }, undefined)
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
            }, {})
            .notify(done);
    });
});