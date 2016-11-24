import Intent from "../Intent";
import sinon from "sinon";
import { expect } from "chai";

const undef = undefined // eslint-disable-line

describe("IntentTest", function() {
    it("uses the methods on an intent", function(done) {
        const results  = [];
        const payload  = {};
        const action   = sinon.spy();
        const intent   = Intent.of(action, payload, {
            write(result) {
                try {
                    if(result.type !== "test4") return results.push(result);

                    expect(results.concat(result)).to.eql([{
                        type:    "test",
                        payload: undef
                    }, {
                        type:    "test2",
                        payload: undef
                    }, {
                        type:    "test3",
                        payload: {
                            id: "test"
                        }
                    }, {
                        type:    "test4",
                        payload: undef
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
            .trigger("test4");
    });
});
