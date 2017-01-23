import Internals from "../Internals";
import { expect } from "chai";
import { Map } from "immutable";
import Message from "../../Message";
import Immutable from "immutable";
import Trace from "../../telemetry/Trace";

describe("InternalsTest", function() {
    before(function() {
        this.now = global.Date.now;

        global.Date.now = () => 0;
    });

    after(function() {
        global.Date.now = this.now;
    });

    it("creates internals", function() {
        const internals = new Internals({
            name: "Blub"
        });

        expect(internals.toJS()).to.eql({
            traces:      [],
            name:        "Blub",
            diffs:       [],
            errors:      [],
            history:     [],
            children:    {},
            id:          null,
            description: {},
            revision:    0,
            current:     0,
            action:      null
        });

        expect(internals.get("description")).to.eql(Map());
    });

    it("checks the action functions", function() {
        const message   = new Message("/blub", []);
        const internals = new Internals({
            name: "blub"
        });

        expect(() => internals.messageProcessed()).to.throw("AssertionError: Can't finish a message before starting.");
        expect(internals.messageReceived(message).action).to.equal(message);
        expect(() => internals.messageReceived(message).messageReceived(message)).to.throw("AssertionError: Can't start a message, if another message is currently processed.");
        expect(internals.messageReceived(message).messageProcessed().action).to.equal(null);
    });

    it("starts and updates a trace", function() {
        const message   = new Message("/blub", []);
        const internals = new Internals({
            name: "blub"
        });

        expect(internals.isTracing()).to.equal(false);
        expect(internals.trace("func", Immutable.List.of(1)).traces.toJS()).to.eql([new Trace({
            name:   "func",
            params: Immutable.List.of(1)
        }, "blub").toJS()]);

        expect(() => internals.updateCurrentTrace(x => x)).to.throw("AssertionError: Can\'t update a trace before receiving a message.");
        const internals2 = internals.messageReceived(message);

        expect(internals2.isTracing()).to.equal(true);
        expect(internals2.toJS()).to.eql({
            action: {
                headers:  {},
                payload:  [],
                resource: "/blub"
            },
            current:     0,
            description: {},
            diffs:       [],
            errors:      [],
            children:    {},
            history:     [],
            id:          null,
            name:        "blub",
            revision:    0,
            traces:      [{
                end:      null,
                error:    null,
                guards:   0,
                name:     "blub::Message</blub>",
                params:   [],
                start:    0,
                traces:   [],
                triggers: true
            }]
        });

        const internals3 = internals2.updateCurrentTrace(x => x.errored(new Error("blub")));

        expect(internals3.toJS()).to.eql({
            action: {
                headers:  {},
                payload:  [],
                resource: "/blub"
            },
            current:     0,
            description: {},
            diffs:       [],
            errors:      [],
            history:     [],
            children:    {},
            id:          null,
            name:        "blub",
            revision:    0,
            traces:      [{
                end:      0,
                error:    new Error("blub"),
                guards:   0,
                name:     "blub::Message</blub>",
                params:   [],
                start:    0,
                traces:   [],
                triggers: true
            }]
        });

        expect(internals3.isTracing()).to.equal(true);
        expect(internals2.messageProcessed().isTracing()).to.equal(false);
        expect(() => internals2.trace("g", Immutable.List()).messageProcessed().toJS()).to.throw("AssertionError: You can only lock consistent traces. Some end calls are probably missing.");
    });

    it("works with the error functions", function() {
        const internals = new Internals({
            name: "Blub"
        });

        expect(internals.hasErrored()).to.equal(false);
        expect(internals.isRecoverable()).to.equal(true);

        expect(internals.error(new Error("huhu")).errors.toJS()).to.eql([new Error("huhu")]);
        expect(internals.error(new Error("huhu")).hasErrored()).to.equal(true);
        expect(internals.error(new Error("huhu")).isRecoverable()).to.equal(false);

        const e = new Error("huhu");

        e.isRecoverable = () => true;

        expect(internals.error(e).isRecoverable()).to.equal(true);
    });
});
