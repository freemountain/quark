const stream     = require("stream");
const sinon      = require("sinon");
const Writable   = stream.Writable;
const Transform  = stream.Transform;
const { expect } = require("@circle/core-assert");
const Gluon      = require("../Gluon");

let d;

describe("GluonTest", function() {
    beforeEach(function() {
        this.stdin = sinon.stub(global.process.stdin, "pipe", stream => {
            this.stream = stream;
            return stream;
        });

        this.out = new Transform({
            transform(data, enc, cb) {
                try {
                    JSON.parse(data);
                    cb(null, data);
                } catch(e) {
                    // because mocha uses stdout too, we need an easy way to filter it's
                    // messages. Looking for parseability is the easiest one :D
                }
            } 
        });
        this.stdout = sinon.stub(global.process.stdout, "write", this.out.write.bind(this.out));
    });

    afterEach(function() {
        this.stdin.restore();
        this.stdout.restore();
    });

    it("uses gluon to read", function(done) {
        expect(Gluon.of("test"))
            .to.produce([undefined, {
                test: "test"
            }])
            .notify(done);

        this.stream.write(JSON.stringify({
            type:    "value",
            payload: {
                test: "test"
            }
        }));

        this.stream.write(JSON.stringify({
            type: "action"
        }));

        this.stream.write(JSON.stringify({
            type:    "action",
            payload: {
                test: "test"
            }
        }));
    });

    it("uses gluon to write", function(done) {
        expect(this.out)
            .to.exactly.produce([
                "{\"type\":\"value\",\"payload\":{\"test\":\"test\"}}\n",
                "{\"type\":\"action\",\"payload\":{\"type\":\"loadQml\",\"payload\":{\"url\":\"path\"}}}\n",
                "{\"type\":\"value\",\"payload\":{\"qml\":\"test2\"}}\n",
                "{\"type\":\"action\",\"payload\":{\"type\":\"loadQml\",\"payload\":{\"url\":\"test2\"}}}\n",
                "{\"type\":\"action\",\"payload\":{\"type\":\"startProcess\",\"payload\":\"blub\\\\prog\\\\prog\"}}\n",
                "{\"type\":\"action\",\"payload\":{\"type\":\"killProcess\",\"payload\":\"blub\\\\prog\\\\prog\"}}\n"
            ])
            .notify(done);

        const gluon = Gluon.of("path");

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
