import Store from "../Store";
import { expect } from "expect-stream";

describe("StoreTest", function() {
    it("uses the methods on a store", function(done) {
        const state1 = {
            users: [{
                id:   0,
                name: "jupp"
            }, {
                id:   1,
                name: "hansi"
            }],
            state: "LOGGED_IN"
        };

        const state2 = {
            users: [{
                id:   0,
                name: "jupp"
            }],
            state: "LOGGED_OUT",
            test:  "test"
        };

        expect(Store.of(state1))
            .to.exactly.produce(state1, state2)
            .on({
                intent:  (state, x) => state.mergeDeep(x),
                payload: state1
            }, {
                intent: x => new Promise(resolve => resolve(x))
            }, {
                intent:  (state, x) => state.mergeDeep(x),
                payload: state2
            })
            .notify(done);
    });

    it("listens to updates", function(done) {
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
        const store = Store.of(loggedIn);

        expect(store.listen("state/loggedIn"))
            .to.exactly.produce(true, false, true)
            .notify(done);

        store.write({ intent: state => state.mergeDeep(loggedOut) });
        store.write({ intent: state => state.mergeDeep(loggedOut) });
        store.write({ intent: state => state.mergeDeep(loggedIn) });
    });
});
