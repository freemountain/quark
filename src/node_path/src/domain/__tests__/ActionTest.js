import Action from "../Action";
import { expect } from "chai";
import TestUnit from "../../__tests__/mocks/TestUnit";
import Immutable from "immutable";
import Trigger from "../Trigger";
import DeclaredAction from "../DeclaredAction";
import Runtime from "../../Runtime";
import Message from "../../Message";
import Internals from "../Internals";
import Uuid from "../../util/Uuid";
import sinon from "sinon";
import { schedule } from "../../Runloop";

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
                .or(() => false)
            .if(name => typeof name === "string" && name.indexOf("test") !== -1)
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
        test2: triggered.by("message"),
        test3: triggered.by("message.done"),
        test4: triggered.by("message.done"),
        test5: triggered.by("message.error"),
        test6: triggered.by("message.error"),
        test7: triggered.by("message"),
        test8: triggered.by("message")
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
        return this
            .set("test2", "test2")
            .set("test21", "test21");
    }

    test3() {
        return this
            .set("test3", "test3")
            .set("test21", "test3");
    }

    test4() {}

    test7() {
        return schedule(() => this.set("test7", "test7"), 20);
    }

    test8() {
        return schedule(() => undefined, 20); // eslint-disable-line
    }
}

class Test4 extends Runtime {
    static triggers = {
        test: triggered
            .by("message")
            .if((name, x) => x.currentMessage.resource === "/actions/init" ? false : name.indexOf("lulu") === -1),

        test2:      triggered.by("test"),
        test3:      triggered.by("test"),
        test4:      triggered.by("testError.done"),
        test4Error: triggered.by("test4.error"),
        testError:  triggered.by("test.error"),
        test2Error: triggered.by("test2.error")
    }

    static props = {
        test:  null,
        test2: null,
        test4: null
    }

    test(name) {
        if(name === "test") throw new Error("an error");
        return this.set("test", name);
    }

    test2() {
        return new Error("an error2");
    }

    test3() {
        return Promise.reject(new Error("an error3"));
    }

    test4() {
        return Promise.resolve(new Error("an error4"));
    }

    test4Error() {
        return this.set("test4", new Error("an error4"));
    }

    testError(e) {
        return this.set("test", e);
    }

    test2Error(e) {
        return this.set("test2", e);
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

    it("applies an action", function() {
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

        return unit.ready()
            .then(() => descr.applyAction(descr.triggers.first(), cursor, message.setCursor(cursor)))
            .then(x => { // eslint-disable-line
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
                    id:       4,
                    parent:   null,
                    start:    2,
                    end:      12,
                    guards:   0,
                    locked:   true,
                    name:     "Test::Message</actions/test>",
                    params:   ["test"],
                    triggers: true,
                    error:    null,
                    trigger:  null,
                    traces:   [{
                        id:       5,
                        parent:   4,
                        start:    3,
                        end:      11,
                        guards:   0,
                        locked:   true,
                        name:     "Test::message",
                        params:   ["test"],
                        triggers: true,
                        error:    null,
                        traces:   [],
                        trigger:  null
                    }]
                }]);
            });
    });

    it("calls an action handler", function() {
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

        return unit.ready().then(y => y.message.call(cursor, message.setCursor(cursor)))
            .then(x => {
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
                    id:       4,
                    parent:   null,
                    start:    2,
                    end:      20,
                    guards:   0,
                    locked:   true,
                    name:     "Test::Message</actions/test>",
                    params:   ["test"],
                    triggers: true,
                    error:    null,
                    trigger:  null,
                    traces:   [{
                        id:       8,
                        parent:   4,
                        start:    10,
                        end:      19,
                        guards:   2,
                        locked:   true,
                        name:     "Test::message",
                        params:   ["test", 5],
                        triggers: true,
                        error:    null,
                        trigger:  null,
                        traces:   [{
                            id:       9,
                            parent:   8,
                            start:    11,
                            end:      12,
                            guards:   0,
                            locked:   true,
                            name:     "Test::message<Guard1>",
                            params:   ["test", 5],
                            triggers: true,
                            error:    null,
                            trigger:  "guard",
                            traces:   []
                        }, {
                            id:       10,
                            parent:   8,
                            start:    13,
                            end:      14,
                            guards:   0,
                            locked:   true,
                            name:     "Test::message<Guard2>",
                            params:   ["test", 5],
                            triggers: true,
                            error:    null,
                            trigger:  "guard",
                            traces:   []
                        }, {
                            id:       11,
                            parent:   8,
                            start:    15,
                            end:      18,
                            guards:   1,
                            locked:   true,
                            name:     "Test::init",
                            params:   ["test"],
                            triggers: false,
                            error:    null,
                            trigger:  "before",
                            traces:   [{
                                id:       12,
                                parent:   11,
                                start:    16,
                                end:      17,
                                guards:   0,
                                locked:   true,
                                name:     "Test::init<Guard1>",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  "guard",
                                traces:   []
                            }]
                        }]
                    }]
                }]);
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
        const cursor   = new unit.__Cursor(data);

        const descr = new Action("Test", "message", unit.__triggers, Test.prototype.message);

        expect(descr.toJS()).to.eql({
            unit:   "Test",
            name:   "message",
            before: [{
                emits:  "test2",
                delay:  0,
                guards: 0,
                params: [],
                action: "message"
            }, {
                emits:  "test7",
                delay:  0,
                guards: 0,
                params: [],
                action: "message"
            }, {
                emits:  "test8",
                delay:  0,
                guards: 0,
                params: [],
                action: "message"
            }, {
                emits:  "init",
                delay:  0,
                guards: 1,
                params: [],
                action: "message"
            }, {
                emits:  "test",
                delay:  0,
                guards: 0,
                params: [],
                action: "message"
            }],
            triggers: [{
                emits:  "message",
                delay:  0,
                guards: 0,
                params: [],
                action: "message"
            }],
            cancel:   [],
            progress: [],
            done:     [{
                emits:  "test3",
                delay:  0,
                guards: 0,
                params: [],
                action: "message.done"
            }, {
                emits:  "test4",
                delay:  0,
                guards: 0,
                params: [],
                action: "message.done"
            }],
            error: [{
                emits:  "test5",
                delay:  0,
                guards: 0,
                params: [],
                action: "message.error"
            }, {
                emits:  "test6",
                delay:  0,
                guards: 0,
                params: [],
                action: "message.error"
            }]
        });

        expect(unit.actions()).to.eql({
            init: {
                unit:     "Test3",
                name:     "init",
                before:   [],
                triggers: [{
                    emits:  "init",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "init"
                }, {
                    emits:  "init",
                    delay:  0,
                    guards: 1,
                    params: [],
                    action: "message"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            message: {
                unit:   "Test3",
                name:   "message",
                before: [{
                    emits:  "test2",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }, {
                    emits:  "test7",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }, {
                    emits:  "test8",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }, {
                    emits:  "init",
                    delay:  0,
                    guards: 1,
                    params: [],
                    action: "message"
                }, {
                    emits:  "test",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                triggers: [{
                    emits:  "message",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                cancel:   [],
                progress: [],
                done:     [{
                    emits:  "test3",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.done"
                }, {
                    emits:  "test4",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.done"
                }],
                error: [{
                    emits:  "test5",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.error"
                }, {
                    emits:  "test6",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.error"
                }]
            },
            test: {
                unit:     "Test3",
                name:     "test",
                before:   [],
                triggers: [{
                    emits:  "test",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test"
                }, {
                    emits:  "test",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            test2: {
                unit:     "Test3",
                name:     "test2",
                before:   [],
                triggers: [{
                    emits:  "test2",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test2"
                }, {
                    emits:  "test2",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            test3: {
                unit:     "Test3",
                name:     "test3",
                before:   [],
                triggers: [{
                    emits:  "test3",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test3"
                }, {
                    emits:  "test3",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.done"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            test4: {
                unit:     "Test3",
                name:     "test4",
                before:   [],
                triggers: [{
                    emits:  "test4",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test4"
                }, {
                    emits:  "test4",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.done"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            test5: {
                unit:     "Test3",
                name:     "test5",
                before:   [],
                triggers: [{
                    emits:  "test5",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test5"
                }, {
                    emits:  "test5",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.error"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            test6: {
                unit:     "Test3",
                name:     "test6",
                before:   [],
                triggers: [{
                    emits:  "test6",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test6"
                }, {
                    emits:  "test6",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message.error"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },

            test7: {
                unit:     "Test3",
                name:     "test7",
                before:   [],
                triggers: [{
                    emits:  "test7",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test7"
                }, {
                    emits:  "test7",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },

            test8: {
                unit:     "Test3",
                name:     "test8",
                before:   [],
                triggers: [{
                    emits:  "test8",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test8"
                }, {
                    emits:  "test8",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            }
        });

        return unit.ready()
            .then(() => {
                const cursor2 = cursor.update("_unit", internals => internals.messageReceived(message))
                    .trace("message", message.get("payload"))
                    .trace.triggered();

                return descr.applyBefore(cursor2, message.setCursor(cursor))
                    .then(x => {
                        const result = x
                            .trace.end()
                            .messageProcessed();

                        const cursor3 = cursor2
                            .trace.triggered()
                            .trace.end()
                            .messageProcessed()
                            .filter((_, key) => key !== "_unit") // eslint-disable-line
                            .set("test1", "test1")
                            .set("test21", "test21")
                            .set("test2", "test2")
                            .set("test7", "test7");

                        const filtered = result
                            .filter((_, key) => key !== "_unit"); // eslint-disable-line

                        expect(filtered.toJS()).to.eql(cursor3.toJS());
                        expect(result.traces.toJS()).to.eql([{
                            id:       13,
                            start:    21,
                            parent:   null,
                            end:      36,
                            guards:   0,
                            locked:   true,
                            name:     "Test::Message</actions/message>",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            trigger:  null,
                            traces:   [{
                                id:       14,
                                parent:   13,
                                start:    22,
                                end:      35,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  null,
                                traces:   [{
                                    id:       15,
                                    parent:   14,
                                    start:    23,
                                    end:      31,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test2",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       16,
                                    parent:   14,
                                    start:    24,
                                    end:      33,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test7",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       17,
                                    parent:   14,
                                    start:    25,
                                    end:      34,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test8",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       18,
                                    parent:   14,
                                    start:    26,
                                    end:      29,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::init",
                                    params:   ["test"],
                                    triggers: false,
                                    error:    null,
                                    trigger:  "before",
                                    traces:   [{
                                        id:       19,
                                        parent:   18,
                                        start:    27,
                                        end:      28,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::init<Guard1>",
                                        params:   ["test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "guard",
                                        traces:   []
                                    }]
                                }, {
                                    id:       20,
                                    parent:   14,
                                    start:    30,
                                    end:      32,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }]
                            }]
                        }]);
                    });
            });
    });

    it("calls a complex action", function() {
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
        const cursor   = new unit.__Cursor(data);

        return unit.ready()
            .then(x => {
                const cursor2 = cursor.update("_unit", internals => internals.messageReceived(message));

                return x.message.call(cursor2, message.setCursor(cursor))
                    .then(y => {
                        const result  = y.messageProcessed();
                        const cursor3 = cursor2
                            .trace("message", message.get("payload"))
                            .trace.triggered()
                            .trace.end()
                            .messageProcessed()
                            .filter((_, key) => key !== "_unit") // eslint-disable-line
                            .set("name", "test")
                            .set("test1", "test1")
                            .set("test2", "test2")
                            .set("test21", "test3")
                            .set("test3", "test3")
                            .set("test7", "test7");

                        const filtered = result
                            .filter((_, key) => key !== "_unit"); // eslint-disable-line

                        expect(filtered.toJS()).to.eql(cursor3.toJS());
                        expect(result.traces.toJS()).to.eql([{
                            id:       13,
                            start:    21,
                            parent:   null,
                            end:      40,
                            guards:   0,
                            locked:   true,
                            name:     "Test::Message</actions/message>",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            trigger:  null,
                            traces:   [{
                                id:       14,
                                parent:   13,
                                start:    22,
                                end:      39,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  null,
                                traces:   [{
                                    id:       15,
                                    parent:   14,
                                    start:    23,
                                    end:      31,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test2",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       16,
                                    parent:   14,
                                    start:    24,
                                    end:      33,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test7",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       17,
                                    parent:   14,
                                    start:    25,
                                    end:      34,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test8",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       18,
                                    parent:   14,
                                    start:    26,
                                    end:      29,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::init",
                                    params:   ["test"],
                                    triggers: false,
                                    error:    null,
                                    trigger:  "before",
                                    traces:   [{
                                        id:       19,
                                        parent:   18,
                                        start:    27,
                                        end:      28,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::init<Guard1>",
                                        params:   ["test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "guard",
                                        traces:   []
                                    }]
                                }, {
                                    id:       20,
                                    parent:   14,
                                    start:    30,
                                    end:      32,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       21,
                                    parent:   14,
                                    start:    35,
                                    end:      37,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test3",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "done",
                                    error:    null
                                }, {
                                    id:       22,
                                    parent:   14,
                                    start:    36,
                                    end:      38,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test4",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "done",
                                    error:    null
                                }]
                            }]
                        }]);
                    });
            });
    });

    it("calls a simple action with error (throw)", function() {
        const unit = new Test4();
        const data = Immutable.Map({
            test:  "jupp",
            _unit: new Internals({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/message", ["test"]));
        const cursor   = new unit.__Cursor(data);

        return unit.ready()
            .then(x => {
                const cursor2 = cursor.update("_unit", internals => internals.messageReceived(message));

                return x.message.call(cursor2, message.setCursor(cursor))
                    .then(y => {
                        const result  = y.messageProcessed();
                        const cursor3 = cursor2
                            .trace("message", message.get("payload"))
                            .trace.triggered()
                            .trace.end()
                            .messageProcessed()
                            .set("test", new Error("an error"))
                            .set("test2", new Error("an error2"))
                            .set("test4", new Error("an error4"))
                            .filter((_, key) => key !== "_unit") // eslint-disable-line

                        const filtered = result
                            .filter((_, key) => key !== "_unit"); // eslint-disable-line

                        expect(filtered.toJS()).to.eql(cursor3.toJS());
                        expect(y.hasErrored).to.equal(true, "cursor should have errored");
                        expect(y.errors.toJS()).to.eql([
                            new Error("an error3"),
                            new Error("an error2"),
                            new Error("an error4"),
                            new Error("an error")
                        ]);

                        expect(result.traces.toJS()).to.eql([{
                            id:       9,
                            start:    13,
                            parent:   null,
                            end:      36,
                            guards:   0,
                            locked:   true,
                            name:     "Test::Message</actions/message>",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            trigger:  null,
                            traces:   [{
                                id:       10,
                                parent:   9,
                                start:    14,
                                end:      35,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  null,
                                traces:   [{
                                    id:       11,
                                    parent:   10,
                                    start:    15,
                                    end:      18,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::init",
                                    params:   ["test"],
                                    triggers: false,
                                    error:    null,
                                    trigger:  "before",
                                    traces:   [{
                                        id:       12,
                                        parent:   11,
                                        start:    16,
                                        end:      17,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::init<Guard1>",
                                        params:   ["test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "guard",
                                        traces:   []
                                    }]
                                }, {
                                    id:       13,
                                    parent:   10,
                                    start:    19,
                                    end:      34,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::test",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [{
                                        id:       14,
                                        parent:   13,
                                        start:    20,
                                        end:      21,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test<Guard1>",
                                        params:   ["test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "guard",
                                        traces:   []
                                    }, {
                                        id:       15,
                                        parent:   13,
                                        start:    22,
                                        end:      27,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test2",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [{
                                            id:       17,
                                            parent:   15,
                                            start:    24,
                                            end:      26,
                                            guards:   0,
                                            locked:   true,
                                            name:     "Test::test2Error",
                                            params:   [new Error("an error2"), "test"],
                                            triggers: true,
                                            error:    null,
                                            trigger:  "error",
                                            traces:   []
                                        }],
                                        trigger: "before",
                                        error:   new Error("an error2")
                                    }, {
                                        id:       16,
                                        parent:   13,
                                        start:    23,
                                        end:      25,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test3",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    new Error("an error3")
                                    }, {
                                        id:       18,
                                        parent:   13,
                                        start:    28,
                                        end:      33,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::testError",
                                        params:   [new Error("an error"), "test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "error",
                                        traces:   [{
                                            id:       19,
                                            parent:   18,
                                            start:    29,
                                            end:      32,
                                            guards:   0,
                                            locked:   true,
                                            name:     "Test::test4",
                                            params:   [new Error("an error"), "test"],
                                            triggers: true,
                                            error:    new Error("an error4"),
                                            trigger:  "done",
                                            traces:   [{
                                                id:       20,
                                                parent:   19,
                                                start:    30,
                                                end:      31,
                                                guards:   0,
                                                locked:   true,
                                                name:     "Test::test4Error",
                                                params:   [new Error("an error4"), new Error("an error"), "test"],
                                                triggers: true,
                                                error:    null,
                                                trigger:  "error",
                                                traces:   []
                                            }]
                                        }]
                                    }],
                                    trigger: "before",
                                    error:   new Error("an error")
                                }]
                            }]
                        }]);
                    });
            });
    });

    it("creates an Action", function() {
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
                action: "message",
                emits:  "action",
                delay:  0,
                guards: 1,
                params: []
            }, {
                action: "message",
                emits:  "children",
                delay:  0,
                guards: 1,
                params: []
            }, {
                action: "message",
                emits:  "diffs",
                delay:  0,
                guards: 1,
                params: []
            }],
            triggers: [{
                action: "message",
                emits:  "message",
                delay:  0,
                guards: 0,
                params: []
            }],
            cancel:   [],
            progress: [],
            done:     [{
                action: "message.done",
                emits:  "props",
                delay:  0,
                guards: 0,
                params: []
            }],
            error: []
        });
    });
});

