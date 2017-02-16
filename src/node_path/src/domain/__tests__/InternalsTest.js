// @flow

import Internals from "../Internals";
import { expect } from "chai";
import { Map } from "immutable";
import Message from "../../Message";
import { List } from "immutable";
import Trace from "../../telemetry/Trace";
import sinon from "sinon";
import Uuid from "../../util/Uuid";
import CoreComponentError from "../../error/CoreComponentError";

describe("InternalsTest", function() {
    beforeEach(function() {
        let counter = 0;
        let id      = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid", () => ++id);

        global.Date.now = () => ++counter;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
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
            action:      null,
            previous:    null
        });

        expect(internals.get("description")).to.eql(Map());
    });

    it("checks the action functions", function() {
        const message   = new Message("/blub", List());
        const internals = new Internals({
            name: "blub"
        });

        expect(() => internals.messageProcessed()).to.throw("NotStartedError: Can\'t finish a message before starting.");
        expect(internals.messageReceived(message).action.message).to.equal(message);
        expect(() => internals.messageReceived(message).messageReceived(message)).to.throw("AlreadyReceivedError: Can\'t start a message, if another message is currently processed.");
        expect(internals.messageReceived(message).messageProcessed().action).to.equal(null);
    });

    it("starts and updates a trace", function() {
        const message   = new Message("/blub", List());
        const internals = new Internals({
            name: "blub"
        });

        expect(internals.isTracing()).to.equal(false);
        expect(internals.trace("func", List.of(1)).traces.toJS()).to.eql([new Trace({
            name:   "func",
            params: List.of(1)
        }, "blub").set("id", 1).set("start", 1).toJS()]);

        expect(() => internals.updateCurrentTrace(x => x)).to.throw("NoMessageError: Can\'t update a trace before receiving a message.");
        expect(internals.set("action", message).updateCurrentTrace(x => x).toJS()).to.eql(internals.set("action", message).toJS());
        const internals2 = internals
            .messageReceived(message)
            .trace("lulu", List(), "lala.done", 1)
            .updateCurrentTrace(x => x.triggered());

        expect(internals2.isTracing()).to.equal(true);
        expect(internals2.toJS()).to.eql({
            action: {
                message: {
                    headers:  {},
                    payload:  [],
                    resource: "/blub"
                },
                description: null,
                caller:      null,
                trigger:     null,
                start:       null,
                state:       "waiting",
                willTrigger: false
            },
            previous:    null,
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
                id:       3,
                parent:   null,
                end:      null,
                error:    null,
                guards:   0,
                name:     "blub::Message</blub>",
                params:   [],
                start:    3,
                traces:   [],
                triggers: true,
                locked:   false,
                trigger:  null
            }, {
                id:       4,
                parent:   3,
                end:      null,
                error:    null,
                guards:   1,
                name:     "blub::lulu",
                params:   [],
                start:    4,
                traces:   [],
                triggers: true,
                locked:   false,
                trigger:  "done"
            }]
        });

        const internals3 = internals2.updateCurrentTrace(x => x.errored(new Error("blub")));

        expect(internals3.toJS()).to.eql({
            action: {
                message: {
                    headers:  {},
                    payload:  [],
                    resource: "/blub"
                },
                state:       "waiting",
                willTrigger: false,
                description: null,
                caller:      null,
                trigger:     null,
                start:       null
            },
            previous:    null,
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
                id:       3,
                parent:   null,
                end:      null,
                error:    null,
                guards:   0,
                name:     "blub::Message</blub>",
                params:   [],
                start:    3,
                traces:   [],
                triggers: true,
                locked:   false,
                trigger:  null
            }, {
                id:       4,
                parent:   3,
                end:      5,
                error:    new Error("blub"),
                guards:   1,
                name:     "blub::lulu",
                params:   [],
                start:    4,
                traces:   [],
                triggers: true,
                locked:   false,
                trigger:  "done"
            }]
        });

        expect(internals3.isTracing()).to.equal(true);
        expect(internals3.messageProcessed().isTracing()).to.equal(false);
        expect(() => internals3.trace("g", List()).messageProcessed().toJS()).to.throw("NotConsistentError: You can only lock consistent traces. Some end calls are probably missing @blub::Message</blub>.");
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

        const e = class Rec extends CoreComponentError {
            constructor() {
                super("Rec");
            }
        };

        e.isRecoverable = () => true;

        expect(internals.error(e).isRecoverable()).to.equal(true);
    });
});
