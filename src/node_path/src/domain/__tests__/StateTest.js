import State from "../State";
import { expect } from "chai";
import { fromJS } from "immutable";
import UnitState from "../UnitState";
import Cursor from "../Cursor";
import PendingAction from "../PendingAction";
import CoreComponentError from "../../error/CoreComponentError";

describe("StateTest", function() {
    it("creates a state", function() {
        const state = new State();

        expect(state.type).to.equal("before");
        expect(state.errors.toJS()).to.eql([]);
        expect(state._cursor).to.equal(null);
        expect(state.isRecoverable).to.equal(true);
        expect(state.currentError).to.equal(null);
        expect(state.hasErrored).to.equal(false);
    });

    it("works with some methods", function() {
        const state = new State({
            type: "triggers"
        });

        const e = new Error("lulu");

        e.isRecoverable = "no";

        const errored = state.addError(e);

        expect(state.type).to.equal("triggers");
        expect(state.change("before").type).to.equal("before");
        expect(errored.errors.toJS()).to.eql([e]);
        expect(errored.isRecoverable).to.equal(false);
        expect(errored.hasErrored).to.equal(true);
        expect(errored.currentError).to.equal(e);

        e.isRecoverable = () => true;

        expect(errored.isRecoverable).to.equal(true);
    });

    it("uses the error function", function() {
        const state   = new State();
        const e       = new Error("lala");
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor     = new UnitCursor(data);

        e.isRecoverable = "no";

        expect(() => state.error(e)).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");
        expect(() => state.setCursor(cursor).error(e)).to.throw("NoActionError: There is no valid ongoing action, got null instead.");

        const updated = cursor.update("_unit", unit => unit.set("action", new PendingAction({})));

        expect(state.setCursor(updated).error(e).action.state.errors.toJS()).to.eql([e]);
    });

    it("works with the error functions (2)", function() {
        const state = new State();

        expect(state.hasErrored).to.equal(false);
        expect(state.isRecoverable).to.equal(true);

        expect(state.addError(new Error("huhu")).errors.toJS()).to.eql([new Error("huhu")]);
        expect(state.addError(new Error("huhu")).hasErrored).to.equal(true);
        expect(state.addError(new Error("huhu")).isRecoverable).to.equal(false);

        const e = new (class Rec extends CoreComponentError {
            constructor() {
                super("Rec");
            }

            isRecoverable() {
                return true;
            }
        })();

        expect(state.addError(e).isRecoverable).to.equal(true);
    });
});
