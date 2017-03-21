// @flow
import Debug from "../Debug";
import { expect } from "chai";
import { fromJS, List } from "immutable";
import UnitState from "../UnitState";
import Cursor from "../Cursor";
import Message from "../../Message";
import sinon from "sinon";
import Uuid from "../../util/Uuid";

describe("DebugTest", function() {
    beforeEach(function() {
        let id      = 0;
        let counter = 0;

        this.now  = global.Date.now;
        this.uuid = sinon.stub(Uuid, "uuid").callsFake(() => ++id);

        global.Date.now = () => ++counter;
    });

    afterEach(function() {
        global.Date.now = this.now;
        this.uuid.restore();
    });

    it("creates Debug data", function() {
        const debug = new Debug({});

        expect(debug.traces.toJS()).to.eql([]);
        expect(debug.trace).to.be.a("function");
        expect(debug._cursor).to.equal(null);
        expect(debug.currentTrace).to.equal(null);
        expect(debug.isTracing).to.equal(false);
        expect(debug.toJS()).to.eql({
            _cursor: null,
            traces:  []
        });
    });

    it("traces and triggers", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const message    = new Message("/actions/test", List());
        const cursor     = (new UnitCursor(data)._unit.messageReceived(message));
        const debug      = new Debug();
        const tracing    = debug.setCursor(cursor).trace("lulu");

        expect(() => debug.startTracing("lulu")).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");
        expect(() => debug.trace("lulu")).to.throw("TraceNotStartedError: You can only call \'Debug::trace\' in the context of an arriving message. Please make sure to use this class in conjunction with \'Runtime\' or to provide an \'UnitState\' instance, which did receive a message, to this cursor.");
        expect(tracing.debug.currentTrace.toJS()).to.eql({
            id:       2,
            start:    2,
            end:      null,
            guards:   0,
            name:     "Unit::lulu",
            params:   [],
            error:    null,
            locked:   false,
            parent:   null,
            traces:   [],
            trigger:  null,
            triggers: false
        });

        expect(() => tracing.debug.setCursor(null).trace.triggered()).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");
        expect(tracing.debug.trace.triggered().debug.currentTrace.toJS()).to.eql({
            id:       2,
            start:    2,
            end:      null,
            guards:   0,
            name:     "Unit::lulu",
            params:   [],
            error:    null,
            locked:   false,
            parent:   null,
            traces:   [],
            trigger:  null,
            triggers: true
        });
    });

    it("traces and errors", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const message    = new Message("/actions/test", List());
        const cursor     = (new UnitCursor(data)._unit.messageReceived(message));
        const debug      = new Debug();
        const tracing    = debug.setCursor(cursor).trace("lulu");
        const e          = new Error("error");

        expect(tracing.debug.currentTrace.toJS()).to.eql({
            id:       2,
            start:    2,
            end:      null,
            guards:   0,
            name:     "Unit::lulu",
            params:   [],
            error:    null,
            locked:   false,
            parent:   null,
            traces:   [],
            trigger:  null,
            triggers: false
        });

        expect(() => tracing.debug.setCursor(null).trace.errored(e)).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");
        expect(() => tracing.debug.setCursor(new UnitCursor(data)).trace.errored(e)).to.throw("NoActionError: There is no valid ongoing action, got undefined instead.");
        expect(tracing.debug.trace.errored(e).debug.traces.first().toJS()).to.eql({
            id:       2,
            start:    2,
            end:      3,
            guards:   0,
            name:     "Unit::lulu",
            params:   [],
            error:    e,
            locked:   false,
            parent:   null,
            traces:   [],
            trigger:  null,
            triggers: false
        });
    });

    it("traces and ends", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const message    = new Message("/actions/test", List());
        const cursor     = (new UnitCursor(data)._unit.messageReceived(message));
        const debug      = new Debug();
        const tracing    = debug.setCursor(cursor).trace("lulu");

        expect(() => tracing.debug.setCursor(null).trace.ended()).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");

        expect(tracing.debug.trace.ended().debug.traces.first().toJS()).to.eql({
            id:       2,
            start:    2,
            end:      3,
            guards:   0,
            name:     "Unit::lulu",
            params:   [],
            error:    null,
            locked:   false,
            parent:   null,
            traces:   [],
            trigger:  null,
            triggers: false
        });
    });
});
