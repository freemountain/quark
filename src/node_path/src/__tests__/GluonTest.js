import sinon from "sinon";
import { Transform } from "stream";
import { expect } from "expect-stream";
import Gluon from "../Gluon";

describe("GluonTest", function() {
    beforeEach(function() {
        this.stdin = sinon.stub(global.process.stdin, "pipe", stream => { // eslint-disable-line
            this.stream = stream; // eslint-disable-line

            return stream;
        });

        const write = global.process.stdout.write;

        this.out = new Transform({ // eslint-disable-line
            transform(data, enc, cb) {
                try {
                    JSON.parse(data);

                    return cb(null, data);
                } catch(e) {
                    // because mocha uses stdout too, we need an easy way to filter it's
                    // messages. Looking for parseability is the easiest one :D
                    return write.call(process.stdout, data);
                }
            }
        });

        this.stdout = sinon.stub(global.process.stdout, "write", this.out.write.bind(this.out)); // eslint-disable-line
    });

    afterEach(function() {
        this.stdin.restore();  // eslint-disable-line
        this.stdout.restore(); // eslint-disable-line
    });

    it("uses gluon to read", function(done) {
        expect(Gluon.of("test"))
            .to.produce([undefined, { // eslint-disable-line
                test: "test"
            }])
            .notify(done);

        const stream = this.stream; // eslint-disable-line

        stream.write(JSON.stringify({
            type:    "value",
            payload: {
                test: "test"
            }
        }));

        stream.write(JSON.stringify({
            type: "action"
        }));

        stream.write(JSON.stringify({
            type:    "action",
            payload: {
                test: "test"
            }
        }));
    });

    it("uses gluon to write", function(done) {
            expect(this.out) // eslint-disable-line
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
