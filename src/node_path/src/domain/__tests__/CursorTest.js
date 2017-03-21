// @flow

import Cursor from "../Cursor";
import { expect } from "chai";
import { fromJS, List, Map, Set } from "immutable";
import sinon from "sinon";
import Action from "../Action";
import UnitState from "../UnitState";
import Message from "../../Message";
import Uuid from "../../util/Uuid";
import PendingAction from "../PendingAction";
import Runtime from "../../Runtime";
import State from "../State";

describe("CursorTest", function() { // eslint-disable-line
    beforeEach(function() {
        let counter = 0;
        let id      = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid").callsFake(() => ++id);

        global.Date.now = () => ++counter;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("boxes something", function() {
        const data = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            }),
            test: "blub"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(Cursor.box(cursor, function(key) {
            return this.get(key);
        }, ["test"])).to.equal("blub");

        const maybePromise = Cursor.box(new UnitCursor(cursor.__data.x, cursor, cursor.__next, Promise.resolve("te")), function(key, key2) {
            return this.get(key.concat(key2));
        }, ["st"]).__promise;

        const maybePromise2 = Cursor.box(new UnitCursor(cursor.__data.x, cursor, cursor.__next, Promise.resolve(cursor)), function() {
            return this.get("test");
        }).__promise;

        if(!(maybePromise instanceof Promise) || !(maybePromise2 instanceof Promise)) return;

        return Promise.all([ // eslint-disable-line
            maybePromise.then(x => expect(x).to.equal("blub")),
            maybePromise2.then(x => expect(x).to.equal("blub"))
        ]);
    });

    it("uses static then", function() {
        const data = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            }),
            test: "blub"
        });
        const UnitCursor   = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor       = new UnitCursor(data);
        const maybePromise = Cursor.then(cursor, x => x.get("test"))
            .then(x => expect(x).to.equal("blub"))
            .__promise;

        if(!(maybePromise instanceof Promise)) return;

        return maybePromise; // eslint-disable-line
    });

    it("uses catch", function() {
        const data = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            }),
            test: "blub"
        });
        const UnitCursor    = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor        = new UnitCursor(data);
        const maybePromise  = cursor.catch(() => {}).__promise;
        const maybePromise2 = (new UnitCursor(cursor.__data.x, cursor, cursor.__next, Promise.reject(new Error("lulu"))))
            .catch(e => expect(e.message).to.equal("lulu")).__promise;

        if(!(maybePromise instanceof Promise) || !(maybePromise2 instanceof Promise)) return;

        return Promise.all([ // eslint-disable-line
            maybePromise,
            maybePromise2
        ]);
    });


    it("creates a cursor for a unit", function() { // eslint-disable-line
        const func = function(a) {
            return this.update("test", x => x.length + 2 + a);
        };
        const action = new Action("Test", "blub", List(), func);
        const data   = fromJS({
            _unit: new UnitState({
                name:        "Unit",
                id:          "id",
                description: Map({
                    blub:     action,
                    handle:   new Action("Unit", "handle", List(), Runtime.prototype.handle),
                    guards:   new Action("Unit", "guards", List(), Runtime.prototype.guards),
                    before:   new Action("Unit", "before", List(), Runtime.prototype.before),
                    after:    new Action("Unit", "after", List(), Runtime.prototype.after),
                    done:     new Action("Unit", "done", List(), Runtime.prototype.done),
                    error:    new Action("Unit", "error", List(), Runtime.prototype.error),
                    triggers: new Action("Unit", "triggers", List(), Runtime.prototype.triggers),
                    message:  new Action("Unit", "message", List(), Runtime.prototype.message)
                }),
                children: Map({
                    test: Map()
                })
            }),
            test: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);

        expect(UnitCursor.name).to.equal("UnitCursor");
        expect(UnitCursor).to.be.a("function");

        const cursor      = new UnitCursor(data);
        const wrongCursor = new UnitCursor({});

        wrongCursor.__data.x = 5;

        expect(wrongCursor.toString()).to.equal("UnitCursor<{\"x\":5}>");
        expect(() => new UnitCursor()).to.throw("InvalidUnitError: Your data has to contain a UnitState, got undefined");
        expect(cursor).to.be.an.instanceOf(Cursor);
        expect(cursor.toJS()).to.eql({
            _unit: new UnitState({
                name:        "Unit",
                id:          "id",
                description: Map({
                    blub:     action,
                    handle:   new Action("Unit", "handle", List(), Runtime.prototype.handle),
                    guards:   new Action("Unit", "guards", List(), Runtime.prototype.guards),
                    before:   new Action("Unit", "before", List(), Runtime.prototype.before),
                    after:    new Action("Unit", "after", List(), Runtime.prototype.after),
                    done:     new Action("Unit", "done", List(), Runtime.prototype.done),
                    error:    new Action("Unit", "error", List(), Runtime.prototype.error),
                    triggers: new Action("Unit", "triggers", List(), Runtime.prototype.triggers),
                    message:  new Action("Unit", "message", List(), Runtime.prototype.message)
                }),
                children: Map({
                    test: Map()
                })
            }).toJS(),
            test: "test"
        });
        expect(cursor._unit.children.toJS()).to.eql({
            test: {}
        });
        expect(cursor.send.blub).to.be.a("function");

        const message = (new Message("/actions/test", List.of(1)));

        return cursor._unit
            .messageReceived(message)
            .update("_unit", internals => internals.set("action", new PendingAction({
                message: message,
                state:   new State({
                    type: "triggers"
                }),
                description: action,
                trigger:     action.triggers.first()
            })))
            .send.headers({ test: "test" }).blub(1)
            .then(x => {
                expect(x.action.state.errors.toJS()).to.eql([]);
                expect(x.get("test")).to.equal(7);
            });
    });

    it("checks some methods on a cursor", function() {
        const error    = new Error("huhu");
        const message  = new Message("/test", List());
        const children = Map({
            test: Map()
        });

        const data    = fromJS({
            _unit: new UnitState({
                name:     "Unit",
                id:       "id",
                action:   new PendingAction({ message, state: new State({ errors: Set.of(error) }) }),
                children: children
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(cursor.message.toJS()).to.eql(message.setCursor(cursor).toJS());
        expect(cursor.set("action", message).message).to.be.an.instanceOf(Message);
        expect(cursor.action.state.errors.toJS()).to.eql([error]);
        expect(cursor.action.state.currentError).to.equal(error);
        expect(cursor._unit.children).to.equal(children);
        expect(cursor.update("_unit", unit => unit.set("action", null)).message).to.equal(null);
    });

    it("does a trace", function() { // eslint-disable-line
        const message = new Message("/test", List.of(1));
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(() => cursor.debug.trace.ended()).to.throw("TraceNotStartedError: You have to start a trace with \'Debug::trace: (string -> { name: string }) -> Cursor\', before you can change it\'s state to \'ended\'.");
        expect(() => cursor.debug.trace.triggered()).to.throw("TraceNotStartedError: You have to start a trace with \'Debug::trace: (string -> { name: string }) -> Cursor\', before you can change it\'s state to \'triggered\'.");
        expect(() => cursor.debug.trace.errored()).to.throw("TraceNotStartedError: You have to start a trace with \'Debug::trace: (string -> { name: string }) -> Cursor\', before you can change it\'s state to \'errored\'.");
        expect(() => cursor.debug.trace("/test", List.of(false))).to.throw("TraceNotStartedError: You can only call \'Debug::trace\' in the context of an arriving message. Please make sure to use this class in conjunction with \'Runtime\' or to provide an \'UnitState\' instance, which did receive a message, to this cursor.");

        const cursor2 = cursor
            ._unit.messageReceived(message)
            .debug.trace("test", List.of(false))
            .update("_unit", internals => internals.setCursor(null));

        expect(cursor2.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: false,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor3 = cursor2.debug.trace.triggered();

        expect(cursor3.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor4 = cursor3.debug.trace("test2", List.of(1));

        expect(cursor4.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       3,
                        parent:   2,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test2",
                        params:   [1],
                        start:    3,
                        traces:   [],
                        triggers: false,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor5 = cursor4
            .debug.trace.triggered()
            .debug.trace("test3", List.of(2));

        expect(cursor5.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       3,
                        parent:   2,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test2",
                        params:   [1],
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
                        guards:   0,
                        name:     "Unit::test3",
                        params:   [2],
                        start:    4,
                        traces:   [],
                        triggers: false,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor6 = cursor5.debug.trace
            .triggered()
            .debug.trace("test4", List.of(3))
            .debug.trace.triggered()
            .debug.trace.errored(new Error("hi"));

        expect(cursor6.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       3,
                        parent:   2,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test2",
                        params:   [1],
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
                        guards:   0,
                        name:     "Unit::test3",
                        params:   [2],
                        start:    4,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       5,
                        parent:   4,
                        end:      6,
                        error:    new Error("hi"),
                        guards:   0,
                        name:     "Unit::test4",
                        params:   [3],
                        start:    5,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor7 = cursor6
            .debug.trace("test5", List.of(4))
            .debug.trace.triggered()
            .debug.trace.ended();

        expect(cursor7.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       3,
                        parent:   2,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test2",
                        params:   [1],
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
                        guards:   0,
                        name:     "Unit::test3",
                        params:   [2],
                        start:    4,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       5,
                        parent:   4,
                        end:      6,
                        error:    new Error("hi"),
                        guards:   0,
                        name:     "Unit::test4",
                        params:   [3],
                        start:    5,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       6,
                        parent:   4,
                        end:      8,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test5",
                        params:   [4],
                        start:    7,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor8 = cursor7.debug.trace.ended();

        expect(cursor8.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       3,
                        parent:   2,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test2",
                        params:   [1],
                        start:    3,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       4,
                        parent:   3,
                        end:      9,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test3",
                        params:   [2],
                        start:    4,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       5,
                        parent:   4,
                        end:      6,
                        error:    new Error("hi"),
                        guards:   0,
                        name:     "Unit::test4",
                        params:   [3],
                        start:    5,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       6,
                        parent:   4,
                        end:      8,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test5",
                        params:   [4],
                        start:    7,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor9 = cursor8.debug.trace.errored(new Error("lulu"));

        expect(cursor9.toJS()).to.eql({
            _unit: {
                _cursor: null,
                action:  {
                    _cursor: null,
                    message: message.toJS(),
                    state:   {
                        type:    "before",
                        errors:  [],
                        _cursor: null
                    },
                    _triggers:   false,
                    trigger:     null,
                    previous:    null,
                    error:       null,
                    description: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
                        triggers: [{
                            action: "message",
                            delay:  0,
                            emits:  "message",
                            guards: 0,
                            params: []
                        }]
                    }
                },
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       2,
                        parent:   1,
                        end:      null,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test",
                        params:   [false],
                        start:    2,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       3,
                        parent:   2,
                        end:      10,
                        error:    new Error("huhu"),
                        guards:   0,
                        name:     "Unit::test2",
                        params:   [1],
                        start:    3,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       4,
                        parent:   3,
                        end:      9,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test3",
                        params:   [2],
                        start:    4,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       5,
                        parent:   4,
                        end:      6,
                        error:    new Error("hi"),
                        guards:   0,
                        name:     "Unit::test4",
                        params:   [3],
                        start:    5,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }, {
                        id:       6,
                        parent:   4,
                        end:      8,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test5",
                        params:   [4],
                        start:    7,
                        traces:   [],
                        triggers: true,
                        locked:   false,
                        trigger:  null
                    }],
                    _cursor: null
                }
            }
        });

        const cursor10 = cursor9
            .debug.trace.ended()
            ._unit.messageProcessed();

        expect(cursor10.toJS()).to.eql({
            _unit: {
                _cursor:     null,
                action:      null,
                children:    {},
                history:     [],
                id:          "id",
                name:        "Unit",
                revision:    0,
                description: {
                    message: {
                        name:     "message",
                        before:   [],
                        cancel:   [],
                        done:     [],
                        error:    [],
                        progress: [],
                        unit:     "Unit",
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
                        id:       1,
                        parent:   null,
                        end:      12,
                        error:    null,
                        guards:   0,
                        name:     "Unit::Message</test>",
                        params:   [1],
                        start:    1,
                        locked:   true,
                        triggers: true,
                        trigger:  null,
                        traces:   [{
                            id:       2,
                            parent:   1,
                            locked:   true,
                            triggers: true,
                            end:      11,
                            error:    null,
                            guards:   0,
                            name:     "Unit::test",
                            params:   [false],
                            start:    2,
                            trigger:  null,
                            traces:   [{
                                id:       3,
                                parent:   2,
                                end:      10,
                                error:    new Error("lulu"),
                                guards:   0,
                                name:     "Unit::test2",
                                params:   [1],
                                start:    3,
                                triggers: true,
                                locked:   true,
                                trigger:  null,
                                traces:   [{
                                    id:       4,
                                    parent:   3,
                                    end:      9,
                                    error:    null,
                                    guards:   0,
                                    name:     "Unit::test3",
                                    params:   [2],
                                    start:    4,
                                    triggers: true,
                                    locked:   true,
                                    trigger:  null,
                                    traces:   [{
                                        id:       5,
                                        parent:   4,
                                        end:      6,
                                        error:    new Error("hi"),
                                        guards:   0,
                                        name:     "Unit::test4",
                                        params:   [3],
                                        start:    5,
                                        triggers: true,
                                        traces:   [],
                                        locked:   true,
                                        trigger:  null
                                    }, {
                                        id:       6,
                                        parent:   4,
                                        end:      8,
                                        error:    null,
                                        guards:   0,
                                        name:     "Unit::test5",
                                        params:   [4],
                                        start:    7,
                                        triggers: true,
                                        traces:   [],
                                        locked:   true,
                                        trigger:  null
                                    }]
                                }]
                            }]
                        }]
                    }],
                    _cursor: null
                }
            }
        });

        expect(cursor10.debug.traces.first().toString()).to.equal("                                          \u001b[7m\u001b[32m Unit::Message</test>(1) - \u001b[39m\u001b[27m\u001b[7m\u001b[32m11ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m\n                                                                                      |\n                                             \u001b[7m\u001b[32m Unit::test(false) - \u001b[39m\u001b[27m\u001b[7m\u001b[32m9ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m\n                                                                                      |\n                                          \u001b[7m\u001b[31m #ERROR Unit::test2(1) - \u001b[39m\u001b[27m\u001b[7m\u001b[31m7ms\u001b[39m\u001b[27m\u001b[7m\u001b[31m # \u001b[39m\u001b[27m\n                                                                                      |\n                                               \u001b[7m\u001b[32m Unit::test3(2) - \u001b[39m\u001b[27m\u001b[7m\u001b[32m5ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m____\n                                              /                                                                                   \\\n  \u001b[7m\u001b[31m #ERROR Unit::test4(3) - \u001b[39m\u001b[27m\u001b[7m\u001b[31m1ms\u001b[39m\u001b[27m\u001b[7m\u001b[31m # \u001b[39m\u001b[27m  \u001b[7m\u001b[32m Unit::test5(4) - \u001b[39m\u001b[27m\u001b[7m\u001b[32m1ms\u001b[39m\u001b[27m\u001b[7m\u001b[32m \u001b[39m\u001b[27m");
    });

    it("creates some cursors", function() {
        const action = new Action("Test", "blub", List(), function() {
            return this.set("four", 4);
        });
        const map = fromJS({
            _unit: new UnitState({
                description: Map({
                    blub: action
                }),
                id:   "id",
                name: "unit"
            }),
            test: "test"
        });
        const InheritedCursor = Cursor.for(class Test {}, map.get("_unit").description);
        const cursor          = new InheritedCursor(map);
        const cursor2         = new InheritedCursor(cursor);
        const spy             = sinon.spy();

        cursor.generic(spy);

        expect(cursor.size).to.equal(2);
        expect(cursor.map).to.be.a("function");
        expect(spy.calledWith(cursor)).to.equal(true, "spy should be called with initial map");
        expect(cursor.blubo).to.equal(undefined); // eslint-disable-line
        expect(() => {
            cursor.x = "huhu";
        }).to.throw();
        expect(cursor).to.equal(cursor2);
        expect(cursor.send.blub).to.be.a("function");
        expect(cursor.toString()).to.equal("FunctionCursor<Map { \"test\": \"test\" }>");
    });

    it("errors with a cursor", function() {
        const message = new Message("/test", List.of(1));
        const data    = fromJS({
            _unit: (new UnitState({
                name: "Unit",
                id:   "id"
            })),
            test: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = (new UnitCursor(data))
            ._unit.messageReceived(message);

        cursor.debug.trace("/error", List());

        const cursor2 = cursor.action.state.error(new Error("huhu"));

        expect(cursor.action.state.currentError).to.equal(null);
        expect(cursor.action.state.errors.toJS()).to.eql([]);
        expect(cursor2.action.state.errors.toJS()).to.eql([new Error("huhu")]);
        expect(cursor2.action.state.currentError).to.eql(new Error("huhu"));
    });

    it("patches and diffs with a cursor", function() {
        const data = fromJS({
            _unit: (new UnitState({
                name: "Unit",
                id:   "id"
            })),
            test: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);
        const cursor2    = cursor.set("blub", 2).update("test", x => x.concat("."));

        expect(cursor.diff(cursor).toJS()).to.eql([]);
        expect(cursor.diff(cursor2).toJS()).to.eql([{
            op:    "replace",
            path:  "/test",
            value: "test."
        }, {
            op:    "add",
            path:  "/blub",
            value: 2
        }]);
        expect(cursor.patch(cursor2).toJS()).to.eql(cursor2.toJS());
    });

    it("triggers some errors", function() {
        expect(() => new Cursor()).to.throw("CursorAbstractError: Cursor can only be used, when inherited.");
    });

    it("compares two cursors", function() {
        const state = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const Cursor2 = Cursor.for(new (class Unit {})(), Map());
        const Cursor3 = Cursor.for(new (class Unit {})(), Map());
        const data    = new Map({ test: 1 });
        const cursor2 = new Cursor2(state);
        const cursor3 = new Cursor3(state);

        expect(cursor2.isEqual(cursor3)).to.equal(false);
        expect((new Cursor2(data)).isEqual(new Cursor2(data))).to.equal(true);
        expect(cursor2.toString()).to.equal("UnitCursor<Map {}>");
        // expect(() => cursor2.map2()).to.throw("UnknownMethodError: Trying to call unknown method \'undefined::map2\'.");
    });

    it("checks undo and redo", function() {
        const Cursor2 = Cursor.for(new (class Unit {})(), Map());
        const cursor  = new Cursor2(new Map({ name: "test" }));
        const cursor2 = cursor.set("name", "lulu");

        expect(cursor.undo()).to.equal(cursor);
        expect(cursor2.get("name")).to.equal("lulu");
        expect(cursor2.undo().get("name")).to.equal("test");
        expect(cursor2.undo().toJS()).to.eql(cursor.toJS());
        expect(cursor2.undo().isEqual(cursor)).to.equal(true);
        expect(cursor2.undo().redo()).to.equal(cursor2);
        expect(cursor.redo()).to.equal(cursor);
    });

    it("uses an async cursor (cursor.then)", function() {
        const func = function(name) {
            console.log("hhuhu", name);
            return this.set("name", name);
        };
        const action = new Action("Test", "test", List(), func);
        const data   = fromJS({
            _unit: new UnitState({
                name:        "Unit",
                id:          "id",
                description: Map({
                    test:     action,
                    handle:   new Action("Unit", "handle", List(), Runtime.prototype.handle),
                    guards:   new Action("Unit", "guards", List(), Runtime.prototype.guards),
                    before:   new Action("Unit", "before", List(), Runtime.prototype.before),
                    after:    new Action("Unit", "after", List(), Runtime.prototype.after),
                    done:     new Action("Unit", "done", List(), Runtime.prototype.done),
                    error:    new Action("Unit", "error", List(), Runtime.prototype.error),
                    triggers: new Action("Unit", "triggers", List(), Runtime.prototype.triggers),
                    message:  new Action("Unit", "message", List(), Runtime.prototype.message)
                }),
                children: Map({
                    test: Map()
                })
            }),
            name: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const prev       = new UnitCursor(data);
        const cursor     = new UnitCursor(prev.__data.x, prev.__previous, prev.__next);
        // hier klappt gar nix, sobald der ne promise gesetzt hat
        // const cursor     = new UnitCursor(prev.__data.x, prev.__previous, prev.__next, Promise.resolve(prev));
        const message    = (new Message("/actions/test", List.of(1)));

        return cursor._unit
            .messageReceived(message)
            .update("_unit", internals => internals.set("action", new PendingAction({
                message: message,
                state:   new State({
                    type: "triggers"
                }),
                description: action,
                trigger:     action.triggers.first()
            })))
            // seriell
            // der muss in erster linie nen cursor returnen
            // atm scheint der nur die normale promise
            .send.test("lala")
            // .send.test("lili")
            // parallel
            // .send
            //      .test()
            //      .test2()
            .then(x => x.get("name"))
            .then(name => expect(name).to.equal("lala"));
    });

    it("checks some edge cases for immutable methods", function() {
        const data = fromJS({
            _unit: (new UnitState({
                name: "Unit",
                id:   "id"
            })),
            test: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(() => cursor.map()).to.throw("DeferredMethodError: DeferredMethod \'UnitCursor::map\' threw an error:\n\tCannot read property \'call\' of undefined");

        cursor.__data.x = "some wrong data";

        expect(() => cursor.map()).to.throw("UnknownMethodError: Trying to call unknown method \'String::map\'.");
    });
});
