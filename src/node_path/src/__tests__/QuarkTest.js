import Gluon from "../Gluon";
import Quark from "../Quark";
import sinon from "sinon";
import { expect } from "expect-stream";
import { Duplex } from "stream";

describe("QuarkTest", function() {
    beforeEach(function() {
        const stream = new Duplex({
            objectMode: true,

            read() {
                setTimeout(() => [{
                    type:    "add",
                    payload: "guckguck"
                }, {
                    type: "sub"
                }].forEach(this.push.bind(this)), 30);
            },

            write(data, enc, cb) {
                cb();
            }
        });

        this.gluon = sinon.stub(Gluon, "of", () => stream); // eslint-disable-line
    });

    afterEach(function() {
        this.gluon.restore(); // eslint-disable-line
    });

    it("uses quark", function(done) {
        const quark = Quark.of({
            initialState: {
                test: "test"
            },

            intents: {
                onAdd: (state, payload) => state.set("test", payload),
                onBla: (state, x) => state.set("test3", x),

                blub(state) {
                    this.after(50)
                        .trigger("bla", 2)
                        .trigger("add", "last");

                    return state.set("test2", "huhu");
                }
            },

            mappings: {
                sub: "blub"
            },

            qml: "test"
        });

        expect(quark)
            .to.exactly.produce([{
                processes: [],
                qml:       "test",
                test:      "test"
            }, {
                processes: [],
                qml:       "test",
                test:      "guckguck"
            }, {
                processes: [],
                qml:       "test",
                test:      "guckguck"
            }, {
                processes: [],
                qml:       "test",
                test:      "guckguck",
                test2:     "huhu"
            }, {
                processes: [],
                qml:       "test",
                test:      "guckguck",
                test2:     "huhu",
                test3:     2
            }, {
                processes: [],
                qml:       "test",
                test:      "guckguck",
                test2:     "huhu",
                test3:     2
            }, {
                processes: [],
                qml:       "test",
                test:      "last",
                test2:     "huhu",
                test3:     2
            }])
            .notify(done);
    });
});
