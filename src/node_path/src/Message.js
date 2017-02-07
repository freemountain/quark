import assert from "assert";
import Immutable from "immutable";
import defaults from "set-default-value";
import Cursor from "./domain/Cursor";

export default class Message extends Immutable.Record({
    headers:  Immutable.Map(),
    payload:  Immutable.List(),
    resource: "/default",
    _cursor:  null
}) {
    static is(x) {
        return x instanceof Message;
    }

    static assert(x) {
        if(!this.is(x)) assert(false, `Expected x to be an instance of message, but got ${JSON.stringify(x)}`);

        return x;
    }

    static assertStructure(data) {
        if(!(
            data &&
            data.headers instanceof Immutable.Map &&
            data.payload instanceof Immutable.List &&
            typeof data.resource === "string"
        )) assert(false, `Your inputdata is not a valid message, got ${JSON.stringify(data)}.`);

        return data;
    }

    constructor(resource, payload, headers = Immutable.Map(), _cursor = null) { // eslint-disable-line
        assert(_cursor === null || _cursor instanceof Cursor, "a Message needs to reference a cursor to check if it triggers something.");

        const data = Immutable.fromJS(typeof resource === "string" ? { resource, payload, headers, _cursor } : resource);

        super(data);

        if(resource instanceof Message) return Message.assertStructure(resource);

        data.headers = defaults(data.headers).to(headers);

        return Message.assertStructure(this);
    }

    isAction() {
        return this.resource.indexOf("/actions") === 0;
    }

    isDiff() {
        return !this.isAction();
    }

    willTrigger(...actions) {
        assert(this.get("_cursor") instanceof Cursor, "Message::willTrigger - you need to set the cursor before using it");

        const description = this.get("_cursor").get("_unit").get("description");
        const messages    = actions.map(name => new Message(name, this.payload, this.headers));

        return description.some(handler => handler.willTrigger(this.get("_cursor"), messages));
    }

    preparePayload(trigger) {
        assert(this.get("_cursor") instanceof Cursor, "Message::preparePayload - you need to set the cursor before using it");

        const x       = this.get("_cursor");
        const payload = trigger.action.indexOf(".error") !== -1 ? this.payload.unshift(x.currentError) : this.payload;

        return this.set("payload", payload.concat(trigger.params));
    }

    unsetCursor() {
        return new Message(this.resource, this.payload, this.headers);
    }

    setCursor(cursor) {
        return new Message(this.resource, this.payload, this.headers, cursor);
    }

    path() {
        return Immutable.List(this.resource.split("/"));
    }

    toJS() {
        return {
            headers:  this.headers.toJS(),
            payload:  this.payload.toJS(),
            resource: this.resource
        };
    }
}
