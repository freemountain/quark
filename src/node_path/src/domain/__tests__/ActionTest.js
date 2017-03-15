// @flow

import Action from "../Action";
import { expect } from "chai";
import TestUnit from "../../__tests__/mocks/TestUnit";
import { Map, List } from "immutable";
import Trigger from "../Trigger";
import DeclaredAction from "../DeclaredAction";
import Runtime from "../../Runtime";
import Message from "../../Message";
import UnitState from "../UnitState";
import Uuid from "../../util/Uuid";
import sinon from "sinon";
import { schedule } from "../../Runloop";
import GuardError from "../error/GuardError";
import UnknownMessageError from "../error/UnknownMessageError";
import PendingAction from "../PendingAction";

const triggered = DeclaredAction.triggered;

class Test extends Runtime {
    static props = {
        name: "jupp"
    };

    message3(name) {
        return this.set("name", name);
    }
}

class Test2 extends Runtime {
    static triggers = {
        message3: triggered
            .if(() => true)
                .or(() => false)
            .if(name => typeof name === "string" && name.indexOf("test") !== -1)
            .with(5)
            .after(20)
    }

    static props = {
        name:  "jupp",
        value: 3
    };

    message3(name, value) {
        return this
            .set("value", value)
            .set("name", name);
    }
}

class Test3 extends Runtime {
    static triggers = {
        message3: triggered.by("message"),
        test:     triggered.by("message3.before"),
        test2:    triggered.by("message3.before"),
        test3:    triggered.by("message3"),
        test4:    triggered.by("message3"),
        test5:    triggered.by("message3.error"),
        test6:    triggered.by("message3.error"),
        test7:    triggered.by("message3.before"),
        test8:    triggered.by("message3.before"),
        test9:    triggered.by("message3.before")
    };

    static props = {
        name: "jupp"
    };

    message3(name) {
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
            .by("message.before")
            .if((name, x) => {
                return typeof name !== "string" || x.message.resource === "/actions/init" ? false : name.indexOf("lulu") === -1;
            }),

        test2: triggered.by("test.before"),
        test3: triggered.by("test.before"),
        test4: triggered.by("testError"),
        test5: triggered
            .by("test.before")
            .if(() => true)
            .if(() => {
                throw new Error("an error6");
            })
            .if(() => true),

        test6: triggered
            .by("testError")
            .if(() => {
                throw new Error("an error7");
            }),

        test7: triggered
            .by("test4.error")
            .if(() => {
                throw new Error("an error8");
            }),

        test4Error:       triggered.by("test4.error"),
        test4Error2:      triggered.by("test4.error"),
        test4Error3:      triggered.by("test4.error"),
        test4Error3Error: triggered.by("test4Error3.error"),
        testError:        triggered.by("test.error"),
        test2Error:       triggered.by("test2.error")
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

    test4Error(e) {
        return this.set("test4", e);
    }

    test4Error2() {
        return this.set("test42", "lulu");
    }

    test4Error3() {
        throw new Error("an error5");
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
        const triggers = Map(Test2.triggers)
            .map((x, key) => x.setName(key))
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new Trigger(key, y))), List()); // eslint-disable-line

        const descr = new Action("Test", "message3", triggers, function(name, value) {
            return this
                .set("value", value)
                .set("name", name);
        });

        expect(descr.toJS()).to.eql({
            unit:     "Test",
            name:     "message3",
            before:   [],
            triggers: [{
                emits:  "message3",
                delay:  20,
                guards: 2,
                params: [5],
                action: "message3"
            }],
            cancel:   [],
            progress: [],
            done:     [],
            error:    []
        });
    });

    it("applies an action", function() {
        const unit = new Test();

        const message = (new Message("/actions/test", List.of("test")));
        const descr   = new Action("Test", "test", unit.__triggers, function(name) {
            return this.set("name", name);
        });

        const data = Map({
            name:  "jupp",
            _unit: new UnitState({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const cursor = (new unit.__Cursor(data))._unit
            .messageReceived(message)
            .debug.trace("message", message.get("payload"))
            .debug.trace.triggered()
            .update("_unit", internals => internals.set("action", new PendingAction({
                message:     message,
                state:       "triggers",
                description: descr,
                trigger:     descr.triggers.first()
            })));

        return unit.ready()
            .then(() => unit.handle.call(cursor, message.setCursor(cursor)))
            .then(x => { // eslint-disable-line
                const result  = x
                    .debug.trace.ended()
                    ._unit.messageProcessed();

                const cursor2 = cursor
                    .debug.trace.ended()
                    ._unit.messageProcessed()
                    .set("name", "test")
                    .filter((_, key) => key !== "_unit"); // eslint-disable-line

                const filtered = result
                    .filter((_, key) => key !== "_unit"); // eslint-disable-line

                expect(filtered.toJS()).to.eql(cursor2.toJS());
                expect(result.debug.traces.toJS()).to.eql([{
                    id:       4,
                    parent:   null,
                    start:    2,
                    end:      6,
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
                        end:      5,
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

    it("applies an action with typeerror triggered by wrong message", function() {
        const unit = new Test();
        const data = Map({
            name:  "jupp",
            _unit: new UnitState({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/test", List.of("test")));
        const cursor   = (new unit.__Cursor(data))._unit
            .messageReceived(message)
            .debug.trace("message", message.get("payload"))
            .debug.trace.triggered()
            .update("_unit", internals => internals.update("action", action => action.set("message", null)));

        const descr = new Action("Test", "test", unit.__triggers, function(name) {
            return this.set("name", name);
        });

        return unit.ready()
            .then(() => descr.func.call(cursor, "huhu"))
            .then(x => { // eslint-disable-line
                const result = x
                    .debug.trace.ended()
                    ._unit.messageProcessed();

                const cursor2 = cursor
                        .debug.trace.ended()
                        ._unit.messageProcessed()
                        .filter((_, key) => key !== "_unit"); // eslint-disable-line

                const filtered = result
                    .filter((_, key) => key !== "_unit"); // eslint-disable-line

                expect(filtered.toJS()).to.eql(cursor2.toJS());
                expect(x.action.state.errors.toJS()).to.eql([new UnknownMessageError("Test", "test", "huhu")]);
                expect(result.debug.traces.toJS()).to.eql([{
                    id:       4,
                    parent:   null,
                    start:    2,
                    end:      8,
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
                        end:      7,
                        guards:   0,
                        locked:   true,
                        name:     "Test::message",
                        params:   ["test"],
                        triggers: true,
                        error:    null,
                        traces:   [{
                            id:       6,
                            parent:   5,
                            start:    5,
                            end:      6,
                            guards:   0,
                            locked:   true,
                            name:     "Test::test",
                            params:   [],
                            triggers: false,
                            error:    new UnknownMessageError("Test", "test", ""),
                            traces:   [],
                            trigger:  "before"
                        }],
                        trigger: null
                    }]
                }]);
            });
    });

    it("calls an action handler", function() {
        const unit = new Test2();
        const data = Map({
            name:  "jupp",
            _unit: new UnitState({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/test", List.of("test")));
        const cursor   = (new unit.__Cursor(data))._unit
            .messageReceived(message);

        return unit.ready().then(y => y.message3.call(cursor, message))
            .then(x => {
                const result  = x._unit.messageProcessed();
                const cursor2 = cursor
                    .debug.trace("message", message.get("payload"))
                    .debug.trace.triggered()
                    .debug.trace.ended()
                    ._unit.messageProcessed()
                    .set("name", "test")
                    .set("value", 5)
                    .filter((_, key) => key !== "_unit"); // eslint-disable-line

                const filtered = result
                    .filter((_, key) => key !== "_unit"); // eslint-disable-line

                expect(cursor.action.state.errors.toJS()).to.eql([]);
                expect(filtered.toJS()).to.eql(cursor2.toJS());
                expect(result.debug.traces.toJS()).to.eql([{
                    id:       4,
                    parent:   null,
                    start:    2,
                    end:      10,
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
                        start:    4,
                        end:      9,
                        guards:   2,
                        locked:   true,
                        name:     "Test::message3",
                        params:   ["test", 5],
                        triggers: true,
                        error:    null,
                        trigger:  "before",
                        traces:   [{
                            id:       6,
                            parent:   5,
                            start:    5,
                            end:      6,
                            guards:   0,
                            locked:   true,
                            name:     "Test::message3<Guard1>",
                            params:   ["test", 5],
                            triggers: true,
                            error:    null,
                            trigger:  "guard",
                            traces:   []
                        }, {
                            id:       7,
                            parent:   5,
                            start:    7,
                            end:      8,
                            guards:   0,
                            locked:   true,
                            name:     "Test::message3<Guard2>",
                            params:   ["test", 5],
                            triggers: true,
                            error:    null,
                            trigger:  "guard",
                            traces:   []
                        }]
                    }]
                }]);
            });
    });

    it("applies triggers", function() {
        const unit = new Test3();
        const data = Map({
            name:  "jupp",
            _unit: new UnitState({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/message3", List.of("test")));
        const cursor   = new unit.__Cursor(data);
        const descr    = new Action("Test", "message3", unit.__triggers, Test.prototype.message3);

        expect(descr.toJS()).to.eql({
            unit:   "Test",
            name:   "message3",
            before: [{
                emits:  "test2",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.before"
            }, {
                emits:  "test7",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.before"
            }, {
                emits:  "test8",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.before"
            }, {
                emits:  "test9",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.before"
            }, {
                emits:  "test",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.before"
            }],
            triggers: [{
                emits:  "message3",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3"
            }, {
                emits:  "message3",
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
                action: "message3"
            }, {
                emits:  "test4",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3"
            }],
            error: [{
                emits:  "test5",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.error"
            }, {
                emits:  "test6",
                delay:  0,
                guards: 0,
                params: [],
                action: "message3.error"
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
                    action: "message.before"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            diff: {
                unit:     "Test3",
                name:     "diff",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "diff",
                    guards: 0,
                    params: [],
                    action: "diff"
                }]
            },
            receive: {
                unit:     "Test3",
                name:     "receive",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "receive",
                    guards: 0,
                    params: [],
                    action: "receive"
                }]
            },
            finish: {
                unit:     "Test3",
                name:     "finish",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "finish",
                    guards: 0,
                    params: [],
                    action: "finish"
                }]
            },
            message: {
                unit:   "Test3",
                name:   "message",
                before: [{
                    delay:  0,
                    emits:  "init",
                    guards: 1,
                    params: [],
                    action: "message.before"
                }],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [{
                    delay:  0,
                    emits:  "message3",
                    guards: 0,
                    params: [],
                    action: "message"
                }],
                triggers: [{
                    delay:  0,
                    emits:  "message",
                    guards: 0,
                    params: [],
                    action: "message"
                }]
            },
            message3: {
                unit:   "Test3",
                name:   "message3",
                before: [{
                    emits:  "test2",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.before"
                }, {
                    emits:  "test7",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.before"
                }, {
                    emits:  "test8",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.before"
                }, {
                    emits:  "test9",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.before"
                }, {
                    emits:  "test",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.before"
                }],
                triggers: [{
                    emits:  "message3",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3"
                }, {
                    delay:  0,
                    emits:  "message3",
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
                    action: "message3"
                }, {
                    emits:  "test4",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3"
                }],
                error: [{
                    emits:  "test5",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.error"
                }, {
                    emits:  "test6",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.error"
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
                    action: "message3.before"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            after: {
                unit:     "Test3",
                name:     "after",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "after",
                    guards: 0,
                    params: [],
                    action: "after"
                }]
            },
            before: {
                unit:     "Test3",
                name:     "before",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "before",
                    guards: 0,
                    params: [],
                    action: "before"
                }]
            },
            triggers: {
                unit:     "Test3",
                name:     "triggers",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "triggers",
                    guards: 0,
                    params: [],
                    action: "triggers"
                }]
            },
            done: {
                unit:     "Test3",
                name:     "done",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "done",
                    guards: 0,
                    params: [],
                    action: "done"
                }]
            },
            error: {
                unit:     "Test3",
                name:     "error",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "error",
                    guards: 0,
                    params: [],
                    action: "error"
                }]
            },
            guards: {
                unit:     "Test3",
                name:     "guards",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "guards",
                    guards: 0,
                    params: [],
                    action: "guards"
                }]
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
                    action: "message3.before"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },
            handle: {
                unit:     "Test3",
                name:     "handle",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "handle",
                    guards: 0,
                    params: [],
                    action: "handle"
                }]
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
                    action: "message3"
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
                    action: "message3"
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
                    action: "message3.error"
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
                    action: "message3.error"
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
                    action: "message3.before"
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
                    action: "message3.before"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            },

            test9: {
                unit:     "Test3",
                name:     "test9",
                before:   [],
                triggers: [{
                    emits:  "test9",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "test9"
                }, {
                    emits:  "test9",
                    delay:  0,
                    guards: 0,
                    params: [],
                    action: "message3.before"
                }],
                cancel:   [],
                progress: [],
                done:     [],
                error:    []
            }
        });

        return unit.ready()
            .then(() => {
                const cursor2 = cursor._unit
                    .messageReceived(message)
                    .update("_unit", x => x.set("action", new PendingAction({ message: x.action.message, description: descr })))
                    .debug.trace("message", message.get("payload"))
                    .debug.trace.triggered();

                return unit.triggers.call(cursor2)
                    .then(x => {
                        const result = x
                            .debug.trace.ended()
                            ._unit.messageProcessed();

                        const cursor3 = cursor2
                            .debug.trace.triggered()
                            .debug.trace.ended()
                            ._unit.messageProcessed()
                            .filter((_, key) => key !== "_unit") // eslint-disable-line
                            .set("test1", "test1")
                            .set("test21", "test21")
                            .set("test2", "test2")
                            .set("test7", "test7");

                        const filtered = result
                            .filter((_, key) => key !== "_unit"); // eslint-disable-line

                        expect(filtered.toJS()).to.eql(cursor3.toJS());
                        expect(result.debug.traces.toJS()).to.eql([{
                            id:       4,
                            start:    3,
                            parent:   null,
                            end:      16,
                            guards:   0,
                            locked:   true,
                            name:     "Test::Message</actions/message3>",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            trigger:  null,
                            traces:   [{
                                id:       5,
                                parent:   4,
                                start:    4,
                                end:      15,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  null,
                                traces:   [{
                                    id:       6,
                                    parent:   5,
                                    start:    5,
                                    end:      10,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test2",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       7,
                                    parent:   5,
                                    start:    6,
                                    end:      13,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test7",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       8,
                                    parent:   5,
                                    start:    7,
                                    end:      14,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test8",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       9,
                                    parent:   5,
                                    start:    8,
                                    end:      12,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::test9",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [],
                                    trigger:  "before",
                                    error:    null
                                }, {
                                    id:       10,
                                    parent:   5,
                                    start:    9,
                                    end:      11,
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
        const data = Map({
            name:  "jupp",
            _unit: new UnitState({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const cursor  = new unit.__Cursor(data);
        const message = new Message("/actions/message3", List.of("test"));

        return unit.ready()
            .then(x => {
                const description = cursor._unit.description.get("message");
                const cursor2     = cursor._unit
                    .messageReceived(message)
                    .update("_unit", y => y.set("action", new PendingAction({
                        message:     y.action.message,
                        description: description
                    })));

                return x.message.call(cursor2, new Message("/actions/message2", List.of(description, message)))
                    .then(y => {
                        const result  = y._unit.messageProcessed();
                        const cursor3 = cursor2
                            .debug.trace("message", message.get("payload"))
                            .debug.trace.triggered()
                            .debug.trace.ended()
                            ._unit.messageProcessed()
                            .filter((_, key) => key !== "_unit") // eslint-disable-line
                            .set("name", "test")
                            .set("test1", "test1")
                            .set("test2", "test2")
                            .set("test21", "test3")
                            .set("test3", "test3")
                            .set("test7", "test7");

                        const filtered = result
                            .filter((_, key) => key !== "_unit"); // eslint-disable-line

                        expect(y._unit.action.state.errors.toJS()).to.eql([]);
                        expect(filtered.toJS()).to.eql(cursor3.toJS());
                        expect(result.debug.traces.toJS()).to.eql([{
                            id:       4,
                            start:    3,
                            parent:   null,
                            end:      26,
                            guards:   0,
                            locked:   true,
                            name:     "Test::Message</actions/message3>",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            trigger:  null,
                            traces:   [{
                                id:       5,
                                parent:   4,
                                start:    4,
                                end:      25,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  null,
                                traces:   [{
                                    id:       6,
                                    parent:   5,
                                    start:    5,
                                    end:      8,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::init",
                                    params:   ["test"],
                                    triggers: false,
                                    error:    null,
                                    trigger:  "before",
                                    traces:   [{
                                        id:       7,
                                        parent:   6,
                                        start:    6,
                                        end:      7,
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
                                    id:       8,
                                    parent:   5,
                                    start:    9,
                                    end:      24,
                                    guards:   0,
                                    locked:   true,
                                    name:     "Test::message3",
                                    params:   ["test"],
                                    triggers: true,
                                    error:    null,
                                    trigger:  "done",
                                    traces:   [{
                                        id:       9,
                                        parent:   8,
                                        start:    10,
                                        end:      15,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test2",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    null
                                    }, {
                                        id:       10,
                                        parent:   8,
                                        start:    11,
                                        end:      18,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test7",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    null
                                    }, {
                                        id:       11,
                                        parent:   8,
                                        start:    12,
                                        end:      19,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test8",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    null
                                    }, {
                                        id:       12,
                                        parent:   8,
                                        start:    13,
                                        end:      17,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test9",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    null
                                    }, {
                                        id:       13,
                                        parent:   8,
                                        start:    14,
                                        end:      16,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    null
                                    }, {
                                        id:       14,
                                        parent:   8,
                                        start:    20,
                                        end:      22,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test3",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "done",
                                        error:    null
                                    }, {
                                        id:       15,
                                        parent:   8,
                                        start:    21,
                                        end:      23,
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
                            }]
                        }]);
                    });
            });
    });

    it("calls a simple action with error (throw)", function() {
        const unit = new Test4();
        const data = Map({
            test:  "jupp",
            _unit: new UnitState({
                id:          "blub",
                name:        "Test",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/message", List.of("test")));
        const cursor   = new unit.__Cursor(data);

        return unit.ready()
            .then(x => {
                const description = cursor._unit.description.get("message");
                const cursor2     = cursor._unit.messageReceived(message);

                return x.message.call(cursor2, new Message("/actions/message2", List.of(description, message)))
                    .then(y => {
                        const result  = y._unit.messageProcessed();
                        const cursor3 = cursor2
                            .debug.trace("message", message.get("payload"))
                            .debug.trace.triggered()
                            .debug.trace.ended()
                            ._unit.messageProcessed()
                            .set("test", new Error("an error"))
                            .set("test2", new Error("an error2"))
                            .set("test4", new Error("an error4"))
                            .set("test42", "lulu")
                            .filter((_, key) => key !== "_unit") // eslint-disable-line

                        const filtered = result
                            .filter((_, key) => key !== "_unit"); // eslint-disable-line

                        expect(filtered.toJS()).to.eql(cursor3.toJS());

                        expect(y.action.state.errors.toJS()).to.eql([
                            new Error("an error2"),
                            new Error("an error3"),
                            new GuardError("Test", "test5", 1, new Error("an error6")),
                            new Error("an error"),
                            new Error("an error4"),
                            new GuardError("Test", "test7", 1, new Error("an error8")),
                            new Error("an error5"),
                            new GuardError("Test", "test6", 1, new Error("an error7"))
                        ]);

                        expect(result.debug.traces.toJS()).to.eql([{
                            id:       4,
                            start:    3,
                            parent:   null,
                            end:      46,
                            guards:   0,
                            locked:   true,
                            name:     "Test::Message</actions/message>",
                            params:   ["test"],
                            triggers: true,
                            error:    null,
                            trigger:  null,
                            traces:   [{
                                id:       5,
                                parent:   4,
                                start:    4,
                                end:      45,
                                guards:   0,
                                locked:   true,
                                name:     "Test::message",
                                params:   ["test"],
                                triggers: true,
                                error:    null,
                                trigger:  null,
                                traces:   [{
                                    id:       6,
                                    parent:   5,
                                    start:    5,
                                    end:      9,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::init",
                                    params:   ["test"],
                                    triggers: false,
                                    error:    null,
                                    trigger:  "before",
                                    traces:   [{
                                        id:       8,
                                        parent:   6,
                                        start:    7,
                                        end:      8,
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
                                    id:       7,
                                    parent:   5,
                                    start:    6,
                                    end:      44,
                                    guards:   1,
                                    locked:   true,
                                    name:     "Test::test",
                                    params:   ["test"],
                                    triggers: true,
                                    traces:   [{
                                        id:       9,
                                        parent:   7,
                                        start:    10,
                                        end:      11,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test<Guard1>",
                                        params:   ["test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "guard",
                                        traces:   []
                                    }, {
                                        id:       10,
                                        parent:   7,
                                        start:    12,
                                        end:      23,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test2",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [{
                                            id:       15,
                                            parent:   10,
                                            start:    20,
                                            end:      22,
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
                                        id:       11,
                                        parent:   7,
                                        start:    13,
                                        end:      21,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::test3",
                                        params:   ["test"],
                                        triggers: true,
                                        traces:   [],
                                        trigger:  "before",
                                        error:    new Error("an error3")
                                    }, {
                                        id:       12,
                                        parent:   7,
                                        start:    14,
                                        end:      19,
                                        guards:   3,
                                        locked:   true,
                                        name:     "Test::test5",
                                        params:   ["test"],
                                        triggers: false,
                                        traces:   [{
                                            id:       13,
                                            parent:   12,
                                            start:    15,
                                            end:      16,
                                            guards:   0,
                                            locked:   true,
                                            name:     "Test::test5<Guard1>",
                                            params:   ["test"],
                                            triggers: true,
                                            error:    null,
                                            trigger:  "guard",
                                            traces:   []
                                        }, {
                                            id:       14,
                                            parent:   12,
                                            start:    17,
                                            end:      18,
                                            guards:   0,
                                            locked:   true,
                                            name:     "Test::test5<Guard2>",
                                            params:   ["test"],
                                            triggers: true,
                                            error:    new GuardError("Test", "test5", 1, new Error("an error6")),
                                            trigger:  "guard",
                                            traces:   []
                                        }],
                                        trigger: "before",
                                        error:   null
                                    }, {
                                        id:       16,
                                        parent:   7,
                                        start:    24,
                                        end:      43,
                                        guards:   0,
                                        locked:   true,
                                        name:     "Test::testError",
                                        params:   [new Error("an error"), "test"],
                                        triggers: true,
                                        error:    null,
                                        trigger:  "error",
                                        traces:   [{
                                            id:       17,
                                            parent:   16,
                                            start:    25,
                                            end:      42,
                                            guards:   0,
                                            locked:   true,
                                            name:     "Test::test4",
                                            params:   [new Error("an error"), "test"],
                                            triggers: true,
                                            error:    new Error("an error4"),
                                            trigger:  "done",
                                            traces:   [{
                                                id:       20,
                                                parent:   17,
                                                start:    30,
                                                end:      36,
                                                guards:   1,
                                                locked:   true,
                                                name:     "Test::test7",
                                                params:   [new Error("an error4"), new Error("an error"), "test"],
                                                triggers: false,
                                                error:    null,
                                                trigger:  "error",
                                                traces:   [{
                                                    id:       24,
                                                    parent:   20,
                                                    start:    34,
                                                    end:      35,
                                                    guards:   0,
                                                    locked:   true,
                                                    name:     "Test::test7<Guard1>",
                                                    params:   [new Error("an error4"), new Error("an error"), "test"],
                                                    triggers: true,
                                                    error:    new GuardError("Test", "test6", 1, new Error("an error8")),
                                                    trigger:  "guard",
                                                    traces:   []
                                                }]
                                            }, {
                                                id:       21,
                                                parent:   17,
                                                start:    31,
                                                end:      38,
                                                guards:   0,
                                                locked:   true,
                                                name:     "Test::test4Error",
                                                params:   [new Error("an error4"), new Error("an error"), "test"],
                                                triggers: true,
                                                error:    null,
                                                trigger:  "error",
                                                traces:   []
                                            }, {
                                                id:       22,
                                                parent:   17,
                                                start:    32,
                                                end:      39,
                                                guards:   0,
                                                locked:   true,
                                                name:     "Test::test4Error2",
                                                params:   [new Error("an error4"), new Error("an error"), "test"],
                                                triggers: true,
                                                error:    null,
                                                trigger:  "error",
                                                traces:   []
                                            }, {
                                                id:       23,
                                                parent:   17,
                                                start:    33,
                                                end:      41,
                                                guards:   0,
                                                locked:   true,
                                                name:     "Test::test4Error3",
                                                params:   [new Error("an error4"), new Error("an error"), "test"],
                                                triggers: true,
                                                error:    new Error("an error5"),
                                                trigger:  "error",
                                                traces:   [{
                                                    id:       25,
                                                    parent:   23,
                                                    start:    37,
                                                    end:      40,
                                                    guards:   0,
                                                    locked:   true,
                                                    name:     "Test::test4Error3Error",
                                                    params:   [new Error("an error5"), new Error("an error4"), new Error("an error"), "test"],
                                                    triggers: true,
                                                    error:    null,
                                                    trigger:  "error",
                                                    traces:   []
                                                }]
                                            }]
                                        }, {
                                            id:       18,
                                            parent:   16,
                                            start:    26,
                                            end:      29,
                                            guards:   1,
                                            locked:   true,
                                            name:     "Test::test6",
                                            params:   [new Error("an error"), "test"],
                                            triggers: false,
                                            error:    null,
                                            trigger:  "done",
                                            traces:   [{
                                                id:       19,
                                                parent:   18,
                                                start:    27,
                                                end:      28,
                                                guards:   0,
                                                locked:   true,
                                                name:     "Test::test6<Guard1>",
                                                params:   [new Error("an error"), "test"],
                                                triggers: true,
                                                error:    new GuardError("Test", "test6", 1, new Error("an error7")),
                                                trigger:  "guard",
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
        const triggers = Map(TestUnit.triggers)
            .map((x, key) => x.setName(key))
            .reduce((dest, x, key) => dest.concat(x.triggers.map(y => new Trigger(key, y))), List()); // eslint-disable-line

        const descr = new Action("Test", "message", triggers, function(message) {
            return this.set("test", message.get("payload"));
        });

        expect(descr.toJS()).to.eql({
            unit:   "Test",
            name:   "message",
            before: [{
                action: "message.before",
                emits:  "action",
                delay:  0,
                guards: 1,
                params: []
            }, {
                action: "message.before",
                emits:  "children",
                delay:  0,
                guards: 1,
                params: []
            }, {
                action: "message.before",
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
                action: "message",
                emits:  "props",
                delay:  0,
                guards: 0,
                params: []
            }],
            error: []
        });
    });
});

