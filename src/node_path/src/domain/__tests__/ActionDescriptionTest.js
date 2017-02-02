import ActionDescription from "../ActionDescription";
import { expect } from "chai";
// import TestUnit from "../../__tests__/mocks/TestUnit";
import Immutable from "immutable";
// import TriggerDescription from "../TriggerDescription";
// import Action from "../Action";
import Runtime from "../../Runtime";
import Message from "../../Message";
import Internals from "../Internals";
import Uuid from "../../util/Uuid";
import sinon from "sinon";

// const triggered = Action.triggered;

class Test extends Runtime {
    static props = {
        name: "jupp"
    };

    message(name) {
        return this.set("name", name);
    }
}

/*
class Test2 extends Runtime {
    static triggers = {
        test: triggered.by("message")
        // test2: triggered.by("message"),
        // test3: triggered.by("message.done"),
        // test4: triggered.by("message.done"),
        // test5: triggered.by("message.error"),
        // test6: triggered.by("message.error")
    };

    static props = {
        name: "jupp"
    };

    message(name) {
        return this.set("name", name);
    }

    test() {
        return this.set("test1", "test1");
    }

    test2() {
        return this.set("test2", "test2");
    }
}
*/

describe("ActionDescriptionTest", function() {
    beforeEach(function() {
        let id      = 0;
        let counter = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid", () => ++id);

        global.Date.now = () => ++counter;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("applies an action", function(done) {
        const unit = new Test();
        const data = Immutable.Map({
            name:  "jupp",
            _unit: new Internals({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/test", ["test"]));
        const cursor   = (new unit.__Cursor(data))
            .update("_unit", internals => internals.messageReceived(message))
            .trace("message", message.get("payload"))
            .trace.triggered();

        const descr = new ActionDescription("Test", "test", unit.__triggers, function(name) {
            return this.set("name", name);
        });

        ActionDescription
            .applyAction(descr, message.setCursor(cursor), cursor, x => { // eslint-disable-line
                try {
                    const result  = x.messageProcessed();
                    const cursor2 = cursor
                        .trace.end()
                        .messageProcessed()
                        .set("name", "test")
                        .filter((_, key) => key !== "_unit"); // eslint-disable-line

                    const filtered = result
                        .filter((_, key) => key !== "_unit"); // eslint-disable-line

                    expect(filtered.toJS()).to.eql(cursor2.toJS());
                    expect(result.traces.toJS()).to.eql([{
                        id:       3,
                        parent:   null,
                        start:    1,
                        end:      4,
                        guards:   0,
                        locked:   true,
                        name:     "Test::Message</actions/test>",
                        params:   ["test"],
                        triggers: true,
                        error:    null,
                        traces:   [{
                            id:       4,
                            parent:   3,
                            start:    2,
                            end:      3,
                            guards:   0,
                            locked:   true,
                            name:     "Test::message",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            traces:   []
                        }]
                    }]);

                    done();
                } catch(e) {
                    done(e);
                }
            });
    });

    /* it("applies triggers", function() {
        const unit = new Test();
        const data = Immutable.Map({
            name:  "jupp",
            _unit: new Internals({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/message", ["test"]));
        const cursor   = (new unit.__Cursor(data))
            .update("_unit", internals => internals.messageReceived(message))
            .trace("message", message.get("payload"))
            .trace.triggered();

        const descr = new ActionDescription("Test", "message", unit.__triggers, Test.prototype.message);

        console.log("before", icursor.traces.map(({ name, start, end }) => [name, start, end]));
        return ActionDescription
            .applyTriggers(descr.before, cursor, message.setCursor(cursor))
            .then(x => {
                const result = x
                    .trace.end()
                    .messageProcessed();

                const cursor2 = cursor
                    .trace.triggered()
                    .trace.end()
                    .messageProcessed()
                    .filter((_, key) => key !== "_unit") // eslint-disable-line
                    .set("test1", "test1")
                    .set("test2", "test2");

                const filtered = result
                    .filter((_, key) => key !== "_unit"); // eslint-disable-line

                expect(filtered.toJS()).to.eql(cursor2.toJS());

                // hier müssen jetz die traces konkateniert werden
                expect(result.traces.toJS()).to.eql([{
                    start:    2,
                    end:      64,
                    guards:   0,
                    locked:   true,
                    name:     "Test::Message</actions/message>",
                    params:   ["test"],
                    triggers: true,
                    error:    null,
                    traces:   [{
                        start:    3,
                        end:      63,
                        guards:   0,
                        locked:   true,
                        name:     "Test::message",
                        params:   ["test"],
                        triggers: true,
                        error:    null,
                        traces:   [{
                            start:    3,
                            end:      63,
                            guards:   0,
                            locked:   true,
                            name:     "Test::test1",
                            params:   ["test"],
                            triggers: true,
                            traces:   [],
                            error:    null
                        }, {
                            start:    3,
                            end:      63,
                            guards:   0,
                            locked:   true,
                            name:     "Test::test2",
                            params:   ["test"],
                            triggers: true,
                            traces:   [],
                            error:    null
                        }]
                    }]
                }]);
            });
    });*/

    /* it("creates an ActionDescription", function() {
        const triggers = Immutable.Map(TestUnit.triggers)
            .map((x, key) => x.setName(key))
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new TriggerDescription(key, y))), Immutable.List()); // eslint-disable-line

        const descr = new ActionDescription("Test", "message", triggers, function(message) {
            return this.set("test", message.get("payload"));
        });

        expect(descr.toJS()).to.eql({
            unit:   "Test",
            name:   "message",
            before: [{
                emits:  "action",
                delay:  0,
                guards: 1,
                params: []
            }, {
                emits:  "children",
                delay:  0,
                guards: 1,
                params: []
            }, {
                emits:  "diffs",
                delay:  0,
                guards: 1,
                params: []
            }],
            trigger:  null,
            cancel:   [],
            progress: [],
            done:     [{
                emits:  "props",
                delay:  0,
                guards: 0,
                params: []
            }],
            error: []
        });
    });*/
});

