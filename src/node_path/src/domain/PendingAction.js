// @flow
import { Record } from "immutable";
import Message from "../Message";
import Action from "./Action";
import Trigger from "./Trigger";
import State from "./State";
import Cursor from "./Cursor";
import InvalidCursorError from "./error/InvalidCursorError";
import assert from "assert";

type PendingActionData = {
    message:      Message,        // eslint-disable-line
    state?:       State,          // eslint-disable-line
    _triggers?:   boolean,        // eslint-disable-line
    description?: ?Action,
    previous?:    ?PendingAction, // eslint-disable-line
    error?:       ?Error,         // eslint-disable-line
    _cursor?:     Cursor         // eslint-disable-line
};

export default class PendingAction extends Record({
    message:     null,
    state:       null,
    description: null,
    trigger:     null,
    previous:    null,
    error:       null,
    _cursor:     null,
    _triggers:   false
}) {
    constructor(data: PendingActionData) {
        super(Object.assign({}, data, {
            state: data.state instanceof State ? data.state : new State()
        }));
    }

    before(action: Action, message: Message): PendingAction {
        const prev0   = this.description ? `${this.name}.${this.state.type}` : action.name;
        const prev    = this.description.name === action.name ? prev0.replace(".before", "") : prev0;
        const trigger = action.triggerFor(prev);

        return this
            .set("message", message.preparePayload(trigger))
            .set("trigger", trigger)
            .set("description", action)
            .set("previous", this)
            .set("_triggers", false)
            .changeState("before");
    }

    triggered(): PendingAction {
        return this.changeState("triggers");
    }

    errored(): PendingAction {
        return this
            .set("error", this.state.currentError)
            .changeState("error");
    }

    done(): PendingAction {
        return this
            .changeState("done");
    }

    finished(): PendingAction {
        return this
            .set("description", null)
            .set("trigger", null)
            .set("previous", null)
            .set("error", null)
            .changeState("finished");
    }

    progress(): Cursor {
        assert(false, "PendingAction.progress: implement!");

        // hier soll der progress wert hochgesetzt werden um den gegebenen param
        return this;
    }

    cancel(): Cursor {
        assert(false, "PendingAction.cancel: implement (use Action.cancel)!");

        // hiermit soll die aktuelle action gecanceled, werden + state revert
        return this;
    }

    changeState(type: string): PendingAction {
        const updated = this.update("state", state => state.change(type));

        if(!(this._cursor instanceof Cursor)) throw new InvalidCursorError(this._cursor, this.description);

        return this._cursor
            .update("_unit", unit => unit.set("action", updated));
    }

    guards(): Cursor {
        if(!(this._cursor instanceof Cursor)) throw new InvalidCursorError(this._cursor, this.description);

        return this.trigger.shouldTrigger(this._cursor, this.message ? this.message.unboxPayload() : []);
    }

    setCursor(cursor: Cursor): PendingAction {
        return this
            .set("_cursor", cursor)
            .update("state", state => state.setCursor(cursor))
            .update("message", message => message instanceof Message ? message.setCursor(cursor) : message);
    }

    get name(): string {
        return this.description.name;
    }

    get op(): ?Function {
        return this.description instanceof Action ? this.description.op : null;
    }

    get delay(): number {
        return this.trigger instanceof Trigger ? this.trigger.delay : 0;
    }

    get hasErrored(): boolean {
        if(!(this.previous instanceof PendingAction)) return false;

        return (
            this.state.type !== "done" &&
            this.previous instanceof PendingAction &&
            this.previous.description.name !== this.description.name &&
            this.state.currentError !== this.previous.state.currentError
        );
    }

    get triggers(): boolean {
        return this._triggers;
    }

    get guard(): { count: number } {
        return {
            count: this.trigger !== null ? this.trigger.guards.size : 0
        };
    }

    willTrigger(): Cursor {
        if(!(this._cursor instanceof Cursor)) throw new InvalidCursorError(this._cursor, this.description);

        return this._cursor
            .update("_unit", unit => unit.set("action", this.set("_triggers", true)));
    }

    wontTrigger(): Cursor {
        if(!(this._cursor instanceof Cursor)) throw new InvalidCursorError(this._cursor, this.description);

        return this._cursor
            .update("_unit", unit => unit.set("action", this.set("_triggers", false)));
    }

    _triggers: boolean
}
