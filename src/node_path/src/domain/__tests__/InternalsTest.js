// @flow

import Internals from "../Internals";
import { expect } from "chai";
import Message from "../../Message";
import { List, Map } from "immutable";
import Trace from "../../telemetry/Trace";
import sinon from "sinon";
import Uuid from "../../util/Uuid";
import Cursor from "../Cursor";
// import CoreComponentError from "../../error/CoreComponentError";

const UnitCursor = Cursor.for(new (class Unit {})(), Map());

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
            name: "Blub",
            id:   "id"
        });

        expect(internals.toJS()).to.eql({
            _cursor:     null,
            name:        "Blub",
            history:     [],
            children:    {},
            id:          "id",
            revision:    0,
            action:      null,
            description: {
                message: {
                    name:     "message",
                    before:   [],
                    cancel:   [],
                    done:     [],
                    error:    [],
                    progress: [],
                    unit:     "Blub",
                    triggers: [{
                        action: "message",
                        delay:  0,
                        emits:  "message",
                        guards: 0,
                        params: []
                    }]
                }
            },
            debug: {
                traces:  [],
                _cursor: null
            }
        });

        expect(internals.get("description").toJS()).to.eql({
            message: {
                name:     "message",
                before:   [],
                cancel:   [],
                done:     [],
                error:    [],
                progress: [],
                unit:     "Blub",
                triggers: [{
                    action: "message",
                    delay:  0,
                    emits:  "message",
                    guards: 0,
                    params: []
                }]
            }
        });
    });

    it("checks the action functions", function() {
        const cursor     = new UnitCursor(Map());
        const message    = new Message("/blub", List());
        const internals  = new Internals({
            name: "blub",
            id:   "id"
        });

        expect(() => internals.messageProcessed()).to.throw("NotStartedError: Can\'t finish a message before starting.");
        expect(internals.setCursor(cursor).messageReceived(message).action.message.setCursor(null).toJS()).to.eql(message.toJS());
        expect(() => internals.setCursor(cursor).messageReceived(message)._unit.messageReceived(message)).to.throw("AlreadyReceivedError: Can\'t start a message, if another message is currently processed.");
        expect(internals.setCursor(cursor).messageReceived(message)._unit.messageProcessed().action).to.equal(null);
    });

    it("starts and updates a trace", function() {
        const message   = new Message("/blub", List());
        const internals = new Internals({
            name: "blub",
            id:   "id"
        });
        const cursor = new UnitCursor(Map({
            _unit: internals
        }));

        expect(internals.debug.isTracing).to.equal(false);

        expect(internals.debug.setCursor(cursor).startTracing("func", List.of(1)).debug.traces.toJS()).to.eql([new Trace({
            name:   "func",
            params: List.of(1)
        }, "blub").set("id", 1).set("start", 1).toJS()]);

        expect(internals.set("action", message).update("debug", debug => debug.updateCurrentTrace(x => x)).toJS()).to.eql(internals.set("action", message).toJS());
        const internals2 = internals
            .setCursor(cursor)
            .messageReceived(message)
            .debug.trace("lulu", List(), 1, "lala.done")
            .debug.trace.triggered()
            ._unit.setCursor(null);

        expect(internals2.debug.isTracing).to.equal(true);
        expect(internals2.toJS()).to.eql({
            _cursor: null,
            action:  {
                _cursor: null,
                message: {
                    headers:  {},
                    payload:  [],
                    resource: "/blub"
                },
                description: {
                    name:     "message",
                    before:   [],
                    cancel:   [],
                    done:     [],
                    error:    [],
                    progress: [],
                    unit:     "blub",
                    triggers: [{
                        action: "message",
                        delay:  0,
                        emits:  "message",
                        guards: 0,
                        params: []
                    }]
                },
                trigger:   null,
                previous:  null,
                error:     null,
                _triggers: false,
                state:     {
                    type:    "before",
                    errors:  [],
                    _cursor: null
                }
            },
            children:    {},
            history:     [],
            id:          "id",
            name:        "blub",
            revision:    0,
            description: {
                message: {
                    name:     "message",
                    before:   [],
                    cancel:   [],
                    done:     [],
                    error:    [],
                    progress: [],
                    unit:     "blub",
                    triggers: [{
                        action: "message",
                        delay:  0,
                        emits:  "message",
                        guards: 0,
                        params: []
                    }]
                }
            },
            debug: {
                traces: [{
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
                }],
                _cursor: null
            }
        });

        const internals3 = internals2
            .setCursor(null)
            .update("debug", debug => debug.updateCurrentTrace(x => x.errored(new Error("blub"))));

        expect(internals3.toJS()).to.eql({
            _cursor: null,
            action:  {
                _cursor: null,
                message: {
                    headers:  {},
                    payload:  [],
                    resource: "/blub"
                },
                _triggers: false,
                state:     {
                    type:    "before",
                    errors:  [],
                    _cursor: null
                },
                description: {
                    name:     "message",
                    before:   [],
                    cancel:   [],
                    done:     [],
                    error:    [],
                    progress: [],
                    unit:     "blub",
                    triggers: [{
                        action: "message",
                        delay:  0,
                        emits:  "message",
                        guards: 0,
                        params: []
                    }]
                },
                trigger:  null,
                error:    null,
                previous: null
            },
            history:     [],
            children:    {},
            id:          "id",
            name:        "blub",
            revision:    0,
            description: {
                message: {
                    name:     "message",
                    before:   [],
                    cancel:   [],
                    done:     [],
                    error:    [],
                    progress: [],
                    unit:     "blub",
                    triggers: [{
                        action: "message",
                        delay:  0,
                        emits:  "message",
                        guards: 0,
                        params: []
                    }]
                }
            },
            debug: {
                traces: [{
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
                }],
                _cursor: null
            }
        });

        expect(internals3.debug.isTracing).to.equal(true);
        expect(internals3.setCursor(cursor).messageProcessed().debug.isTracing).to.equal(false);
        expect(() => internals2.setCursor(cursor).messageProcessed().toJS()).to.throw("NotConsistentError: You can only lock consistent traces. Some end calls are probably missing @blub::Message</blub>.");
    });

// to state shit
/* it("works with the error functions", function() {
        const internals = new Internals({
            name: "Blub",
            id:   "id"
        });

        expect(internals.hasErrored()).to.equal(false);
        expect(internals.isRecoverable()).to.equal(true);

        expect(internals.error(new Error("huhu")).errors.toJS()).to.eql([new Error("huhu")]);
        expect(internals.error(new Error("huhu")).hasErrored()).to.equal(true);
        expect(internals.error(new Error("huhu")).isRecoverable()).to.equal(false);

        const e = new (class Rec extends CoreComponentError {
            constructor() {
                super("Rec");
            }

            isRecoverable() {
                return true;
            }
        })();

        expect(internals.error(e).isRecoverable()).to.equal(true);
    });*/
});
