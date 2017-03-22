// @flow

import { Map, List, Record, fromJS } from "immutable";
import defaults from "set-default-value";
import Cursor from "./domain/Cursor";
import Trigger from "./domain/Trigger";
import Action from "./domain/Action";
import InvalidMessageError from "./error/InvalidMessageError";
import NoCursorError from "./error/NoCursorError";

export default class Message extends Record({
    headers:  Map(),
    payload:  List(),
    resource: "/default",
    _cursor:  null,
    _initial: List()
}) {
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

    constructor(resource: (string | Message | { resource: string, payload?: ?List<*>, headers?: ?Map<string, *> }), payload?: ?List<*> = List(), headers?: Map<string, *> = Map()) { // eslint-disable-line
        const data = fromJS(typeof resource === "string" ? { resource, headers, payload, _initial: payload } : resource);

        super(data);

        return Message.assertStructure(resource instanceof Message ? resource : this.set("headers", defaults(data.headers).to(headers)));
    }

    isAction(): boolean {
        return this.resource.indexOf("/actions") === 0;
    }

    isDiff(): boolean {
        return !this.isAction();
    }

    preparePayload(trigger: Trigger): Message {
        const cursor = this.get("_cursor");

        if(!(cursor instanceof Cursor)) throw new NoCursorError("Message::preparePayload");

        const payload = trigger.action.indexOf(".error") !== -1 ? this.payload.unshift(cursor.action.state.currentError) : this.payload;

        return this
            .set("_initial", payload)
            .set("payload", payload.concat(trigger.params));
    }

    setCursor(cursor: Cursor): Message {
        return this.set("_cursor", cursor);
    }

    // hier muss unten wahrscheinlich alles von immutable
    // rein, falls das iwie ne map oder sowas is
    unboxPayload() {
        return this.payload.map(x => (
            x instanceof Object &&
            x.toJS instanceof Function &&
            !(
                x instanceof Record ||
                x instanceof Action ||
                x instanceof Trigger ||
                x instanceof Cursor
            )
        ) ? x.toJS() : x).toArray();
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

    _initial: List<*>;
}
