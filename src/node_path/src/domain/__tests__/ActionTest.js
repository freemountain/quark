import Action from "../Action";
import { expect } from "chai";
// import TestUnit from "../../__tests__/mocks/TestUnit";
import Immutable from "immutable";
import Trigger from "../Trigger";
import DeclaredAction from "../DeclaredAction";
import Runtime from "../../Runtime";
import Message from "../../Message";
import Internals from "../Internals";
import Uuid from "../../util/Uuid";
import sinon from "sinon";

const triggered = DeclaredAction.triggered;

class Test extends Runtime {
    static props = {
        name: "jupp"
    };

    message(name) {
        return this.set("name", name);
    }
}

class Test2 extends Runtime {
    static triggers = {
        message: triggered
            .if(() => true)
            .if(name => name.indexOf("test") !== -1)
            .with(5)
            .after(10)
    }

    static props = {
        name:  "jupp",
        value: 3
    };

    message(name, value) {
        return this
            .set("value", value)
            .set("name", name);
    }
}


class Test3 extends Runtime {
    static triggers = {
        test:  triggered.by("message"),
        test2: triggered.by("message")
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

describe("ActionTest", function() {
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

    it("creates an Action", function() {
        const triggers = Immutable.Map(Test2.triggers)
            .map((x, key) => x.setName(key))
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new Trigger(key, y))), Immutable.List()); // eslint-disable-line

        const descr = new Action("Test", "message", triggers, function(name, value) {
            return this
                .set("value", value)
                .set("name", name);
        });

        expect(descr.toJS()).to.eql({
            unit:     "Test",
            name:     "message",
            before:   [],
            triggers: [{
                emits:  "message",
                delay:  10,
                guards: 2,
                params: [5],
                action: "message"
            }],
            cancel:   [],
            progress: [],
            done:     [],
            error:    []
        });
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

        const descr = new Action("Test", "test", unit.__triggers, function(name) {
            return this.set("name", name);
        });

        Action
            .applyAction(descr, message.setCursor(cursor), cursor, descr.triggers.first())
            .then(x => { // eslint-disable-line
                try {
                    const result  = x
                        .trace.end()
                        .messageProcessed();
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

    it("calls an action handler", function(done) {
        const unit = new Test2();
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
            .update("_unit", internals => internals.messageReceived(message));

        unit.message.call(cursor, message.setCursor(cursor))
            .then(x => { // eslint-disable-line
                try {
                    const result  = x.messageProcessed();
                    const cursor2 = cursor
                        .trace("message", message.get("payload"))
                        .trace.triggered()
                        .trace.end()
                        .messageProcessed()
                        .set("name", "test")
                        .set("value", 5)
                        .filter((_, key) => key !== "_unit"); // eslint-disable-line

                    const filtered = result
                        .filter((_, key) => key !== "_unit"); // eslint-disable-line

                    expect(filtered.toJS()).to.eql(cursor2.toJS());
                    expect(result.traces.toJS()).to.eql([{
                        id:       3,
                        parent:   null,
                        start:    1,
                        end:      12,
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
                            end:      11,
                            guards:   2,
                            locked:   true,
                            name:     "Test::message",
                            params:   ["test", 5],
                            triggers: true,
                            error:    null,
                            traces:   [{
                                id:       5,
                                parent:   4,
                                start:    3,
                                end:      4,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message<Guard1>",
                                params:   ["test", 5],
                                triggers: true,
                                error:    null,
                                traces:   []
                            }, {
                                id:       6,
                                parent:   4,
                                start:    5,
                                end:      6,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message<Guard2>",
                                params:   ["test", 5],
                                triggers: true,
                                error:    null,
                                traces:   []
                            }, {
                                id:       7,
                                parent:   4,
                                start:    7,
                                end:      10,
                                guards:   1,
                                locked:   true,
                                name:     "Test::init",
                                params:   ["test"],
                                triggers: false,
                                error:    null,
                                traces:   [{
                                    id:       8,
                                    parent:   7,
                                    start:    8,
                                    end:      9,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::init<Guard1>",
                                    params:   ["test"],
                                    triggers: true,
                                    error:    null,
                                    traces:   []
                                }]
                            }]
                        }]
                    }]);

                    done();
                } catch(e) {
                    done(e);
                }
            });
    });

    it("applies triggers", function() {
        const unit = new Test3();
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

        const descr = new Action("Test", "message", unit.__triggers, Test.prototype.message);

        return Action
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
                expect(result.traces.toJS()).to.eql([{
                    id:       3,
                    start:    1,
                    parent:   null,
                    end:      14,
                    guards:   0,
                    locked:   true,
                    name:     "Test::Message</actions/message>",
                    params:   ["test"],
                    triggers: true,
                    error:    null,
                    traces:   [{
                        id:       4,
                        parent:   3,
                        start:    2,
                        end:      13,
                        guards:   0,
                        locked:   true,
                        name:     "Test::message",
                        params:   ["test"],
                        triggers: true,
                        error:    null,
                        traces:   [{
                            id:       5,
                            parent:   4,
                            start:    3,
                            end:      6,
                            guards:   1,
                            locked:   true,
                            name:     "Test::init",
                            params:   ["test"],
                            triggers: false,
                            error:    null,
                            traces:   [{
                                id:       6,
                                parent:   5,
                                start:    4,
                                end:      5,
                                guards:   0,
                                locked:   true,
                                name:     "Test::init<Guard1>",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                traces:   []
                            }]
                        }, {
                            id:       7,
                            parent:   4,
                            start:    7,
                            end:      12,
                            guards:   0,
                            locked:   true,
                            name:     "Test::test",
                            params:   ["test"],
                            triggers: true,
                            traces:   [],
                            error:    null
                        }, {
                            id:       9,
                            parent:   4,
                            start:    9,
                            end:      11,
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
    });

    /* it("creates an Action", function() {
        const triggers = Immutable.Map(TestUnit.triggers)
            .map((x, key) => x.setName(key))
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new Trigger(key, y))), Immutable.List()); // eslint-disable-line

        const descr = new Action("Test", "message", triggers, function(message) {
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

