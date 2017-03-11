import { Record, List, Map } from "immutable";
import Message from "../Message";
import InvalidCursorError from "./error/InvalidCursorError";
import AlreadyReceivedError from "./error/AlreadyReceivedError";
import NotStartedError from "./error/NotStartedError";
import PendingAction from "./PendingAction";
import Action from "./Action";
import type Runtime from "../Runtime";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";
import Debug from "./Debug";
import Cursor from "./Cursor";

type InternalsData = {
    description?: Map<string, Action>,
    id:           string,               // eslint-disable-line
    children?:    Map<string, Runtime>, // eslint-disable-line
    revision?:    number,               // eslint-disable-line
    history?:     List<*>,              // eslint-disable-line
    action?:      ?PendingAction,       // eslint-disable-line
    previous?:    ?PendingAction,       // eslint-disable-line
    debug?:       Debug,                // eslint-disable-line
    name:         string,               // eslint-disable-line
    _cursor?:     Cursor                // eslint-disable-line
}

export default class Internals extends Record({
    description: Map(),
    id:          null,
    history:     List(),
    children:    Map(),
    revision:    0,
    action:      null,
    debug:       new Debug(),
    name:        "Default",
    _cursor:     null
}) {
    constructor(data: InternalsData) {
        const description = data.description instanceof Map ? data.description : Map();

        super(Object.assign({}, data, {
            description: description.has("message") ? description : description.set("message", new Action(data.name, "message", List.of(new Trigger("message", new DeclaredTrigger("message")))))
        }));
    }

    messageReceived(message: Message): Internals {
        if(this.action !== null) throw new AlreadyReceivedError();

        const updated = this
            .set("action", new PendingAction({
                message:     message.setCursor(this._cursor),
                description: this.description.get("message")
            }));

        const trigger = !(updated.action instanceof PendingAction) || updated.action.description.name === "message" ? undefined : updated.action.previous.state.type; // eslint-disable-line
        const name    = `Message<${message.resource}>`;
        const payload = updated.action.message.payload;
        const guards  = updated.action.guard.count;

        if(!(this._cursor instanceof Cursor)) throw new InvalidCursorError(this._cursor, updated.action.description);

        return this._cursor
            .set("_unit", updated)
            .debug.startTracing(name, payload, trigger, guards)
            .debug.trace.triggered();
    }

    messageProcessed(): Internals | Cursor {
        if(this.action === null) throw new NotStartedError();

        const updated = this
            .update("debug", debug => debug.endTracing())
            .set("action", null)
            .setCursor(null);

        return !(this._cursor instanceof Cursor) ? updated : this._cursor.set("_unit", updated);
    }

    setCursor(cursor: Cursor | null): Internals {
        return this
            .set("_cursor", cursor)
            .update("action", action => action instanceof PendingAction ? action.setCursor(cursor) : action)
            .update("debug", debug => debug.setCursor(cursor));
    }
}

