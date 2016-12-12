import Cursor from "../Cursor";
import { expect } from "chai";
import Immutable from "immutable";
import sinon from "sinon";

describe("CursorTest", function() { // eslint-disable-line
    it("creates some cursors", function() {
        const map = Immutable.Map({
            test: "test"
        });
        const cursor  = Cursor.of(map);
        const cursor2 = Cursor.of({});
        const spy     = sinon.spy();

        cursor.generic(spy);

        expect(cursor.__target).to.equal(map); // eslint-disable-line
        expect(cursor.__proxy).to.equal(true, "__proxy property should be present on cursor"); // eslint-disable-line
        expect(spy.calledWith(cursor)).to.equal(true, "spy should be called with initial map");
        expect(cursor.size).to.equal(1);
        expect(cursor.map).to.be.a("function");
        expect(cursor.blub).to.equal(undefined); // eslint-disable-line
        expect(() => {
            cursor.x = "huhu";
        }).to.throw();
        expect(cursor2).to.equal(cursor2);
    });
});
