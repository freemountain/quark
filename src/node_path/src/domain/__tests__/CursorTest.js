import Cursor from "../Cursor";
import { expect } from "chai";
import Immutable from "immutable";
import sinon from "sinon";
import ActionDescription from "../ActionDescription";
import Internals from "../Internals";
import Message from "../../Message";

describe("CursorTest", function() { // eslint-disable-line
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
                })
            }).toJS(),
            test: "test"
        });
        expect(cursor.blub).to.be.a("function");
        expect(cursor.blub(1)).to.equal(7);
    });

    it("checks some methods on a cursor", function() {
        const error   = new Error("huhu");
        const message = new Message("/test", []);
        const data    = Immutable.fromJS({
            _unit: new Internals({
                name:        "Unit",
                description: Immutable.Map(),
                action:      message,
                errors:      Immutable.List.of(error)
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(cursor.currentMessage).to.equal(message);
        expect(cursor.set("action", message).currentMessage).to.be.an.instanceOf(Message);
        expect(cursor.errors.toJS()).to.eql([error]);
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
});
