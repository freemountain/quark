const Intent     = require("../Intent");
const sinon      = require("sinon");
const { expect } = require("chai");

describe("IntentTest", function() {
    it("uses the methods on an intent", function(done) {
        const results  = [];
        const writeSpy = sinon.spy();
        const payload  = {};
        const action   = sinon.spy();
        const intent   = Intent.of(action, payload, {
            write(result) {
                
                try {
                    if(result.type !== "test4") return results.push(result);

                    expect(results.concat(result)).to.eql([{
                        type:    "test",
                        payload: undefined
                    }, {
                        type:    "test2",
                        payload: undefined
                    }, {
                        type:    "test3",
                        payload: {
                            id: "test"
                        }
                    }, {
                        type:    "test4",
                        payload: undefined
                    }]);
                    return done();
                } catch(e) {
                    return done(e);
                }
            }   
        });

        intent
            .trigger("test")
            .after(10)
            .trigger("test2")
            .trigger("test3", { id: "test" })
            .after(20)
            .trigger("test4")
    });
});
