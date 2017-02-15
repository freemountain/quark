// @flow
import { Record } from "immutable";
import type Message from "../Message";
import type Cursor from "./Cursor";
import type Action from "./Action";

export type State = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

export default class PendingAction extends Record({
    message:     null,
    state:       "waiting",
    willTrigger: false,
    caller:      null,
    action:      null
}) {
    constructor(data: { message: Message, state?: State, willTrigger?: boolean, caller?: Action, action?: Action }) {
        super(data);
    }

    finish(): PendingAction {
        return this.changeState("finished");
    }

    before(): PendingAction {
        return this.changeState("before");
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
        return this.update("message", message => message.setCursor(cursor));
    }

    changeState(state: State): PendingAction {
        return this.set("state", state);
    }

    actionChanged(action: Action): PendingAction {
        return this
            .set("action", action)
            .set("caller", this.get("action"));
    }

    getState() {
        if(this.caller !== null) return `${this.caller.name}.${this.state}`;
        if(this.action !== null) return this.action.name;

        return `${this.message.currentDir}.${this.state}`;
    }
}
