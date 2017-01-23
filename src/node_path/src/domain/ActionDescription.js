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
        const promise = Promise.all(triggers.map(x => x.apply(cursor, message)));

        return promise
            .then(x => x.reduce((dest, y) => Object.assign(dest, {
                diffs:  dest.diffs.concat(cursor.diff(y)),
                traces: dest.traces.concat(y.get("_unit").get("traces"))
            }), { diffs: Immutable.Set(), traces: Immutable.Stack() }))
            .then(({ diffs, traces }) => cursor
                .patch(diffs.toList())
                .update("_unit", internals => internals.set("traces", traces)));
    }

    static Handler(description) {
        return function(message) {
            return new Promise((resolve, reject) => {
                try {
                    Message.assert(message);
                    assert(this instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.before]'.`);

                    // TODO: ab hier fängt dann an schief zu gehen, sobald die
                    // triggers ins spiel kommen:
                    // - beim ActionDescriptionTest ansetzen

                    return ActionDescription
                        // hier muss die ganze message runtergegeben werden
                        .applyTriggers(description.before, this, message)
                        .then(cursor => {
                            if(cursor.hasErrored) return resolve(cursor);

                            assert(false, "ab hier weiter");
                            // check guards
                            // trigger op and merge, wenn keine op, einfach weiterleiten
                            // --> hierzu muss im konstruktor noch die eigentliche op gefiltert werden

                            // trigger done stuff oder error stuff
                            // assert(cursor instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.done]'.`);
                            // return resolve(cursor);

                            return resolve(this);
                        })
                        .catch(reject);
                } catch(e) {
                    return reject(e);
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
        const triggers = delarativeTriggers
            .filter(trigger => trigger.action.indexOf(name) !== -1)
            .filter(trigger => trigger.emits !== name);

        const func = ActionDescription.Handler(this);

        this.unit     = unit;
        this.name     = name;
        this.op       = op;
        this.before   = triggers.filter(ActionDescription.BEFORE);
        this.progress = triggers.filter(ActionDescription.PROGRESS);
        this.cancel   = triggers.filter(ActionDescription.CANCEL);
        this.done     = triggers.filter(ActionDescription.DONE);
        this.error    = triggers.filter(ActionDescription.ERROR);
        this.func     = func;
    }

    toJS() {
        return {
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
