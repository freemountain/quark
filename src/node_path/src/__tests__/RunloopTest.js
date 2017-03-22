import { schedule } from "../Runloop";
import { expect } from "chai";

describe("RunloopTest", function() {
    it("schedules some stuff", function() {
        const promise1 = schedule(() => 4)
            .then(x => expect(x).to.equal(4));

        const promise2 = schedule(() => Promise.resolve(4), 5)
            .then(x => expect(x).to.equal(4));

        const promise3 = schedule(() => Promise.reject(new Error("lulu")), 5)
            .catch(x => expect(x).to.eql(new Error("lulu")));

        const promise4 = schedule(() => {
            throw new Error("lulu");
        }).catch(x => expect(x).to.eql(new Error("lulu")));

        return Promise.all([promise1, promise2, promise3, promise4]);
    });
});
