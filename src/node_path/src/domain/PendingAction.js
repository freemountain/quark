// @flow
import { Record } from "immutable";
import Message from "../Message";
import Action from "./Action";
import Trigger from "./Trigger";

export type State = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

type PendingActionData = {
    message:      Message, // eslint-disable-line
    state?:       ?State,  // eslint-disable-line
    willTrigger?: boolean,
    description?: ?Action, // eslint-disable-line
    previous?:    ?Action, // eslint-disable-line
    error?:       ?Error   // eslint-disable-line
};

export default class PendingAction extends Record({
    message:     null,
    state:       "before",
    willTrigger: false,
    description: null,
    trigger:     null,
    previous:    null,
    error:       null
}) {
    constructor(data: PendingActionData) {
        super(data);
    }

    finish(): PendingAction {
        return this
            .set("description", null)
            .set("trigger", null)
            .set("previous", null)
            .set("error", null)
            .changeState("finished");
    }

    before(action: Action, message: Message): PendingAction {
        const prev0   = this.description ? `${this.name}.${this.state}` : action.name;
        const prev    = this.description.name === action.name ? prev0.replace(".before", "") : prev0;
        const trigger = action.triggerFor(prev);

        return this
            .set("message", message.preparePayload(trigger))
            .set("trigger", trigger)
            .set("description", action)
            .set("previous", this.description)
            .changeState("before");
    }

    done(): PendingAction {
        return this
            .changeState("done");
    }

    // hier den error rein un das errohandling hierhin bauen
    // das hier kann auch die traces halten, dann kann man hier die ganzen
    // trace handler reinballern
    error(error: Error): PendingAction {
        return this
            .set("error", error)
            .changeState("error");
    }

    triggers(): PendingAction {
        return this.changeState("triggers");
    }

    changeState(state: State): PendingAction {
        return this.set("state", state);
    }

    shouldTrigger(...args: Array<*>): boolean {
        return this.trigger.shouldTrigger(...args);
    }

    get name(): string {
        if(this.trigger instanceof Trigger)    return this.trigger.emits;
        if(this.description instanceof Action) return this.description.name;

        return this.message.currentDir;
    }

    get op(): ?Function {
        return this.description instanceof Action ? this.description.op : null;
    }

    get delay(): number {
        return this.trigger instanceof Trigger ? this.trigger.delay : 0;
    }
}
