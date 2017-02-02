import Immutable from "immutable";
import Cursor from "./Cursor";
import assert from "assert";
import Message from "../Message";

class ActionDescription {
    static BEFORE = x => (
        !ActionDescription.PROGRESS(x) &&
        !ActionDescription.CANCEL(x) &&
        !ActionDescription.DONE(x) &&
        !ActionDescription.ERROR(x)
    );
    static PROGRESS = x => x.action.indexOf(".progress") !== -1;
    static CANCEL   = x => x.action.indexOf(".cancel") !== -1;   // eslint-disable-line
    static DONE     = x => x.action.indexOf(".done") !== -1;     // eslint-disable-line
    static ERROR    = x => x.action.indexOf(".error") !== -1;    // eslint-disable-line

    static applyTriggers(triggers, cursor, message) {
        assert(cursor instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for ''.`);

        const promise = Promise.all(triggers.map(x => x.apply(cursor, message)).toJS());

        return promise
            .then(x => x.reduce((dest, y, key) => {
                console.log("applyTriggers after ", triggers.get(key).emits, y.traces.map(({ name, start, end }) => [name, start, end]).toJS());

                return Object.assign(dest, {
                    diffs:  dest.diffs.concat(cursor.diff(y)),
                    traces: dest.traces.concat(y.get("_unit").get("traces"))
                });
            }, { diffs: Immutable.Set(), traces: Immutable.List() }))
            .then(({ diffs, traces }) => cursor
                .patch(diffs.toList(), traces));
    }

    static awaitResult(cursor, result) { // eslint-disable-line
        if(!result)                  return Promise.resolve(cursor.trace.end());
        if(result instanceof Error)  return Promise.resolve(cursor.error(result));
        if(result instanceof Cursor) return Promise.resolve(result.trace.end());

        return result
            .then(ActionDescription.awaitResult.bind(null, cursor))
            .catch(ActionDescription.awaitResult.bind(null, cursor));
    }

    static applyAction(description, message, cursor, resolve) { // eslint-disable-line
        console.log("huhu", cursor.traces.map(({ name, start, end }) => [name, start, end]));
        try {
            assert(cursor.isTracing, "cursor not tracing (before)");

            console.log("huhu2");
            if(cursor.hasErrored) return resolve(cursor);

            console.log("huhu3");
            const result = description.op ? description.op.call(cursor, ...message.payload.toJS()) : cursor;

            assert((
                !result ||
                result instanceof Promise ||
                result instanceof Cursor ||
                result instanceof Error
            ), `Actions have to always return a cursor or undefined, got ${result && result instanceof Object ? result.constructor.name : result}`);

            return ActionDescription.awaitResult(cursor, result)
                .then(resolve);
        } catch(e) {
            return resolve(cursor.error(e));
        }
    }

    static Handler(description) {
        return function(message) {
            return new Promise(resolve => {
                try {
                    const tracing = this.trace(description.name, message ? message.payload : Immutable.List());

                    Message.assert(message);
                    assert(this instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.before]'.`);
                    assert(this.isTracing, "cursor not tracing (before)");

                    if(this.trigger && !this.trigger.shouldTrigger(tracing, message)) return resolve(tracing.trace.end());

                    const triggered = this.trace.triggered();

                    return ActionDescription
                        .applyTriggers(description.before, triggered, message)
                        .then(cursor => ActionDescription.applyAction(description, message, cursor, resolve))
                        .then(cursor => ActionDescription.applyTriggers(description.done, cursor, message))
                        .then(resolve)
                        .catch(e => resolve(triggered.error(e)));
                } catch(e) {
                    return resolve(this.error(e));
                }
            });
        };
    }

    willTrigger(cursor, ...messages) {
        // Test!!
        return Immutable.List(messages)
            .every(message => (
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

    constructor(unit, name, delarativeTriggers, op = null) {
        const filtered = delarativeTriggers
            .filter(trigger => trigger.action.indexOf(name) !== -1);

        const triggers = filtered
            .filter(trigger => trigger.emits !== name);

        const ownTrigger = delarativeTriggers
            .find(trigger => trigger.emits === name);

        const func = op && op.__Action ? op : ActionDescription.Handler(this);

        func.__Action = this;

        this.unit     = unit;
        this.name     = name;
        this.op       = op;
        this.trigger  = ownTrigger;
        this.before   = triggers.filter(ActionDescription.BEFORE);
        this.progress = triggers.filter(ActionDescription.PROGRESS);
        this.cancel   = triggers.filter(ActionDescription.CANCEL);
        this.done     = triggers.filter(ActionDescription.DONE);
        this.error    = triggers.filter(ActionDescription.ERROR);
        this.func     = func;
    }

    toJS() {
        return {
            trigger:  this.trigger ? this.trigger.toJS() : null,
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

export default ActionDescription;
