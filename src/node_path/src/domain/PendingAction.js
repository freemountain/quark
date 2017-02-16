// @flow
import { Record } from "immutable";
import type Message from "../Message";
import type Cursor from "./Cursor";
import type Action from "./Action";

export type State = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

type PendingActionData = {
    message:      Message, // eslint-disable-line
    state?:       State,   // eslint-disable-line
    willTrigger?: boolean,
    caller?:      Action,  // eslint-disable-line
    description?: Action,  // eslint-disable-line
    start?:       Action   // eslint-disable-line
};

export default class PendingAction extends Record({
    message:     null,
    state:       "waiting",
    willTrigger: false,
    caller:      null,
    description: null,
    trigger:     null,
    start:       null
}) {
    constructor(data: PendingActionData) {
        super(data);
    }

    finish(): PendingAction {
        return this
            .set("description", null)
            .set("caller", null)
            .set("trigger", null)
            .set("start", null)
            .changeState("finished");
    }

    // die müssen alle ne action kriegen
    // dann kann actionChanged weg
    before(action: Action, prev: string, message: Message): PendingAction {
        const trigger = action.triggerFor(prev);

        return this
            .set("start", message)
            .set("message", message.preparePayload(trigger))
            .set("trigger", trigger)
            .set("description", action)
            .set("caller", this.get("action"))
            .changeState("before");
    }

    done(): PendingAction {
        return this.changeState("done");
    }

    error(): PendingAction {
        return this.changeState("error");
    }

    triggers(): PendingAction {
        return this.changeState("triggers");
    }

    cursorChanged(cursor: Cursor): PendingAction {
        return this
            .update("message", message => message.setCursor(cursor));
    }

    changeState(state: State): PendingAction {
        return this.set("state", state);
    }

    // get state()
    getState(): string {
        if(this.caller !== null)      return `${this.caller.name}.${this.state}`;
        if(this.description !== null) return this.description.name;

        return `${this.message.currentDir}.${this.state}`;
    }
}
