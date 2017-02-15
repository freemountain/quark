// @flow
import { Record } from "immutable";
import type Message from "../Message";
import type Cursor from "./Cursor";

export type State = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

export default class PendingAction extends Record({
    message:     null,
    state:       "before",
    willTrigger: false
}) {
    constructor(data: { message: Message, state?: State, willTrigger?: boolean }) {
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

    getState() {
        return `${this.message.currentDir}.${this.state}`;
    }
}
