// @flow

import { Record, List, Map, Set } from "immutable";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import NoMessageError from "./error/NoMessageError";
import AlreadyReceivedError from "./error/AlreadyReceivedError";
import NotStartedError from "./error/NotStartedError";
import PendingAction from "./PendingAction";
import type Cursor from "./Cursor";
import Action from "./Action";
import type Runtime from "../Runtime";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";

type InternalsData = {
    description?: Map<string, Action>,
    id:           string,               // eslint-disable-line
    revision?:    number,               // eslint-disable-line
    children?:    Map<string, Runtime>, // eslint-disable-line
    history?:     List<*>,              // eslint-disable-line
    errors?:      Set<Error>,           // eslint-disable-line
    diffs?:       List<*>,              // eslint-disable-line
    traces?:      List<Trace>,          // eslint-disable-line
    current?:     number,               // eslint-disable-line
    action?:      ?PendingAction,       // eslint-disable-line
    previous?:    ?PendingAction,       // eslint-disable-line
    name:         string                // eslint-disable-line
}

export default class Internals extends Record({
    description: Map(),
    id:          null,
    revision:    0,
    children:    Map(),
    history:     List(),
    errors:      Set(),
    diffs:       List(),
    traces:      List(),
    current:     0,
    action:      null,
    previous:    null,
    name:        "Default"
}) {
    constructor(data: InternalsData) {
        const description = data.description instanceof Map ? data.description : Map();

        super(Object.assign({}, data, {
            description: description.has("message") ? description : description.set("message", new Action(data.name, "message", List.of(new Trigger("message", new DeclaredTrigger("message")))))
        }));
    }
    currentTrace(): ?Trace {
        return this.traces.findLast(x => x.end === null && !x.locked);
    }

    isTracing(): boolean {
        return (
            this.action !== null &&
            this.currentTrace() instanceof Trace
        );
    }

    hasErrored(): boolean {
        return this.errors.size > 0;
    }

    error(e: Error): Internals {
        return this.update("errors", errors => errors.add(e));
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

    messageReceived(message: Message): Internals {
        if(this.action !== null) throw new AlreadyReceivedError();

        return this
            // .set("action", new PendingAction({ message }))
            // .trace(`Message<${message.resource}>`, message.payload)
            // das muss hiermit klappen
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
            .update("errors", errors => errors.clear())
            .set("previous", this.action)
            .set("action", null);
    }

    isRecoverable(): boolean {
        return this.errors.every(x => x.isRecoverable && x.isRecoverable());
    }

    cursorChanged(cursor: Cursor): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.cursorChanged(cursor) : action);
    }

    actionFinished(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.finish() : action);
    }

    actionBefore(y: Message, descr?: ?Action): Internals { // eslint-disable-line
        const description = descr instanceof Action ? descr : this.description.get("message");
        const updated     = this.callerChanged().update("action", action => action instanceof PendingAction ? action.before(description, y) : new PendingAction({ message: y, description }));
        const name        = !(descr instanceof Action) ? `Message<${y.resource}>` : description.name;
        const trigger     = !(this.action instanceof PendingAction) || description.name === "message" ? undefined : this.action.state; // eslint-disable-line
        const guards      = updated.action.trigger !== null ? updated.action.trigger.guards.size : 0;

        return updated.trace(name, updated.action.message.payload, trigger, guards);
    }

    actionDone(): Internals {
        return this
            .callerChanged()
            .update("action", action => action instanceof PendingAction ? action.done() : action);
    }

    actionError(): Internals {
        return this
            .callerChanged()
            .update("action", action => action instanceof PendingAction ? action.error(this.errors.last()) : action);
    }

    actionTriggers(): Internals {
        return this
            .callerChanged()
            .update("action", action => action instanceof PendingAction ? action.triggers() : action);
    }

    actionWillTrigger(): Internals {
        return this
            .callerChanged()
            .update("action", action => action.set("willTrigger", true));
    }

    actionWontTrigger(): Internals {
        return this
            .callerChanged()
            .update("action", action => action.set("willTrigger", false));
    }

    callerChanged() {
        return this.update("action", action => action instanceof PendingAction ? action.callerChanged() : action);
    }
}
