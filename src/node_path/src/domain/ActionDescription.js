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

    static applyTriggers(triggers, cursor, params) {
        const promise = Promise.all(triggers.map(x => x.apply(cursor, params)));

        return promise
            .then(x => x
                .map(y => cursor.diff(y))
                .reduce((dest, y) => {
                    return dest.concat(y);
                }, Immutable.List())
                .toList())
            .then(diffs => {
                return cursor.patch(diffs);
            });
    }

    static Handler(description) { // eslint-disable-line
        return function(message) { // eslint-disable-line
            return new Promise((resolve, reject) => { // eslint-disable-line
                try {
                    Message.assert(message);
                    assert(this instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.before]'.`);

                    // TODO: ab hier fängt dann an schief zu gehen, sobald die
                    // triggers ins spiel kommen: hier beim ActionDescriptionTest
                    // ansetzen
                    // return resolve(this);

                    assert(false, "ab hier weiter, hier vor allem die errorfälle vernünftig behandelt, dat klappt hinten un vorne nit die scheiße");

                    return ActionDescription
                        .applyTriggers(description.before, this, message.payload, reject)
                        .then(cursor => {
                            if(cursor.hasErrored) return resolve(cursor);
                            // console.log("####### lulululu ######", cursor.hasErrored);

                            // check guards
                            // trigger op and merge, wenn keine op, einfach weiterleiten
                            // --> hierzu muss im konstruktor noch die eigentliche op gefiltert werden

                            // trigger done stuff oder error stuff
                            // assert(cursor instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.done]'.`);
                            // return resolve(cursor);

                            return resolve(this);
                        });
                } catch(e) {
                    return reject(e);
                }
            });
        };
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

        this.unit     = unit;
        this.name     = name;
        this.op       = op;
        this.before   = triggers.filter(ActionDescription.BEFORE);
        this.progress = triggers.filter(ActionDescription.PROGRESS);
        this.cancel   = triggers.filter(ActionDescription.CANCEL);
        this.done     = triggers.filter(ActionDescription.DONE);
        this.error    = triggers.filter(ActionDescription.ERROR);
        this.func     = ActionDescription.Handler(this);
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
