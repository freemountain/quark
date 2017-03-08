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

type InternalsData = {
    description?: Map<string, Action>,
    id:           string,               // eslint-disable-line
    children?:    Map<string, Runtime>, // eslint-disable-line
    revision?:    number,               // eslint-disable-line
    history?:     List<*>,              // eslint-disable-line
    traces?:      List<Trace>,          // eslint-disable-line
    action?:      ?PendingAction,       // eslint-disable-line
    previous?:    ?PendingAction,       // eslint-disable-line
    name:         string                // eslint-disable-line
}

export default class Internals extends Record({
    description: Map(),
    id:          null,
    history:     List(),
    children:    Map(),
    revision:    0,
    traces:      List(),
    action:      null,
    name:        "Default"
}) {
    constructor(data: InternalsData) {
        const description = data.description instanceof Map ? data.description : Map();

        super(Object.assign({}, data, {
            description: description.has("message") ? description : description.set("message", new Action(data.name, "message", List.of(new Trigger("message", new DeclaredTrigger("message")))))
        }));
    }

    // .debug.trace
    currentTrace(): ?Trace {
        return this.traces.findLast(x => x.end === null && !x.locked);
    }

    isTracing(): boolean {
        return (
            this.action !== null &&
            this.currentTrace() instanceof Trace
        );
    }

    updateCurrentTrace(op: Trace => Trace): Internals {
        if(this.action === null) throw new NoMessageError();

        const current = this.currentTrace();

        if(!current) return this;

        return this.update("traces", traces => traces.set(this.traces.findLastKey(x => x.end === null && !x.locked), op(current)));
    }

    trace(name: string, params: List<*>, trigger: ?string, guards: ?number = 0) {
        const current = this.currentTrace();
        const parent  = current ? current.id : current;
        const id      = null;
        const start   = null;

        return this.update("traces", traces => traces.push(new Trace({
            name,
            params,
            guards,
            trigger,
            parent,
            id,
            start
        }, this.name)));
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

        const filtered = this.traces.filter(x => !x.locked);
        const trace    = filtered
            .shift()
            .reduce((dest, x) => dest.addSubtrace(x), filtered.first().ended());

        return this
            .update("traces", traces => traces.filter(x => x.locked).push(trace.lock()))
            .set("action", null);
    }


    // .action.fi...
    actionFinished(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.finish() : action);
    }

    actionBefore(y: Message, descr?: ?Action): Internals { // eslint-disable-line
        const description = descr instanceof Action ? descr : this.description.get("message");
        const updated     = this.update("action", action => action instanceof PendingAction ? action.before(description, y) : new PendingAction({ message: y, description, previous: this.action }));
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

    actionWillTrigger(): Internals {
        return this
            .update("action", action => action.set("willTrigger", true));
    }

    actionWontTrigger(): Internals {
        return this
            .update("action", action => action.set("willTrigger", false));
    }
}
