// @flow

import Message from "../Message";
import { expect } from "chai";
import { List, Map, fromJS } from "immutable";
import Action from "../domain/Action";
import Trigger from "../domain/Trigger";
import DeclaredTrigger from "../domain/DeclaredTrigger";
import UnitState from "../domain/UnitState";
import Cursor from "../domain/Cursor";

describe("MessageTest", function() {
    it("creates a message", function() {
        const message = new Message("/test", List());

        expect(message).to.be.an.instanceof(Message);
        expect(message.toJS()).to.eql({
            headers:  {},
            resource: "/test",
            payload:  []
        });
    });

    it("creates a message (2)", function() {
        const message = new Message("/blub", List.of({}), Map({ header: "test" }));

        expect(message).to.be.an.instanceof(Message);
        expect(message.toJS()).to.eql({
            headers: {
                header: "test"
            },
            resource: "/blub",
            payload:  [{}]
        });
    });

    it("creates a message (3)", function() {
        const message = new Message({
            resource: "/test",
            payload:  List()
        });

        expect(message).to.be.an.instanceof(Message);
        expect(message.toJS()).to.eql({
            headers:  {},
            resource: "/test",
            payload:  []
        });
    });

    it("creates a message (4)", function() {
        const first = new Message({
            resource: "/test",
            payload:  List()
        });
        const message = new Message(first);

        expect(message).to.be.an.instanceof(Message);
        expect(message).to.equal(first);
    });

    it("creates an invalid message", function() {
        // $FlowFixMe
        expect(() => (new Message("/blub", "huhu")).toJS()).to.throw("InvalidMessageError: Your inputdata is not a valid message, got {\"headers\":{},\"payload\":\"huhu\",\"resource\":\"/blub\",\"_cursor\":null,\"_initial\":\"huhu\"}.");
        expect(() => (new Message("/blub", null)).toJS()).to.throw("InvalidMessageError: Your inputdata is not a valid message, got {\"headers\":{},\"payload\":null,\"resource\":\"/blub\",\"_cursor\":null,\"_initial\":null}.");
        expect(() => (new Message("/blub", undefined)).toJS()).to.throw("InvalidMessageError: Your inputdata is not a valid message, got {\"headers\":{},\"resource\":\"/blub\",\"_cursor\":null}."); // eslint-disable-line
    });

    it("checks the methods", function() {
        const diff   = new Message("/test", List());
        const action = new Message("/actions/test", List());

        expect(action.isAction()).to.equal(true);
        expect(action.isDiff()).to.equal(false);
        expect(diff.isAction()).to.equal(false);
        expect(diff.isDiff()).to.equal(true);
    });

    it("unboxes a message", function() {
        const action  = new Action("Test", "test", List());
        const message = new Message("/test", List.of("huhu", Map({ test: "huhu" }), action));

        expect(message.unboxPayload()).to.eql(["huhu", {
            test: "huhu"
        }, action]);
    });

    it("prepares payload with error", function() {
        const data = fromJS({
            _unit: new UnitState({
                name: "Unit",
                id:   "id"
            })
        });
        const e          = new Error("lulu");
        const UnitCursor = Cursor.for(new (class Unit {})(), data.get("_unit").description);
        const message    = new Message("/test", List.of("huhu"));
        const cursor     = (new UnitCursor(data))
            ._unit.messageReceived(message)
            .action.state.error(e);

        const trigger = new Trigger("test.error", new DeclaredTrigger("test.error", List(), List.of("test")));

        expect(() => message.preparePayload(trigger)).to.throw("NoCursorError: Message::preparePayload - you need to set the cursor before using it.");
        expect(message.setCursor(cursor).preparePayload(trigger).payload.toJS()).to.eql([e, "huhu", "test"]);
    });
});
