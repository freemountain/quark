// @flow

import unboxResult from "../unboxResult";
import { fromJS } from "immutable";
import UnitState from "../../domain/UnitState";
import Cursor from "../../domain/Cursor";
import { expect } from "chai";

describe("UnboxResultTest", function() {
    it("unboxes a result", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        expect(() => unboxResult(cursor, new Error("huhu"))).to.throw("NoActionError: There is no valid ongoing action, got null instead.");
    });
});
