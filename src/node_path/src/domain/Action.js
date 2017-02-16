// @flow

import { List } from "immutable";
import Cursor from "./Cursor";
import assert from "assert";
import Message from "../Message";
import UnknownMessageError from "./error/UnknownMessageError";
import { schedule } from "../Runloop";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";
import InvalidCursorError from "./error/InvalidCursorError";

type Kind    = "before" | "cancel" | "progress" | "done" | "error"; // eslint-disable-line
type Handler = (y: any, prev?: string) => Promise<Cursor>;

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

    static Handler(description: Action): Handler {
        return function(y, prev = description.name) { // eslint-disable-line
            if(!(this instanceof Cursor)) return Promise.reject(new InvalidCursorError(this, description));
            if(!Message.is(y))            return Promise.resolve(this
                .trace(description.name, List(), prev)
                .error(new UnknownMessageError(description.unit, description.name, y)));

            // der hier muss auch in die pendingaction rein
            const trigger = description.triggers.find(x => x.action === prev.replace(".done", "")) || new Trigger(description.name, new DeclaredTrigger(description.name));

            try {
                // als erstes muss die resource der message auf den action
                // namen gesetzt werden, dann sollte das prinzipiell klappen

                // hier das muss auch noch in die BEFORE
                // hier das muss komplett in den cursor: am anfang:
                // cursor actionChanged(description). => rest müsste hieraus
                // abgeleitet werden können
                const message = y
                    // das rauskriegen, indem das in dem getter gesetzt wird
                    .setCursor(this)
                    .setAction(description.name)
                    .preparePayload(trigger);

                const befored = this.BEFORE(description, prev, trigger, message);

                // console.log("handler", prev, befored.currentAction ? befored.currentState : null);
                // TODO: hier alle elemente rauskriegen bei BEFORE,
                // applyGuards darf nur auf cursor dependen
                const guarded = description.applyGuards(befored, message, trigger);

                // hier das kann mit in before, sobald cancel drin is
                return !guarded.shouldTrigger ? Promise.resolve(guarded) : description
                    // hier nur mit cursor arbeiten, sodass cursor.MESSAGE_UPDATE() oder sowas)
                    // dann mal das schema der privaten vereinheitlichen bei cursor
                    .applyBefore(guarded, y.setCursor(guarded))
                    .then(cursor => schedule(() => description.applyAction(cursor.TRIGGERS(), message.setCursor(cursor.TRIGGERS())), trigger.delay))
                    // das muss noch in den cursor
                    .then(cursor => [cursor, cursor.hasRecentlyErrored ? cursor.currentError : null])
                    .then(([cursor, error]) => Promise.all([error ? description.applyError(cursor.ERROR(), message.setCursor(cursor.ERROR())) : description.applyDone(cursor.DONE(), message.setCursor(cursor.DONE())), error]))
                    .then(([cursor, error]) => error ? cursor.trace.error(error) : cursor.trace.end())
                    .then(cursor => cursor.update("_unit", internals => internals.actionFinished()))
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

    // die hier werden dann alle diese actions im cursor
    applyBefore(cursor: Cursor, message: Message): Promise<Cursor> {
        return this.applyTriggers("before", cursor, message);
    }

    applyDone(cursor: Cursor, message: Message): Promise<Cursor> {
        return this.applyTriggers("done", cursor, message);
    }

    applyError(cursor: Cursor, message: Message): Promise<Cursor> {
        return this.applyTriggers("error", cursor, message);
    }

    applyCancel(cursor: Cursor, message: Message): Promise<Cursor> {
        return this.applyTriggers("cancel", cursor, message);
    }

    applyProgress(cursor: Cursor, message: Message): Promise<Cursor> {
        return this.applyTriggers("progress", cursor, message);
    }

    applyGuards(cursor: Cursor, message: Message, trigger: Trigger): Cursor {
        // trigger auch zu pending
        // const x = trigger.shouldTrigger(cursor) -> da cursor.message nutzen
        const x = trigger.shouldTrigger(cursor, message.payload);

        return x.shouldTrigger ? x.trace.triggered() : x.trace.end();
    }

    applyTriggers(kind: Kind, cursor: Cursor, message: Message): Promise<Cursor> {
        // hier das in message + kind auch aus pendingaction
        const prev = `${this.name}.${kind}`;

        return Promise
            // cursor.send.<resource>(...args (payload), headers?)
            .all((this: Object)[kind].map(x => (cursor.send: Object)[x.emits](message, prev)).toJS())
            .then(x => cursor.patch(...x));
    }

    applyAction(cursor: Cursor, message: Message): Promise<Cursor> { // eslint-disable-line
        // TODO: das hier muss möglich sein, damit das in
        // die message action ausgelagert werden kann, um den
        // ganzen shit so überschreiben zu können
        //
        // const message = cursor.currentMessage
        try {
            // currentOp muss auf cursor sein
            if(!this.op) return Promise.resolve(cursor);

            const result = this.op.call(cursor, ...message.payload.toJS());

            // onResult muss dann oder geinlined werden
            return this.onResult(cursor, result);
        } catch(e) {
            return Promise.resolve(cursor.update("_unit", internals => internals.error(e)));
        }
    }

    onResult(cursor: Cursor, result: (Promise<Cursor> | Error | Cursor | void)): Promise<Cursor> { // eslint-disable-line
        if(result instanceof Error)   return cursor.update("_unit", internals => internals.error(result));
        if(result instanceof Promise) return result
            .then(this.onResult.bind(this, cursor))
            .catch(this.onResult.bind(this, cursor));

        return Promise.resolve(result instanceof Cursor ? result : cursor);
    }

    willTrigger(cursor: Cursor, ...messages: Array<Message>): boolean { // eslint-disable-line
        // Test!!
        return false;

        /* List(messages).every(message => ( // eslint-disable-line
            (this.triggers.has(message.resource) && this.triggers.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.before.has(message.resource) && this.before.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.progress.has(message.resource) && this.progress.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.cancel.has(message.resource) && this.cancel.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.done.has(message.resource) && this.done.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.error.has(message.resource) && this.error.get(message.resource).shouldTrigger(cursor, message.payload))
        ));*/
    }

    guardsToJS(triggers: Array<{ guards: Array<Object> }>): Array<Object> {
        return triggers.map(x => Object.assign({}, x, {
            guards: x.guards.length
        }));
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
