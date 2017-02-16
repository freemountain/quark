// @flow

import { Record, List, Map, Set } from "immutable";
import Trace from "../telemetry/Trace";
import Message from "../Message";
import NoMessageError from "./error/NoMessageError";
import AlreadyReceivedError from "./error/AlreadyReceivedError";
import NotStartedError from "./error/NotStartedError";
import PendingAction from "./PendingAction";
import type Cursor from "./Cursor";
import type Action from "./Action";

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
            .trace(`Message<${message.resource}>`, message.payload)
            .set("action", new PendingAction({ message }))
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

    messageChanged(message: Message): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.set("message", message) : action);
    }

    actionFinished(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.finish() : action);
    }

    actionBefore(description: Action, y: Message, prev: string): Internals {
        const updated = this.update("action", action => action instanceof PendingAction ? action.before(description, prev, y) : action);

        return updated
            .trace(updated.action.description.name, updated.action.message.payload, prev, updated.action.trigger.guards.size);
    }

    actionDone(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.done() : action);
    }

    actionError(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.error() : action);
    }

    actionTriggers(): Internals {
        return this.update("action", action => action instanceof PendingAction ? action.triggers() : action);
    }

    actionWillTrigger(): Internals {
        return this.update("action", action => action.set("willTrigger", true));
    }

    actionWontTrigger(): Internals {
        return this.update("action", action => action.set("willTrigger", false));
    }
}
