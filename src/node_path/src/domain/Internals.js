// @flow

import { Record, List, Map } from "immutable";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import NoMessageError from "./error/NoMessageError";
import AlreadyReceivedError from "./error/AlreadyReceivedError";
import NotStartedError from "./error/NotStartedError";
import PendingAction from "./PendingAction";
import Action from "./Action";
import type Runtime from "../Runtime";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";
import Debug from "./Debug";

type InternalsData = {
    description?: Map<string, Action>,
    id:           string,               // eslint-disable-line
    children?:    Map<string, Runtime>, // eslint-disable-line
    revision?:    number,               // eslint-disable-line
    history?:     List<*>,              // eslint-disable-line
    action?:      ?PendingAction,       // eslint-disable-line
    previous?:    ?PendingAction,       // eslint-disable-line
    debug?:       Debug,                // eslint-disable-line
    name:         string                // eslint-disable-line
}

export default class Internals extends Record({
    description: Map(),
    id:          null,
    history:     List(),
    children:    Map(),
    revision:    0,
    action:      null,
    debug:       new Debug(),
    name:        "Default"
}) {
    constructor(data: InternalsData) {
        const description = data.description instanceof Map ? data.description : Map();

        super(Object.assign({}, data, {
            description: description.has("message") ? description : description.set("message", new Action(data.name, "message", List.of(new Trigger("message", new DeclaredTrigger("message")))))
        }));
    }

    updateCurrentTrace(op: Trace => Trace): Internals {
        if(this.action === null) throw new NoMessageError();

        return this.update("debug", debug => debug.updateCurrentTrace(op));
    }

    trace(name: string, params: List<*>, trigger: ?string, guards: ?number = 0) { // eslint-disable-line
        return this.update("debug", debug => debug.startTrace(this.name, name, params, trigger, guards));
    }

    // .debug.trace


    messageReceived(message: Message): Internals {
        if(this.action !== null) throw new AlreadyReceivedError();

        return this
            .actionBefore(message)
            .updateCurrentTrace(trace => trace.triggered());
    }

    messageProcessed(): Internals {
        if(this.action === null) throw new NotStartedError();

        return this
            .update("debug", debug => debug.compactTraces())
            .set("action", null);
    }


    // .action.fi...
    actionFinished(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.finish() : action);
    }

    actionBefore(y: Message, descr?: ?Action): Internals { // eslint-disable-line
        const description = descr instanceof Action ? descr : this.description.get("message");
        const updated     = this.update("action", action => action instanceof PendingAction ? action.before(description, y) : new PendingAction({ message: y, description }));
        const name        = !(descr instanceof Action) ? `Message<${y.resource}>` : description.name;
        const trigger     = !(this.action instanceof PendingAction) || description.name === "message" ? undefined : this.action.state.type; // eslint-disable-line
        const guards      = updated.action.trigger !== null ? updated.action.trigger.guards.size : 0;

        return updated.trace(name, updated.action.message.payload, trigger, guards);
    }

    actionDone(): Internals {
        return this
            .update("action", action => action instanceof PendingAction ? action.done() : action);
    }

    actionError(): Internals {
        return this
            .update("action", action => action instanceof PendingAction ? action.error() : action);
    }

    actionTriggers(): Internals {
        return this
            .update("action", action => action instanceof PendingAction ? action.triggers() : action);
    }
}

