import { Record, List, Map } from "immutable";
// import Trace from "../telemetry/Trace";
import Message from "../Message";
// import NoMessageError from "./error/NoMessageError";
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
            .setCursor(null)
            .before(message, this.description.get("message"))
            .beforeTrace(`Message<${message.resource}>`)
            .update("debug", debug => debug.updateCurrentTrace(trace => trace.triggered()));

        return !(this._cursor instanceof Cursor) ? updated : this._cursor.set("_unit", updated);
    }

    messageProcessed(): Internals | Cursor {
        if(this.action === null) throw new NotStartedError();

        const updated = this
            .update("debug", debug => debug.compactTraces())
            .set("action", null)
            .setCursor(null);

        return !(this._cursor instanceof Cursor) ? updated : this._cursor.set("_unit", updated);
    }

        // das sollte auch noch auf action kommen + die beiden fälle:
    // unit -> message
    // und alles andere müssen entkoppelt werden
    // eigtl kann die ganze logik hier raus und in die jeweilige funktion
    // (Runtime.before, Internals.messageReceived
    before(y: Message, description: Action): Internals { // eslint-disable-line
        const message = y.setCursor(this._cursor);
        const updated = this.update("action", action => action instanceof PendingAction ? action.before(description, message) : new PendingAction({ message: message, description }));

        return updated;
    }

    beforeTrace(maybeName?: string): Internals { // eslint-disable-line
       // hier das dabei dann in die before methode ansich und in
        // trigger (das sind ja atm 2 fälle, die hier abgehandelt werden)
        const trigger     = !(this.action instanceof PendingAction) || this.action.description.name === "message" ? undefined : this.action.previous.state.type; // eslint-disable-line
        const unit        = this.name;
        const name        = maybeName ? maybeName : this.action.description.name;
        const payload     = this.action.message.payload;
        const guards      = this.action.guard.count;

        const internals   = this.update("debug", debug => debug
            .setCursor(null)
            .trace(unit, name, payload, trigger, guards));

        /*  const debug = updated.debug
         .trace(name, updated.action.message.payload, trigger, guards);*/

        return !(this._cursor instanceof Cursor) ? internals : this._cursor.set("_unit", internals.setCursor(null));
        // return !(this.debug._cursor instanceof Cursor) ? this.set("debug", debug) : debug;
    }

    setCursor(cursor: Cursor | null): Internals {
        return this
            .set("_cursor", cursor)
            .update("action", action => action instanceof PendingAction ? action.setCursor(cursor) : action)
            .update("debug", debug => debug.setCursor(cursor));
    }

    // _cursor: Cursor
}

