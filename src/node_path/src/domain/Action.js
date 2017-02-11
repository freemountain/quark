import Immutable from "immutable";
import Cursor from "./Cursor";
import assert from "assert";
import Message from "../Message";
import UnknownMessageError from "./error/UnknownMessageError";
import { schedule } from "../Runloop";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";

class Action {
    static BEFORE = x => (
        !Action.PROGRESS(x) &&
        !Action.CANCEL(x) &&
        !Action.DONE(x) &&
        !Action.ERROR(x)
    );
    static PROGRESS = x => x.action.indexOf(".progress") !== -1;
    static CANCEL   = x => x.action.indexOf(".cancel") !== -1;   // eslint-disable-line
    static DONE     = x => x.action.indexOf(".done") !== -1;     // eslint-disable-line
    static ERROR    = x => x.action.indexOf(".error") !== -1;    // eslint-disable-line

    static Handler(description) {
        // Todo: prev in den cursor mit undo/redo
        return function(y, prev = description.name) { // eslint-disable-line
            const trigger = description.triggers.find(x => x.action === prev.replace(".before", ""));

            try {
                if(!Message.is(y)) return Promise.resolve(this
                    .trace(description.name, Immutable.List(), prev, trigger.guards.size)
                    .error(new UnknownMessageError(y)));

                assert(this instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.before]'.`);
                assert(this.isTracing, "cursor not tracing");

                const message = y.setCursor(this).preparePayload(trigger);
                const updated = this.update("_unit", internals => internals.update("action", z => z.setCursor(this)));
                const tracing = updated.trace(description.name, message.payload, prev, trigger.guards.size);
                const x       = trigger.shouldTrigger(tracing, message.payload);

                // TODO: use undo here
                if(x.cursor.currentError !== tracing.currentError) return Promise.resolve(x.cursor.trace.end());
                if(!x.result)                                      return Promise.resolve(x.cursor.trace.end());

                const triggered = x.cursor.trace.triggered();

                // TODO to test:
                //
                //  - before und done semantisch tauschen
                //  (depends: message oder message.before)
                //
                //  - more complex triggers (line in constr)
                //
                //  MessageTest!
                return description
                    .applyBefore(triggered, y)
                    .then(cursor => Promise.all([schedule(() => description.applyAction(cursor, message), trigger.delay), cursor]))
                    // TODO: use undo here
                    .then(([cursor, previous]) => cursor.currentError !== previous.currentError ? [cursor, cursor.currentError] : [cursor])
                    .then(([cursor, error]) => Promise.all([error ? description.applyError(cursor, message) : description.applyDone(cursor, message), error]))
                    // TODO: use undo here
                    .then(([cursor, error]) => error ? cursor.trace.error(error) : cursor.trace.end())
                    .then(cursor => cursor.update("_unit", internals => internals.update("action", z => z.unsetCursor())))
                    .catch(e => triggered.error(e));
            } catch(e) {
                return Promise.resolve(this.error(e));
            }
        };
    }

    constructor(unit, name, declarativeTriggers, op = null) { // eslint-disable-line
        const filtered = declarativeTriggers
            .filter(trigger => trigger.action.split(".")[0] === name);

        const triggers = filtered
            .filter(trigger => trigger.emits !== name);

        const ownTriggers = declarativeTriggers
            .filter(trigger => trigger.emits === name);

        const func = op && op.__Action ? op : Action.Handler(this);

        func.__Action = this;
        func.cancel   = this.cancel.bind(this, func);

        // hier müssen bei den ganzen triggern noch dopplungen gefiltert werden:
        // this.before.filter(x => //hat keiner der anderen den auch in before?)
        //
        // außerdem müssen zyklen erkannt werden (mit hilfe traces dynamisch oder hier statisch?)
        //
        // dadurch würde:
        //
        // test: message
        // test2: test message
        //
        // test: message
        // test2: test, sons würde das doppelt getriggert
        //
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
    }

    // die hier werden dann alle diese actions im cursor
    applyBefore(cursor, message) {
        return this.applyTriggers("before", cursor, message);
    }

    applyDone(cursor, message) {
        return this.applyTriggers("done", cursor, message);
    }

    applyError(cursor, message) {
        return this.applyTriggers("error", cursor, message);
    }

    applyCancel(cursor, message) {
        return this.applyTriggers("cancel", cursor, message);
    }

    applyProgress(cursor, message) {
        return this.applyTriggers("progress", cursor, message);
    }

    applyTriggers(kind, cursor, message) {
        assert(cursor instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(cursor)} for ''.`);

        // TODO: das muss hiermit funktionieren, damit das in runtime.before
        // etc ausgelagert werden kann und dadurch bei inheritance überschreibbar
        //
        // const updated = cursor.currentMessage.setCursor(cursor);
        const updated = message.setCursor(cursor);
        // hier das löst sich auch durch cursor.currentop
        const prev    = `${this.name}.${kind}`;
        const promise = Promise.all(this[kind].map(x => cursor[x.emits](updated, prev)).toJS());
            // .map(x => cursor[x.emits] instanceof Function ? cursor[x.emits](updated, prev) : cursor).toJS());

        // TODO: hier die logik bei den thens in cursor.patch packen
        return promise
            .then(x => x.reduce((dest, y) => {
                return Object.assign(dest, {
                    diffs:  dest.diffs.concat(cursor.diff(y)),
                    traces: dest.traces.concat(y.traces),
                    errors: dest.errors.concat(y.errors)
                });
            }, { diffs: Immutable.Set(), traces: Immutable.List(), errors: Immutable.List() }))
            .then(({ diffs, traces, errors }) => cursor
                .patch(diffs.toList(), traces, errors));
    }

    applyAction(cursor, message) {
        // TODO: das hier muss möglich sein, damit das in
        // die message action ausgelagert werden kann, um den
        // ganzen shit so überschreiben zu können - des weiteren
        // muss der trigger hieraus (delay schon beim handler
        // anwenden
        // const message = cursor.currentMessage
        try {
            assert(cursor.isTracing, "cursor not tracing (before)");

            // currentOp muss auf cursor sein
            if(!this.op) return Promise.resolve(cursor);

            const result = this.op.call(cursor, ...message.payload.toJS());

            // onResult muss dann oder geinlined werden
            return this.onResult(cursor, result);
        } catch(e) {
            return Promise.resolve(cursor.update("_unit", internals => internals.error(e)));
        }
    }

    onResult(cursor, result) { // eslint-disable-line
        try {
            assert((
                !result ||
                result instanceof Promise ||
                result instanceof Cursor ||
                result instanceof Error
            ), `Actions have to always return a cursor or undefined, got ${result && result instanceof Object ? result.constructor.name : result}`);

            if(result instanceof Error)   return cursor.update("_unit", internals => internals.error(result));
            if(result instanceof Promise) return result
                .then(this.onResult.bind(this, cursor))
                .catch(this.onResult.bind(this, cursor));

            return result || cursor;
        } catch(e) {
            return cursor.update("_unit", internals => internals.error(e));
        }
    }

    willTrigger(cursor, ...messages) {
        // Test!!
        return Immutable.List(messages).every(message => ( // eslint-disable-line
            (this.triggers.has(message.resource) && this.triggers.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.before.has(message.resource) && this.before.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.progress.has(message.resource) && this.progress.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.cancel.has(message.resource) && this.cancel.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.done.has(message.resource) && this.done.get(message.resource).shouldTrigger(cursor, message.payload)) ||
            (this.error.has(message.resource) && this.error.get(message.resource).shouldTrigger(cursor, message.payload))
        ));
    }

    guardsToJS(triggers) {
        return triggers.map(x => Object.assign({}, x, {
            guards: x.guards.length
        }));
    }

    cancel() {
        assert(false, "Action.cancel: implement!");
    }

    toJS() {
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
