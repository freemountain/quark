// @flow

// import assert from "assert";
import { Map, List, Record, fromJS } from "immutable";
import defaults from "set-default-value";
import Cursor from "./domain/Cursor";
import Trigger from "./domain/Trigger";
import InvalidMessageError from "./error/InvalidMessageError";
import NoCursorError from "./error/NoCursorError";

export default class Message extends Record({
    headers:  Map(),
    payload:  List(),
    resource: "/default",
    _cursor:  null,
    _initial: List()
}) {
    _initial: List<*>;

    static is(x) {
        return x instanceof Message;
    }

    static assertStructure(data) {
        if(!(
            data &&
            data.headers instanceof Map &&
            data.payload instanceof List &&
            typeof data.resource === "string"
        )) throw new InvalidMessageError(data);

        return data;
    }

    constructor(resource: (string | Message | { resource: string, payload?: ?List<*>, headers?: ?Map<string, *> }), payload?: ?List<*>, headers?: Map<string, *> = Map()) { // eslint-disable-line
        const data = fromJS(typeof resource === "string" ? { resource, payload, headers, _initial: payload } : resource);

        super(data);

        return Message.assertStructure(resource instanceof Message ? resource : this.set("headers", defaults(data.headers).to(headers)));
    }

    isAction(): boolean {
        return this.resource.indexOf("/actions") === 0;
    }

    isDiff(): boolean {
        return !this.isAction();
    }

    willTrigger(...actions: Array<string>): boolean {
        const cursor = this.get("_cursor");

        if(!(cursor instanceof Cursor)) throw new NoCursorError("Message::willTrigger");

        const description = cursor.get("_unit").get("description");
        const messages    = actions.map(name => new Message(name, this.payload, this.headers));

        return description.some(handler => handler.willTrigger(this.get("_cursor"), messages));
    }

    preparePayload(trigger: Trigger): Message {
        const cursor = this.get("_cursor");

        if(!(cursor instanceof Cursor)) throw new NoCursorError("Message::preparePayload");

        const payload = trigger.action.indexOf(".error") !== -1 ? this.payload.unshift(cursor.action.state.error) : this.payload;

        return this
            .set("_initial", payload)
            .set("payload", payload.concat(trigger.params));
    }

    setAction(action: string) {
        return this.set("resource", this.path.pop().concat([action]).join("/"));
    }

    unsetCursor(): Message {
        return new Message(this.resource, this.payload, this.headers);
    }

    setCursor(cursor: Cursor): Message {
        return this.set("_cursor", cursor);
        // new Message(this.resource, this.payload, this.headers, cursor);
    }

    get path(): List<string> {
        return List(this.resource.split("/"));
    }

    get currentDir(): string {
        return this.path.last();
    }

    get originalPayload(): List<*> {
        return this._initial;
    }

    toJS(): Object {
        return {
            headers:  this.headers.toJS(),
            payload:  this.payload.toJS(),
            resource: this.resource
        };
    }
}
