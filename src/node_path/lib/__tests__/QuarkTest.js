"use strict";

var _Gluon = require("../Gluon");

var _Gluon2 = _interopRequireDefault(_Gluon);

var _Quark = require("../Quark");

var _Quark2 = _interopRequireDefault(_Quark);

var _sinon = require("sinon");

var _sinon2 = _interopRequireDefault(_sinon);

var _expectStream = require("expect-stream");

var _stream = require("stream");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("QuarkTest", function () {
    beforeEach(function () {
        const stream = new _stream.Duplex({
            objectMode: true,

            read() {
                setTimeout(() => [{
                    type: "add",
                    payload: "guckguck"
                }, {
                    type: "sub"
                }].forEach(this.push.bind(this)), 30);
            },

            write(data, enc, cb) {
                cb();
            }
        });

        this.gluon = _sinon2.default.stub(_Gluon2.default, "of", () => stream); // eslint-disable-line
    });

    afterEach(function () {
        this.gluon.restore(); // eslint-disable-line
    });

    it("uses quark", function (done) {
        const quark = _Quark2.default.of({
            initialState: {
                test: "test"
            },

            intents: {
                onAdd: (state, payload) => state.set("test", payload),
                onBla: (state, x) => state.set("test3", x),

                blub(state) {
                    this.after(50).trigger("bla", 2).trigger("add", "last");

                    return state.set("test2", "huhu");
                }
            },

            mappings: {
                sub: "blub"
            },

            qml: "test"
        });

        (0, _expectStream.expect)(quark).to.exactly.produce([{
            processes: [],
            qml: "test",
            test: "test"
        }, {
            processes: [],
            qml: "test",
            test: "guckguck"
        }, {
            processes: [],
            qml: "test",
            test: "guckguck"
        }, {
            processes: [],
            qml: "test",
            test: "guckguck",
            test2: "huhu"
        }, {
            processes: [],
            qml: "test",
            test: "guckguck",
            test2: "huhu",
            test3: 2
        }, {
            processes: [],
            qml: "test",
            test: "guckguck",
            test2: "huhu",
            test3: 2
        }, {
            processes: [],
            qml: "test",
            test: "last",
            test2: "huhu",
            test3: 2
        }]).notify(done);
    });
});

//# sourceMappingURL=QuarkTest.js.map