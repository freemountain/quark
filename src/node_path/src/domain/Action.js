// @flow
import { List } from "immutable";
import Cursor from "./Cursor";
import Message from "../Message";
import UnknownMessageError from "./error/UnknownMessageError";
import Trigger from "./Trigger";
import DeclaredTrigger from "./DeclaredTrigger";
import InvalidCursorError from "./error/InvalidCursorError";
import unboxResult from "../util/unboxResult";

type Kind    = "before" | "cancel" | "progress" | "done" | "error"; // eslint-disable-line
type Handler = (y?: Message) => Promise<Cursor>;

type ActionInput = {
    unit:     string,        // eslint-disable-line
    name:     string,        // eslint-disable-line
    op:       any,           // eslint-disable-line
    before:   List<Trigger>, // eslint-disable-line
    progress: List<Trigger>,
    cancel:   List<Trigger>, // eslint-disable-line
    done:     List<Trigger>, // eslint-disable-line
    error:    List<Trigger>, // eslint-disable-line
    triggers: List<Trigger>,
    func:     Handler        // eslint-disable-line
};

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
    func:     Handler;        // eslint-disable-line

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

    static wrap(key: string, description: Action): Handler {
        return Action.isLifeCycleHandler(key) ? Action.LifecycleHandler(description) : Action.Handler(description);
    }

    static LifecycleHandler(description: Action): Handler {
        return function(data?: Message): Promise<Cursor> { // eslint-disable-line
            if(!(this instanceof Cursor)) return Promise.reject(new InvalidCursorError(this, description));

            const message = data instanceof Message ? data : this.message;

            if(!Message.is(message)) return Promise
                .reject(new UnknownMessageError(description.unit, description.name, message));

            try {
                if(!(description.op instanceof Function)) return Promise.resolve(this);

                const result = description.op.call(this, ...message.unboxPayload());

                return unboxResult(this, result);
            } catch(e) {
                return Promise.reject(e);
            }
        };
    }

    static Handler(description: Action): Handler {
        return function(data?: Message): Promise<Cursor> { // eslint-disable-line
            if(!(this instanceof Cursor)) return Promise.reject(new InvalidCursorError(this, description));

            const message = data instanceof Message ? data : this.message;

            if(!Message.is(message))            return Promise.resolve(this
                .debug.trace(description.name, List(), 0, this.action.state.type)
                .action.state.error(new UnknownMessageError(description.unit, description.name, message))
                .debug.trace.errored());

            try {
                return this.send.message(description, message)
                    .catch(e => this
                        .debug.trace(description.name, List(), this.action.guard.count, this.action.state.type)
                        .action.state.error(e)
                        .debug.trace.errored());
            } catch(e) {
                return Promise.resolve(this
                    .debug.trace(description.name, List(), this.action.guard.count, this.action.state.type)
                    .action.state.error(e)
                    .debug.trace.errored());
            }
        };
    }

    static isLifeCycleHandler(key: string): boolean { // eslint-disable-line
        return (
            key === "handle" ||
            key === "after" ||
            key === "error" ||
            key === "done" ||
            key === "finish" ||
            key === "before" ||
            key === "guards" ||
            key === "triggers" ||
            key === "diff" ||
            key === "finish" ||
            key === "receive" ||
            key === "message"
        );
    }

    static shouldWrap(key: string, op: any) {
        return (!op || !op.__Action);
    }

    constructor(unit: string | ActionInput, name?: string = "", declarativeTriggers?: List<Trigger> = List(), op: any = null) { // eslint-disable-line
        if(typeof unit !== "string") return Object.freeze(Object.assign(this, unit));

        const filtered = declarativeTriggers
            .filter(trigger => trigger.action.split(".")[0] === name);

        const triggers = filtered
            .filter(trigger => trigger.emits !== name);

        const ownTriggers = declarativeTriggers
            .filter(trigger => trigger.emits === name);

        const func = Action.shouldWrap(name, op) ? Action.wrap(name, this) : op;

        func.__Action = this;

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

    setUnit(unit: string): Action {
        return new Action(Object.assign({}, this, { unit }));
    }

    willTrigger(cursor: Cursor, ...messages: Array<Message>): boolean { // eslint-disable-line
        // Test!!
        return List(messages).every(message => ( // eslint-disable-line
            (this.triggers.has(message.resource) && this.triggers.get(message.resource).shouldTrigger(cursor, message.unboxPayload())) ||
            (this.before.has(message.resource) && this.before.get(message.resource).shouldTrigger(cursor, message.unboxPayload())) ||
            (this.progress.has(message.resource) && this.progress.get(message.resource).shouldTrigger(cursor, message.unboxPayload())) ||
            (this.cancel.has(message.resource) && this.cancel.get(message.resource).shouldTrigger(cursor, message.unboxPayload())) ||
            (this.done.has(message.resource) && this.done.get(message.resource).shouldTrigger(cursor, message.unboxPayload())) ||
            (this.error.has(message.resource) && this.error.get(message.resource).shouldTrigger(cursor, message.unboxPayload()))
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

        return trigger || this.triggers.find(x => x.action === this.name);
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
