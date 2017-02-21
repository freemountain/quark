import Runtime from "../Runtime";
import { expect } from "chai";
import TestUnit from "./mocks/TestUnit";
import DeclaredAction from "../domain/DeclaredAction";
import DeclaredTrigger from "../domain/DeclaredTrigger";
import { List, Map } from "immutable";
import Uuid from "../util/Uuid";
import sinon from "sinon";
import Internals from "../domain/Internals";
import Message from "../Message";

const triggered = DeclaredAction.triggered;

class Inheritance extends TestUnit {
    static triggers = {
        props: triggered.by("test"),
        blub:  triggered.by("bla")
    };

    static props = {
        name:     "Jupp",
        age:      40,
        loggedIn: false
    };
}

class Inheritance2 extends TestUnit {
    static props = {};

    message(payload: { name: string }) {
        return this.set("name", payload.name);
    }
}

describe("RuntimeTest", function() {
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

    it("extracts all methods from a class instance", function() {
        const methods = Runtime.allActions(new TestUnit());

        expect(methods.keySeq().toJS()).to.eql([
            "message",
            "handle",
            "diffs",
            "guards",
            "init",
            "props",
            "action",
            "after",
            "children",
            "before"
        ]);
    });

    it("extracts all triggers from an instance", function() {
        const triggers = Runtime.allTriggers(new Inheritance());

        expect(triggers.toJS()).to.eql({
            action: {
                name:     "action",
                triggers: [
                    (new DeclaredTrigger("action")).toJS(),
                    (new DeclaredTrigger("message.before", List([() => true]))).toJS()
                ]
            },

            children: {
                name:     "children",
                triggers: [
                    (new DeclaredTrigger("children")).toJS(),
                    (new DeclaredTrigger("message.before", List([() => true]))).toJS()
                ]
            },

            diffs: {
                name:     "diffs",
                triggers: [
                    (new DeclaredTrigger("diffs")).toJS(),
                    (new DeclaredTrigger("message.before", List([() => true]))).toJS()
                ]
            },

            init: {
                name:     "init",
                triggers: [
                    (new DeclaredTrigger("init")).toJS(),
                    (new DeclaredTrigger("message.before", List([() => true]))).toJS()
                ]
            },

            props: {
                name:     "props",
                triggers: [
                    (new DeclaredTrigger("message")).toJS(),
                    (new DeclaredTrigger("props")).toJS(),
                    (new DeclaredTrigger("test")).toJS()
                ]
            },

            blub: {
                name:     "blub",
                triggers: [
                    (new DeclaredTrigger("blub")).toJS(),
                    (new DeclaredTrigger("bla")).toJS()
                ]
            }
        });
    });

    it("creates an extended Runtime and checks the actions", function() {
        const unit = new TestUnit();

        expect(unit.actions()).to.eql({
            message: {
                unit:   "TestUnit",
                name:   "message",
                before: [{
                    emits:  "init",
                    guards: 1,
                    params: [],
                    delay:  0,
                    action: "message.before"
                }, {
                    emits:  "action",
                    guards: 1,
                    params: [],
                    delay:  0,
                    action: "message.before"
                }, {
                    emits:  "children",
                    guards: 1,
                    params: [],
                    delay:  0,
                    action: "message.before"
                }, {
                    emits:  "diffs",
                    guards: 1,
                    params: [],
                    delay:  0,
                    action: "message.before"
                }],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [{
                    emits:  "props",
                    guards: 0,
                    params: [],
                    delay:  0,
                    action: "message"
                }],
                triggers: [{
                    emits:  "message",
                    guards: 0,
                    params: [],
                    delay:  0,
                    action: "message"
                }]
            },

            action: {
                unit:     "TestUnit",
                name:     "action",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "action",
                    guards: 0,
                    params: [],
                    action: "action"
                }, {
                    delay:  0,
                    emits:  "action",
                    guards: 1,
                    params: [],
                    action: "message.before"
                }]
            },

            handle: {
                unit:     "TestUnit",
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

            before: {
                unit:     "TestUnit",
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

            guards: {
                unit:     "TestUnit",
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

            after: {
                unit:     "TestUnit",
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

            children: {
                unit:     "TestUnit",
                name:     "children",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "children",
                    guards: 0,
                    params: [],
                    action: "children"
                }, {
                    delay:  0,
                    emits:  "children",
                    guards: 1,
                    params: [],
                    action: "message.before"
                }]
            },

            diffs: {
                unit:     "TestUnit",
                name:     "diffs",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "diffs",
                    guards: 0,
                    params: [],
                    action: "diffs"
                }, {
                    delay:  0,
                    emits:  "diffs",
                    guards: 1,
                    params: [],
                    action: "message.before"
                }]
            },

            init: {
                unit:     "TestUnit",
                name:     "init",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "init",
                    guards: 0,
                    params: [],
                    action: "init"
                }, {
                    delay:  0,
                    emits:  "init",
                    guards: 1,
                    params: [],
                    action: "message.before"
                }]
            },

            props: {
                unit:     "TestUnit",
                name:     "props",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [],
                triggers: [{
                    delay:  0,
                    emits:  "props",
                    guards: 0,
                    params: [],
                    action: "props"
                }, {
                    delay:  0,
                    emits:  "props",
                    guards: 0,
                    params: [],
                    action: "message"
                }]
            }
        });
    });

    it("it calls some methods", function() {
        const unit = new Inheritance2();

        expect(unit.state()).to.eql(null);

        const data = Map({
            name:  "jupp",
            _unit: new Internals({
                id:          "blub",
                name:        "Inheritance",
                description: unit.__actions
            })
        });

        const message  = (new Message("/actions/init", List([data]))).setCursor(unit.cursor);
        const cursor   = (new unit.__Cursor(data)).update("_unit", internals => internals.messageReceived(message));
        const payload  = List.of(cursor);
        const message2 = message.set("payload", payload);

        expect(message2.get("payload").first()).to.equal(payload.first());

        return unit.message.call(cursor, message2).then(x => {
            expect(x.errors.toJS()).to.eql([]);
            expect(x.filter((_, key) => key !== "_unit").toJS()).to.eql({
                name: "jupp"
            });

        /* expect(x.traces.toJS()).to.eql([{
                end:      null,
                error:    null,
                guards:   0,
                start:    2,
                locked:   false,
                triggers: true,
                params:   [{
                    name: "jupp"
                }],
                traces: [],
                name:   "Inheritance::Message</actions/init>"
            }]);*/
        });
    });

/* it("creates an inherited runtime and checks the initial cursor", function() {
        const unit = new Inheritance();

        expect(unit.state()).to.eql(null);

        return unit.ready()
            .then(() => {
                expect(unit.state()).to.eql({
                    _unit: {
                        revision: 1,
                        name:     "Inheritance",
                        children: {},
                        errors:   []
                    },
                    name:     "Jupp",
                    age:      40,
                    loggedIn: false
                });

                expect(unit.traces().map(x => x.toJS()).toJS()).to.eql([{
                    name:     "Inheritance::Message</actions/init>",
                    id:       3,
                    end:      22,
                    parent:   null,
                    error:    null,
                    trigger:  null,
                    guards:   0,
                    start:    1,
                    triggers: true,
                    locked:   true,
                    params:   [{
                        age:      40,
                        name:     "Jupp",
                        loggedIn: false
                    }],
                    traces: [{
                        name:     "Inheritance::message",
                        id:       4,
                        parent:   3,
                        end:      21,
                        error:    null,
                        guards:   0,
                        start:    2,
                        triggers: true,
                        trigger:  null,
                        locked:   true,
                        params:   [{
                            age:      40,
                            name:     "Jupp",
                            loggedIn: false
                        }],
                        traces: [{
                            name:     "Inheritance::init",
                            id:       5,
                            parent:   4,
                            end:      18,
                            error:    null,
                            guards:   1,
                            start:    3,
                            triggers: true,
                            trigger:  "before",
                            locked:   true,
                            params:   [{
                                age:      40,
                                name:     "Jupp",
                                loggedIn: false
                            }],
                            traces: [{
                                name:     "Inheritance::init<Guard1>",
                                id:       6,
                                parent:   5,
                                end:      5,
                                error:    null,
                                guards:   0,
                                start:    4,
                                triggers: true,
                                trigger:  "guard",
                                locked:   true,
                                params:   [{
                                    age:      40,
                                    name:     "Jupp",
                                    loggedIn: false
                                }],
                                traces: []
                            }]
                        }, {
                            name:     "Inheritance::action",
                            id:       7,
                            parent:   4,
                            end:      17,
                            error:    null,
                            guards:   1,
                            start:    6,
                            triggers: false,
                            locked:   true,
                            trigger:  "before",
                            params:   [{
                                age:      40,
                                name:     "Jupp",
                                loggedIn: false
                            }],
                            traces: [{
                                name:     "Inheritance::action<Guard1>",
                                id:       8,
                                parent:   7,
                                end:      8,
                                error:    null,
                                guards:   0,
                                start:    7,
                                triggers: true,
                                trigger:  "guard",
                                locked:   true,
                                params:   [{
                                    age:      40,
                                    name:     "Jupp",
                                    loggedIn: false
                                }],
                                traces: []
                            }]
                        }, {
                            name:     "Inheritance::children",
                            id:       9,
                            parent:   4,
                            end:      12,
                            error:    null,
                            guards:   1,
                            start:    9,
                            triggers: false,
                            locked:   true,
                            trigger:  "before",
                            params:   [{
                                age:      40,
                                name:     "Jupp",
                                loggedIn: false
                            }],
                            traces: [{
                                name:     "Inheritance::children<Guard1>",
                                id:       10,
                                parent:   9,
                                end:      11,
                                error:    null,
                                guards:   0,
                                start:    10,
                                triggers: true,
                                trigger:  "guard",
                                locked:   true,
                                params:   [{
                                    age:      40,
                                    name:     "Jupp",
                                    loggedIn: false
                                }],
                                traces: []
                            }]
                        }, {
                            name:     "Inheritance::diffs",
                            id:       11,
                            parent:   4,
                            end:      16,
                            error:    null,
                            guards:   1,
                            start:    13,
                            triggers: false,
                            locked:   true,
                            trigger:  "before",
                            params:   [{
                                age:      40,
                                name:     "Jupp",
                                loggedIn: false
                            }],
                            traces: [{
                                name:     "Inheritance::diffs<Guard1>",
                                id:       12,
                                parent:   11,
                                end:      15,
                                error:    null,
                                guards:   0,
                                start:    14,
                                triggers: true,
                                trigger:  "guard",
                                locked:   true,
                                params:   [{
                                    age:      40,
                                    name:     "Jupp",
                                    loggedIn: false
                                }],
                                traces: []
                            }]
                        }, {
                            name:     "Inheritance::props",
                            id:       13,
                            parent:   4,
                            end:      20,
                            error:    null,
                            guards:   0,
                            start:    19,
                            triggers: true,
                            locked:   true,
                            trigger:  "done",
                            params:   [{
                                age:      40,
                                name:     "Jupp",
                                loggedIn: false
                            }],
                            traces: []
                        }]
                    }]
                }]);
            });
    });*/
});
