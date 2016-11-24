"use strict";

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _Gluon = require("../Gluon");

var _Gluon2 = _interopRequireDefault(_Gluon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const sinon = require("sinon");
const { Transform } = require("stream");
const { expect } = require("@circle/core-assert");

describe("GluonTest", function () {
    beforeEach(function () {
        this.stdin = sinon.stub(global.process.stdin, "pipe", stream => {
            // eslint-disable-line
            this.stream = stream; // eslint-disable-line

            return stream;
        });

        const write = global.process.stdout.write;

        this.out = new Transform({ // eslint-disable-line
            transform(data, enc, cb) {
                try {
                    JSON.parse(data);

                    return cb(null, data);
                } catch (e) {
                    // because mocha uses stdout too, we need an easy way to filter it's
                    // messages. Looking for parseability is the easiest one :D
                    return write.call(process.stdout, data);
                }
            }
        });

        this.stdout = sinon.stub(global.process.stdout, "write", this.out.write.bind(this.out)); // eslint-disable-line
    });

    afterEach(function () {
        this.stdin.restore(); // eslint-disable-line
        this.stdout.restore(); // eslint-disable-line
    });

    it("uses gluon to read", function (done) {
        expect(_Gluon2.default.of("test")).to.produce([undefined, { // eslint-disable-line
            test: "test"
        }]).notify(done);

        const stream = this.stream; // eslint-disable-line

        stream.write((0, _stringify2.default)({
            type: "value",
            payload: {
                test: "test"
            }
        }));

        stream.write((0, _stringify2.default)({
            type: "action"
        }));

        stream.write((0, _stringify2.default)({
            type: "action",
            payload: {
                test: "test"
            }
        }));
    });

    it("uses gluon to write", function (done) {
        expect(this.out) // eslint-disable-line
        .to.exactly.produce(["{\"type\":\"value\",\"payload\":{\"test\":\"test\"}}\n", "{\"type\":\"action\",\"payload\":{\"type\":\"loadQml\",\"payload\":{\"url\":\"path\"}}}\n", "{\"type\":\"value\",\"payload\":{\"qml\":\"test2\"}}\n", "{\"type\":\"action\",\"payload\":{\"type\":\"loadQml\",\"payload\":{\"url\":\"test2\"}}}\n", "{\"type\":\"action\",\"payload\":{\"type\":\"startProcess\",\"payload\":\"blub\\\\prog\\\\prog\"}}\n", "{\"type\":\"action\",\"payload\":{\"type\":\"killProcess\",\"payload\":\"blub\\\\prog\\\\prog\"}}\n"]).notify(done);

        const gluon = _Gluon2.default.of("path");

        gluon.write({
            test: "test"
        });

        gluon.write({
            qml: "test2"
        });

        gluon.start("/blub/prog/prog");
        gluon.kill("/blub/prog/prog");
    });
});

//# sourceMappingURL=GluonTest.js.map