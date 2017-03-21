// @flow

import PendingAction from "../PendingAction";
import { expect } from "chai";
import { List, fromJS } from "immutable";
import Message from "../../Message";
import Action from "../Action";
import UnitState from "../UnitState";
import Cursor from "../Cursor";
import State from "../State";

describe("PendingActionTest", function() {
    it("creates a PendingAction", function() {
        const message = new Message("/actions/test", List());
        const action  = new PendingAction({
            message: message
        });

        expect(action.message).to.equal(message);
        expect(action.state.toJS()).to.eql({
            _cursor: null,
            errors:  [],
            type:    "before"
        });
        expect(action.description).to.equal(null);
        expect(action.trigger).to.equal(null);
        expect(action.previous).to.equal(null);
        expect(action.error).to.equal(null);
        expect(action._cursor).to.equal(null);
        expect(action.name).to.equal("unknown");
        expect(action.op).to.equal(null);
        expect(action.delay).to.equal(0);
        expect(action.guard.count).to.equal(0);
        expect(action.triggers).to.equal(false);
        expect(action.hasErrored).to.equal(false);
    });

    it("uses before", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor  = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor      = new UnitCursor(data);
        const message     = new Message("/actions/test", List());
        const description = new Action("Test", "action", List(), function() {
            return this;
        });
        const action = (new PendingAction({
            message: message
        }).setCursor(cursor));

        expect(() => action.setCursor(null).before(description, message.setCursor(cursor))).to.throw("InvalidCursorError: Invalid cursor of null for \'Test[action]\'.");
        expect(action.before(description, message.setCursor(cursor)).action.setCursor(null).toJS()).to.eql({
            _cursor:     null,
            _triggers:   false,
            description: description.toJS(),
            error:       null,
            message:     message.toJS(),
            previous:    {
                _cursor:     null,
                _triggers:   false,
                description: null,
                error:       null,
                message:     message.toJS(),
                previous:    null,
                state:       (new State()).toJS(),
                trigger:     null
            },
            state:   (new State()).toJS(),
            trigger: {
                action: "action",
                delay:  0,
                emits:  "action",
                guards: [],
                params: []
            }
        });
    });

    it("applies guards", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor  = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor      = new UnitCursor(data);
        const description = new Action("Test", "action", List(), function() {
            return this;
        });
        const message = new Message("/actions/test", List());
        const action  = (new PendingAction({
            message: message
        }))
            .setCursor(cursor)
            .before(description, message.setCursor(cursor))
            .action;

        expect(() => action.setCursor(null).guards()).to.throw("InvalidCursorError: Invalid cursor of null for \'Test[action]\'.");
        expect(action.guards().action.triggers).to.equal(true);
        expect(action.set("message", null).guards().action.triggers).to.equal(true);
    });

    it("changes the triggerstate of an action", function() {
        const data    = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const UnitCursor  = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const cursor      = new UnitCursor(data);
        const message = new Message("/actions/test", List());
        const action  = new PendingAction({
            message: message
        });

        expect(() => action.willTrigger()).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");
        expect(() => action.wontTrigger()).to.throw("InvalidCursorError: Invalid cursor of null for unknown action.");

        expect(action.setCursor(cursor).willTrigger().action.triggers).to.equal(true);
        expect(action.setCursor(cursor).willTrigger().action.wontTrigger().action.triggers).to.equal(false);
    });
});
