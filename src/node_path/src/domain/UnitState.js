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

type UnitStateData = {
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

export default class UnitState extends Record({
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
    constructor(data: UnitStateData) {
        const description = data.description instanceof Map ? data.description : Map();

        super(Object.assign({}, data, {
            description: description.has("message") ? description : description.set("message", new Action(data.name, "message", List.of(new Trigger("message", new DeclaredTrigger("message")))))
        }));
    }

    messageReceived(data: Message): UnitState {
        if(this.action !== null)              throw new AlreadyReceivedError();
        if(!(this._cursor instanceof Cursor)) throw new Error("lulu");

        const message     = data.setCursor(this._cursor);
        const description = this.description.get("message");
        const action      = new PendingAction({ message, description });
        const updated     = this.set("action", action);

        return this._cursor
            .set("_unit", updated)
            .debug.startTracing(`Message<${message.resource}>`, message.payload, action.guard.count)
            .debug.trace.triggered();
    }

    messageProcessed(): UnitState | Cursor {
        if(this.action === null)              throw new NotStartedError();
        if(!(this._cursor instanceof Cursor)) throw new InvalidCursorError(this._cursor, this.action.description);

        const updated = this
            .update("debug", debug => debug.endTracing())
            .set("action", null)
            .setCursor(null);

        return this._cursor.set("_unit", updated);
    }

    setCursor(cursor: Cursor | null): UnitState {
        return this
            .set("_cursor", cursor)
            .update("action", action => action instanceof PendingAction ? action.setCursor(cursor) : action)
            .update("debug", debug => debug.setCursor(cursor));
    }
}

