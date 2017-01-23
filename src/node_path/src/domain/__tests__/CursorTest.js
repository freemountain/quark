import Cursor from "../Cursor";
import { expect } from "chai";
import Immutable from "immutable";
import sinon from "sinon";
import ActionDescription from "../ActionDescription";
import Internals from "../Internals";
import Message from "../../Message";

describe("CursorTest", function() { // eslint-disable-line
    before(function() {
        this.now = global.Date.now;

        global.Date.now = () => 0;
    });

    after(function() {
        global.Date.now = this.now;
    });

    it("creates a cursor for a unit", function() {
        const func = function(a) {
            return this.get("test").length + 2 + a;
        };
        const action = new ActionDescription("Test", "blub", Immutable.List(), func);

        action.func = func;

        const data = Immutable.fromJS({
            _unit: new Internals({
                name:        "Unit",
                description: Immutable.Map({
                    blub: action
                }),
                children: Immutable.Map({
                    test: Immutable.Map()
                })
            }),
            test: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);

        expect(UnitCursor.name).to.equal("UnitCursor");
        expect(UnitCursor).to.be.a("function");

        const cursor = new UnitCursor(data);

        expect(cursor).to.be.an.instanceOf(Cursor);
        expect(cursor.toJS()).to.eql({
            _unit: new Internals({
                name:        "Unit",
                description: Immutable.Map({
                    blub: action
                }),
                children: Immutable.Map({
                    test: Immutable.Map()
                })
            }).toJS(),
            test: "test"
        });
        expect(cursor.children.toJS()).to.eql({
            test: {}
        });
        expect(cursor.blub).to.be.a("function");
        expect(cursor.blub(1)).to.equal(7);
    });

    it("checks some methods on a cursor", function() {
        const error    = new Error("huhu");
        const message  = new Message("/test", []);
        const children = Immutable.Map({
            test: Immutable.Map()
        });

        const data    = Immutable.fromJS({
            _unit: new Internals({
                name:        "Unit",
                description: Immutable.Map(),
                action:      message,
                errors:      Immutable.List.of(error),
                children:    children
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(cursor.currentMessage).to.equal(message);
        expect(cursor.set("action", message).currentMessage).to.be.an.instanceOf(Message);
        expect(cursor.errors.toJS()).to.eql([error]);
        expect(cursor.currentError).to.equal(error);
        expect(cursor.currentContext).to.equal("Unit");
        expect(cursor.hasErrored).to.equal(true);
        expect(cursor.children).to.equal(children);
    });

    it("does a trace", function() { // eslint-disable-line
        const message = new Message("/test", [1]);
        const data    = Immutable.fromJS({
            _unit: new Internals({
                name:        "Unit",
                description: Immutable.Map(),
                action:      message
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(() => cursor.trace.end()).to.throw("AssertionError: You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to 'ended'.");
        expect(() => cursor.trace.triggered()).to.throw("AssertionError: You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to 'triggered'.");
        expect(() => cursor.trace.error()).to.throw("AssertionError: You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to 'errored'.");

        expect(() => cursor.trace("/test", Immutable.List.of(false))).to.throw("AssertionError: You can only call 'Cursor::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance to the constructor of this class, which did receive a message.");

        const cursor2 = cursor
            .update("_unit", internals => internals.set("action", null).messageReceived(message))
            .trace("test", Immutable.List.of(false));

        expect(cursor2.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [{
                    end:      null,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test",
                    params:   [false],
                    start:    0,
                    traces:   [],
                    triggers: false
                }]
            }
        });

        const cursor3 = cursor2.trace.triggered();

        expect(cursor3.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [{
                    end:      null,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test",
                    params:   [false],
                    start:    0,
                    traces:   [],
                    triggers: true
                }]
            }
        });

        const cursor4 = cursor3.trace("test2", Immutable.List.of(1));

        expect(cursor4.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [{
                    end:      null,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test2",
                    params:   [1],
                    start:    0,
                    traces:   [],
                    triggers: false
                }]
            }
        });

        const cursor5 = cursor4.trace.triggered().trace("test3", Immutable.List.of(2));

        expect(cursor5.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [{
                    end:      null,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test3",
                    params:   [2],
                    start:    0,
                    traces:   [],
                    triggers: false
                }]
            }
        });

        const cursor6 = cursor5.trace
            .triggered()
            .trace("test4", Immutable.List.of(3));

        cursor6.trace.triggered();
        cursor6.trace.error(new Error("hi"));

        expect(cursor6.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [{
                    end:      null,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test3",
                    params:   [2],
                    start:    0,
                    triggers: true,
                    traces:   [{
                        end:      0,
                        error:    new Error("hi"),
                        guards:   0,
                        name:     "Unit::test4",
                        params:   [3],
                        start:    0,
                        triggers: true,
                        traces:   []
                    }]
                }]
            }
        });

        cursor6.trace("test5", Immutable.List.of(4));
        cursor6.trace.triggered();
        cursor6.trace.end();

        expect(cursor6.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [{
                    end:      null,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test3",
                    params:   [2],
                    start:    0,
                    triggers: true,
                    traces:   [{
                        end:      0,
                        error:    new Error("hi"),
                        guards:   0,
                        name:     "Unit::test4",
                        params:   [3],
                        start:    0,
                        triggers: true,
                        traces:   []
                    }, {
                        end:      0,
                        error:    null,
                        guards:   0,
                        name:     "Unit::test5",
                        params:   [4],
                        start:    0,
                        triggers: true,
                        traces:   []
                    }]
                }]
            }
        });

        cursor6.trace.end();

        const compare1 = {
            end:      null,
            error:    null,
            guards:   0,
            name:     "Unit::test2",
            params:   [1],
            start:    0,
            triggers: true,
            traces:   [{
                end:      0,
                error:    null,
                guards:   0,
                name:     "Unit::test3",
                params:   [2],
                start:    0,
                triggers: true,
                traces:   [{
                    end:      0,
                    error:    new Error("hi"),
                    guards:   0,
                    name:     "Unit::test4",
                    params:   [3],
                    start:    0,
                    triggers: true,
                    traces:   []
                }, {
                    end:      0,
                    error:    null,
                    guards:   0,
                    name:     "Unit::test5",
                    params:   [4],
                    start:    0,
                    triggers: true,
                    traces:   []
                }]
            }]
        };

        expect(cursor6.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [compare1]
            }
        });

        cursor6.trace.error(new Error("lulu"));

        const compare2 = {
            end:      null,
            error:    null,
            guards:   0,
            name:     "Unit::test",
            params:   [false],
            start:    0,
            triggers: true,
            traces:   [Object.assign(compare1, {
                end:   0,
                error: new Error("lulu")
            })]
        };

        expect(cursor6.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [compare2]
            }
        });

        cursor6.trace.end().trace.end();

        const compare3 = {
            end:      0,
            error:    null,
            guards:   0,
            name:     "Unit::Message</test>",
            params:   [1],
            start:    0,
            triggers: true,
            traces:   [Object.assign(compare2, {
                end: 0
            })]
        };

        expect(cursor6.toJS()).to.eql({
            _unit: {
                action:      message.toJS(),
                children:    {},
                current:     0,
                description: {},
                diffs:       [],
                errors:      [],
                history:     [],
                id:          null,
                name:        "Unit",
                revision:    0,
                traces:      [compare3]
            }
        });

        expect(cursor6.get("_unit").get("traces").first().toString()).to.equal("             Unit::Message</test>(1) - 0ms\n                           |\n                Unit::test(false) - 0ms\n                           |\n             #ERROR Unit::test2(1) - 0ms #\n                           |\n                 Unit::test3(2) - 0ms_____\n                /                         \\\n  #ERROR Unit::test4(3) - 0ms #  Unit::test5(4) - 0ms");
        expect(() => cursor6.trace.end()).to.throw("AssertionError: Can\'t stop a trace, that is already finished.");
    });

    it("creates some cursors", function() {
        const action = new ActionDescription("Test", "blub", Immutable.List(), () => 4);
        const map    = Immutable.fromJS({
            _unit: new Internals({
                description: Immutable.Map({
                    blub: action
                })
            }),
            test: "test"
        });
        const InteritedCursor = Cursor.for(class Test {}, map.get("_unit").description);
        const cursor          = new InteritedCursor(map);
        const cursor2         = new InteritedCursor(cursor);
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
        expect(cursor.blub).to.be.a("function");
        // expect(cursor.blub()).to.equal(4);
    });

    it("errors with a cursor", function() {
        const message = new Message("/test", [1]);
        const func = function(a) {
            return this.get("test").length + 2 + a;
        };
        const action = new ActionDescription("Test", "blub", Immutable.List(), func);

        action.func = func;

        const data = Immutable.fromJS({
            _unit: (new Internals({
                name:        "Unit",
                description: Immutable.Map()
            })).messageReceived(message),
            test: "test"
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        cursor.trace("/error", Immutable.List());

        const cursor2 = cursor.error(new Error("huhu"));

        expect(cursor.currentError).to.equal(null);
        expect(cursor.hasErrored).to.equal(false);
        expect(cursor2.hasErrored).to.equal(true);
        expect(cursor2.errors.toJS()).to.eql([new Error("huhu")]);
        expect(cursor2.currentError).to.eql(new Error("huhu"));
    });

    it("patches and diffs with a cursor", function() {
        const data = Immutable.fromJS({
            _unit: (new Internals({
                name:        "Unit",
                description: Immutable.Map()
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
        expect(cursor.patch(cursor.diff(cursor2)).toJS()).to.eql(cursor2.toJS());
    });
});
