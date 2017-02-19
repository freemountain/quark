// @flow
import { Record } from "immutable";
import type Message from "../Message";
import type Cursor from "./Cursor";
import type Action from "./Action";

export type State = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

type PendingActionData = {
    message:      Message, // eslint-disable-line
    state?:       ?State,   // eslint-disable-line
    willTrigger?: boolean,
    caller?:      Action,  // eslint-disable-line
    description?: Action,  // eslint-disable-line
    start?:       Action   // eslint-disable-line
};

export default class PendingAction extends Record({
    message:     null,
    state:       null,
    willTrigger: false,
    description: null,
    trigger:     null,
    start:       null,
    caller:      null
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
    before(action: Action, message: Message, caller?: ?PendingAction): PendingAction { // eslint-disable-line
        const prev2   = this.description ? `${this.description.name}.${this.state}` : action.name;
        const prev    = !caller || caller === null || !caller.caller || caller.caller === null ? action.name : caller.caller;
        const trigger = action.triggerFor(prev);

        // Hier da stimmt noch stuff nich
        if(prev !== prev2) console.log(prev, prev2);
        return this
            .set("start", message)
            .set("message", message.preparePayload(trigger))
            .set("trigger", trigger)
            .set("description", action)
            .set("caller", this.getState())
            .changeState("before");
    }

    // hier en result rein
    done(): PendingAction {
        // hier muss der caller geändert werden
        return this.changeState("done");
    }

    // hier den error rein un das errohandling hierhin bauen
    // das hier kann auch die traces halten, dann kann man hier die ganzen
    // trace handler reinballern
    error(): PendingAction {
        // hier muss der caller geändert werden
        return this.changeState("error");
    }

    triggers(): PendingAction {
        // hier muss der caller geändert werden
        return this.changeState("triggers");
    }

    cursorChanged(cursor: Cursor): PendingAction {
        return this
            .update("message", message => message.setCursor(cursor));
    }

    changeState(state: State): PendingAction {
        // oder hslt einfach hier
        return this.set("state", state);
    }

    // get state()
    getState(): ?string { // eslint-disable-line
        if(this.description !== null) return this.description.name;
        if(this.state === null)       return this.state;

        return `${this.message.currentDir}.${this.state}`;
    }
}
