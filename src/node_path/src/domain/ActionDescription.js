import Immutable from "immutable";
import Cursor from "./Cursor";
import assert from "assert";
import Message from "../Message";
import UnknownMessageError from "./error/UnknownMessageError";
import { schedule } from "../Runloop";
import TriggerDescription from "./TriggerDescription";
import Trigger from "./Trigger";

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

        const promise = Promise.all(triggers.map(x => cursor[x.emits] instanceof Function ? cursor[x.emits](message, x.action) : cursor).toJS());

        return promise
            .then(x => x.reduce((dest, y) => {
                return Object.assign(dest, {
                    diffs:  dest.diffs.concat(cursor.diff(y)),
                    traces: dest.traces.concat(y.traces)
                });
            }, { diffs: Immutable.Set(), traces: Immutable.List() }))
            .then(({ diffs, traces }) => cursor
                .patch(diffs.toList(), traces));
    }

    static awaitResult(cursor, result) { // eslint-disable-line
        console.log("await 1");

        if(!result)                  return Promise.resolve(cursor.trace.end());

        console.log("await 2");
        if(result instanceof Error)  return Promise.resolve(cursor.error(result));
        if(result instanceof Cursor) return Promise.resolve(result.trace.end());

        return result
            .then(ActionDescription.awaitResult.bind(null, cursor))
            .catch(ActionDescription.awaitResult.bind(null, cursor));
    }

    static applyAction(description, message, cursor, trigger) { // eslint-disable-line
        try {
            console.log("apply1", description.name);
            assert(cursor.isTracing, "cursor not tracing (before)");

            console.log("apply2", description.name);

            if(cursor.hasErrored) return Promise.resolve(cursor.trace.end());

            console.log("apply3", description.name);

            if(!description.op)   return Promise.resolve(cursor.trace.end());

            console.log("apply4", description.name);

            const result = schedule(description.op.bind(cursor, ...message.payload.toJS()), trigger.delay);

            console.log("apply5", description.name);

            assert((
                !result ||
                result instanceof Promise ||
                result instanceof Cursor ||
                result instanceof Error
            ), `Actions have to always return a cursor or undefined, got ${result && result instanceof Object ? result.constructor.name : result}`);

            console.log("apply6", description.name);

            return ActionDescription.awaitResult(cursor, result);
        } catch(e) {
            return Promise.resolve(cursor.error(e));
        }
    }

    static shouldTrigger(trigger, cursor, message) {
        if(!trigger) return { result: true, cursor };

        return trigger.shouldTrigger(cursor, message);
    }

    static Handler(description) {
        return function(y, prev = description.name) {
            const trigger = description.triggers.find(x => x.action === prev);

            return new Promise(resolve => { // eslint-disable-line
                try {
                    if(!Message.is(y)) return resolve(this
                        .trace(description.name, Immutable.List(), trigger.guards.size)
                        .error(new UnknownMessageError(y)));

                    const message = y.update("payload", payload => payload.concat(trigger.params));
                    const tracing = this.trace(description.name, message.payload, trigger.guards.size);

                    assert(this instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.before]'.`);
                    assert(this.isTracing, "cursor not tracing (before)");

                    const x = ActionDescription.shouldTrigger(trigger, tracing, message);

                    if(!x.result) return resolve(x.cursor);

                    const triggered = x.cursor.trace.triggered();

                    return ActionDescription
                        .applyTriggers(description.before, triggered, y)
                        .then(cursor => ActionDescription.applyAction(description, message, cursor, trigger))
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
        return triggers.map(x => this.guardToJS(x));
    }

    guardToJS(x) {
        return Object.assign({}, x, {
            guards: x.guards.length
        });
    }

    constructor(unit, name, declarativeTriggers, op = null) { // eslint-disable-line
        const filtered = declarativeTriggers
            .filter(trigger => trigger.action.indexOf(name) !== -1);

        const triggers = filtered
            .filter(trigger => trigger.emits !== name);

        const ownTriggers = declarativeTriggers
            .filter(trigger => trigger.emits === name);

        const func = op && op.__Action ? op : ActionDescription.Handler(this);

        func.__Action = this;

        // hier müssen bei den ganzen triggern noch dopplungen gefiltert werden:
        // this.before.filter(x => //hat keiner der anderen den auch in before?)
        //
        // dadurch würde:
        //
        // test: message
        // test2: test message
        //
        // test: message
        // test2: test, sons würde das doppelt getriggert
        console.log("constr ", ownTriggers
            .map(({ action, emits }) => [action, emits])
            .toJS(), ownTriggers
            .filter(x => x.action === name && x.emits === name)
            .map(({ action, emits }) => [action, emits])
            .toJS());

        this.unit      = unit;
        this.name      = name;
        this.op        = op;
        this.before    = triggers.filter(ActionDescription.BEFORE);
        this.progress  = triggers.filter(ActionDescription.PROGRESS);
        this.cancel    = triggers.filter(ActionDescription.CANCEL);
        this.done      = triggers.filter(ActionDescription.DONE);
        this.error     = triggers.filter(ActionDescription.ERROR);
        this.func      = func;
        this.triggers  = ownTriggers.concat(ownTriggers.filter(x => x.action === name && x.emits === name).size === 1 ? [] : [new TriggerDescription(name, new Trigger(name))]);
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

export default ActionDescription;
