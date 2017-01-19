import Message from "../Message";
import { expect } from "chai";

describe("MessageTest", function() {
    it("creates a message", function() {
        const message = new Message("/test", []);

        expect(message).to.be.an.instanceof(Message);
        expect(message.toJS()).to.eql({
            headers:  {},
            resource: "/test",
            payload:  []
        });
    });

    it("creates a message (2)", function() {
        const message = new Message("/blub", [{}], { header: "test" });

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
            payload:  []
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
            payload:  []
        });
        const message = new Message(first);

        expect(message).to.be.an.instanceof(Message);
        expect(message).to.equal(first);
    });

    it("creates an invalid message", function() {
        expect(() => (new Message("/blub", "huhu")).toJS()).to.throw("AssertionError: Your inputdata is not a valid message, got {\"resource\":\"/blub\",\"payload\":\"huhu\",\"headers\":{}}");
        expect(() => (new Message("/blub", null)).toJS()).to.throw("AssertionError: Your inputdata is not a valid message, got {\"resource\":\"/blub\",\"payload\":null,\"headers\":{}}");
        expect(() => (new Message("/blub", undefined)).toJS()).to.throw("AssertionError: Your inputdata is not a valid message, got {\"resource\":\"/blub\",\"headers\":{}}"); // eslint-disable-line
    });

    it("checks the methods", function() {
        const diff   = new Message("/test", []);
        const action = new Message("/actions/test", []);

        expect(action.isAction()).to.equal(true);
        expect(action.isDiff()).to.equal(false);
        expect(diff.isAction()).to.equal(false);
        expect(diff.isDiff()).to.equal(true);
    });
});
