import curry from "lodash.curry";

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

    static Handler(description, ...params) {
        return new Promise((resolve, reject) => {
            try {
                // console.log("### ActionDescription.Handler ", params[0]);
                // trigger before stuff
                // check guards
                // trigger op and merge, wenn keine op, einfach weiterleiten
                // trigger done stuff oder error stuff

                return resolve(params[0].get("payload"));
            } catch(e) {
                return reject(e);
            }
        });
    }

    static guardsToJS(triggers) {
        return triggers.map(x => Object.assign({}, x, {
            guards: x.guards.length
        }));
    }

    constructor(name, delarativeTriggers, op = null) {
        const triggers = delarativeTriggers
            .filter(trigger => trigger.action.indexOf(name) !== -1)
            .filter(trigger => trigger.emits !== name);

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
            name:     this.name,
            before:   ActionDescription.guardsToJS(this.before.toJS()),
            progress: ActionDescription.guardsToJS(this.progress.toJS()),
            cancel:   ActionDescription.guardsToJS(this.cancel.toJS()),
            done:     ActionDescription.guardsToJS(this.done.toJS()),
            error:    ActionDescription.guardsToJS(this.error.toJS())
        };
    }
}

ActionDescription.Handler = curry(ActionDescription.Handler, 2);

export default ActionDescription;
