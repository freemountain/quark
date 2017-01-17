import Cursor from "../Cursor";
import { expect } from "chai";
import Immutable from "immutable";
import sinon from "sinon";
import ActionDescription from "../ActionDescription";

describe("CursorTest", function() { // eslint-disable-line
    it("creates some cursors", function() {
        const action = new ActionDescription("blub", Immutable.List(), () => 4);
        const map    = Immutable.fromJS({
            _unit: {
                description: {
                    blub: action
                }
            },
            test: "test"
        });
        const cursor  = Cursor.of(map);
        const cursor2 = Cursor.of(cursor);
        const spy     = sinon.spy();

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
