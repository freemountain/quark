import curry from "lodash.curry";
import Immutable from "immutable";
import patch from "immutablepatch";
import diff from "immutablediff";
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
        const diffs = triggers
            .map(x => diff(cursor, x.apply(cursor, params)))
            .reduce((dest, x) => dest.concat(x), Immutable.Set());

        return patch(cursor, diffs.toList());
    }

    static Handler(description, message) {
        return new Promise((resolve, reject) => {
            try {
                // hier is noch iwie unhandled promise rejection shit, wenn das failed
                //
                // hier muss es aufm cursor ne methode trace() geben, hierfür muss der cursor
                // auch mehr infos über den kontext kriegen wahrscheinlich
                Message.assert(message);
                assert(this instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.before]'.`);

                console.log("####huhuhu", message.resource, message.payload.constructor.name);
                // vorher das mit property auch regeln (propertyTest etc),
                const cursor = ActionDescription.applyTriggers(description.before, this, message.payload); // eslint-disable-line

                // check guards
                // trigger op and merge, wenn keine op, einfach weiterleiten
                // --> hierzu muss im konstruktor noch die eigentliche op gefiltert werden

                // trigger done stuff oder error stuff
                assert(cursor instanceof Cursor, `Invalid cursor of ${Object.getPrototypeOf(this)} for '${description.unit}[${description.name}.done]'.`);
                return resolve(this);
            } catch(e) {
                return reject(e);
            }
        });
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

ActionDescription.Handler = curry(ActionDescription.Handler, 2);

export default ActionDescription;
