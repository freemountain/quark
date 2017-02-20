// @flow

import { List } from "immutable";
import Cursor from "./Cursor";
import assert from "assert";
import Message from "../Message";
import UnknownMessageError from "./error/UnknownMessageError";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";
import InvalidCursorError from "./error/InvalidCursorError";
import PendingAction from "./PendingAction";

type Kind    = "before" | "cancel" | "progress" | "done" | "error"; // eslint-disable-line
type Handler = (y?: Message) => Promise<Cursor>;

class Action {
    name:     string;         // eslint-disable-line
    op:       ?(* => Cursor); // eslint-disable-line
    before:   List<Trigger>;  // eslint-disable-line
    done:     List<Trigger>;  // eslint-disable-line
    triggers: List<Trigger>;
    error:    List<Trigger>;  // eslint-disable-line
    cancel:   List<Trigger>;  // eslint-disable-line
    progress: List<Trigger>;
    unit:     string;         // eslint-disable-line
    func:     (y: any, prev?: string) => Promise<Cursor>; // eslint-disable-line
    message:  ?Message;        // eslint-disable-line

    static BEFORE   = x => x.action.indexOf(".before") !== -1;   // eslint-disable-line
    static PROGRESS = x => x.action.indexOf(".progress") !== -1;
    static CANCEL   = x => x.action.indexOf(".cancel") !== -1;   // eslint-disable-line
    static ERROR    = x => x.action.indexOf(".error") !== -1;    // eslint-disable-line
    static DONE     = x => (                                     // eslint-disable-line
        !Action.PROGRESS(x) &&
        !Action.CANCEL(x) &&
        !Action.BEFORE(x) &&
        !Action.ERROR(x)
    );

    static onResult(cursor: Cursor, result: (Promise<Cursor> | Error | Cursor | void)): Promise<Cursor> { // eslint-disable-line
        if(result instanceof Error)   return cursor.update("_unit", internals => internals.error(result));
        if(result instanceof Promise) return result
            .then(Action.onResult.bind(null, cursor))
            .catch(Action.onResult.bind(null, cursor));

        return Promise.resolve(result instanceof Cursor ? result : cursor);
    }


    static Handler(description: Action): Handler {
        return function(z?: Message): Promise<Cursor> { // eslint-disable-line
            if(!(this instanceof Cursor)) return Promise.reject(new InvalidCursorError(this, description));

            const y = z instanceof Message ? z : this.message;

            if(!Message.is(y))            return Promise.resolve(this
                .trace(description.name, List(), this.currentState)
                .error(new UnknownMessageError(description.unit, description.name, y)));

            // hier das ganze in der message funktion mqchen
            try {
                const befored = this.before(description, y);

                // const guarded = befored
                //    .send.guard()
                //
                // if(!guarded.shouldTrigger) return...
                //
                // return guarded
                //  // eigtl gehören hier die messages rein,
                //  // dann muss nur en teil der autologik
                //  // wahrscheinlich anders platziert werden
                //  .then(cursor => cursor.send.before())
                //  .then(cursor => cursor.send.handle())
                //  .then(cursor => this.send[cursor.currentAction.errored ? "error" : "done"]()
                //  .then(cursor => cursor.send.finish())
                //  .catch(guarded.error(e))
                const guarded = description.applyGuards(befored);

                return !guarded.shouldTrigger ? Promise.resolve(guarded) : description
                    // das in trigger() {} + guarded.message nehmen, dadurch message aus
                    // trigger() raus, dann vereinheitlichen
                    // this.send.before()
                    .applyTriggers(guarded, y.setCursor(guarded))
                    .then(cursor => cursor.triggers())
                    .then(cursor => cursor.defer(() => description.applyAction(cursor), cursor.currentAction.trigger.delay))
                    // das muss noch in den cursor
                    .then(cursor => [cursor, cursor.hasRecentlyErrored ? cursor.currentError : null])
                    // diesen error durchschleifen auch durch den cursor jagen
                    .then(([cursor, error]) => [error ? cursor.errored() : cursor.done(), error])
                    .then(([cursor, error]) => Promise.all([description.applyTriggers(cursor, cursor.message), error]))
                    .then(([cursor, error]) => cursor.finish(error))
                    // .then(([cursor, error]) => error ? cursor.trace.error(error) : cursor.trace.end())
                    // .then(cursor => cursor.update("_unit", internals => internals.actionFinished()))
                    .catch(e => guarded.error(e));
            } catch(e) {
                return Promise.resolve(this.error(e));
            }
        };
    }

    constructor(unit: string, name: string, declarativeTriggers: List<Trigger>, op: any = null) { // eslint-disable-line
        const filtered = declarativeTriggers
            .filter(trigger => trigger.action.split(".")[0] === name);

        const triggers = filtered
            .filter(trigger => trigger.emits !== name);

        const ownTriggers = declarativeTriggers
            .filter(trigger => trigger.emits === name);

        const func = op && op.__Action ? op : Action.Handler(this);

        func.__Action = this;
        func.cancel   = Action.cancel.bind(this, func);

        const own = ownTriggers.find(x => x.action === name && x.emits === name);

        this.unit      = unit;
        this.name      = name;
        this.op        = op;
        this.before    = triggers.filter(Action.BEFORE);
        this.progress  = triggers.filter(Action.PROGRESS);
        this.cancel    = triggers.filter(Action.CANCEL);
        this.done      = triggers.filter(Action.DONE);
        this.error     = triggers.filter(Action.ERROR);
        this.func      = func;
        this.triggers  = ownTriggers
            .concat(own ? [] : [new Trigger(name, new DeclaredTrigger(name))]);

        Object.freeze(this);
    }

    applyGuards(cursor: Cursor): Cursor {
        if(!cursor.currentAction || cursor.currentAction === null) return cursor.error(new Error("no action"));

        const x = cursor.currentAction.trigger.shouldTrigger(cursor, cursor.message ? cursor.message.payload : List());

        return x.shouldTrigger ? x.trace.triggered() : x.trace.end();
    }

    applyTriggers(cursor: Cursor, message: Message): Promise<Cursor> {
        if(!(cursor.currentAction instanceof PendingAction)) return Promise.reject(new Error("fucking cursor"));

        // hier muss jetz noch das this weg
        return Promise
            .all((this: Object)[cursor.currentAction.state].map(x => (cursor.send: Object)[x.emits](...message.payload)).toJS())
            .then(x => cursor.patch(...x));
    }

    applyAction(cursor: Cursor): Promise<Cursor> { // eslint-disable-line
        if(!cursor.message)         return Promise.reject(new Error("fucking cursor"));
        if(!(cursor.currentAction)) return Promise.reject(new Error("fucking cursor"));

        try {
            if(!cursor.currentAction.op) return Promise.resolve(cursor);

            const result = cursor.currentAction.op.call(cursor, ...cursor.message.payload.toJS());

            return Action.onResult(cursor, result);
        } catch(e) {
            return Promise.resolve(cursor.update("_unit", internals => internals.error(e)));
        }
    }

    willTrigger(cursor: Cursor, ...messages: Array<Message>): boolean { // eslint-disable-line
        // Test!!
        return List(messages).every(message => ( // eslint-disable-line
            (this.triggers.has(message.resource) && this.triggers.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.before.has(message.resource) && this.before.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.progress.has(message.resource) && this.progress.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.cancel.has(message.resource) && this.cancel.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.done.has(message.resource) && this.done.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.error.has(message.resource) && this.error.get(message.resource).shouldTrigger(cursor, message.payload))
        ));
    }

    guardsToJS(triggers: Array<{ guards: Array<Object> }>): Array<Object> {
        return triggers.map(x => Object.assign({}, x, {
            guards: x.guards.length
        }));
    }

    triggerFor(name: string): Trigger {
        const trimmed = name.replace(".done", "");
        const trigger = this.triggers.find(x => x.action === trimmed);

        return trigger || new Trigger(this.name, new DeclaredTrigger(this.name));
    }

    static cancel() {
        assert(false, "Action.cancel: implement!");
    }

    toJS(): Object {
        return {
            triggers: this.guardsToJS(this.triggers.toJS()),
            unit:     this.unit,
            name:     this.name,
            before:   this.guardsToJS(this.before.toJS()),
            progress: this.guardsToJS(this.progress.toJS()),
            cancel:   this.guardsToJS(this.cancel.toJS()),
            done:     this.guardsToJS(this.done.toJS()),
            error:    this.guardsToJS(this.error.toJS())
        };
    }
}

export default Action;
