import { Record, List } from "immutable";
import Trace from "../telemetry/Trace";
import Cursor from "./Cursor";
import TraceNotStartedError from "./error/TraceNotStartedError";

type DebugInput = {
    traces?: List<Trace>,
    trace?:  Function,    // eslint-disable-line
    cursor?: ?Cursor
};

class Debug extends Record({
    traces:  List(),
    trace:   Function,
    _cursor: null
}) {
    assertTraceStarted(caller: string): void {
        if(!this.isTracing) throw new TraceNotStartedError(`You have to start a trace with 'Debug::trace: (string -> { name: string }) -> Cursor', before you can change it's state to '${caller}'.`);
    }

    static trace(...args: Array<*>) {
        if(!(this._cursor instanceof Cursor) || !(this._cursor.debug instanceof Debug) || !this._cursor.debug.isTracing) throw new TraceNotStartedError("You can only call 'Debug::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance, which did receive a message, to this cursor.");

        return this.startTracing(...args);
    }

    static triggered(): Cursor {
        this.assertTraceStarted("triggered");

        if(!(this._cursor instanceof Cursor)) throw new Error("lulu");

        const debug = this.updateCurrentTrace(trace => trace.triggered());

        return this._cursor.update("_unit", internals => internals.set("debug", debug));
    }

    static errored(e?: Error): Cursor {
        this.assertTraceStarted("errored");

        if(!(this._cursor instanceof Cursor)) throw new Error("lulu");
        if(!(this._cursor instanceof Cursor) && !(e instanceof Error)) throw new Error("falsch");

        const debug = this.updateCurrentTrace(trace => trace.errored(!(e instanceof Error) ? this._cursor.action.state.currentError : e));

        return this._cursor
            .update("_unit", internals => internals.set("debug", debug));
    }

    static ended(): Cursor {
        this.assertTraceStarted("ended");

        if(!(this._cursor instanceof Cursor)) throw new Error("lulu");

        const debug = this.updateCurrentTrace(trace => trace.ended());

        return this._cursor
            .update("_unit", internals => internals.set("debug", debug));
    }


    constructor(data?: DebugInput = {}) {
        super(data);

        const updated = this.set("trace", function(...args) {
            return Debug.trace.apply(this, args);
        });

        Object.defineProperties(updated.trace, {
            triggered: {
                get: function() {
                    return Debug.triggered.bind(this._debug);
                }
            },

            errored: {
                get: function() {
                    return Debug.errored.bind(this._debug);
                }
            },

            ended: {
                get: function() {
                    return Debug.ended.bind(this._debug);
                }
            }
        });

        return updated;
    }

    startTracing(name: string, params?: List<*> = List(), guards?: number = 0, trigger: ?string) {
        if(!(this._cursor instanceof Cursor)) throw new Error("lulu");

        const current = this.currentTrace;
        const parent  = current ? current.id : current;
        const id      = null;
        const start   = null;
        const unit    = this._cursor._unit.name;
        const debug   = this.update("traces", traces => traces.push(new Trace({
            name,
            params,
            guards,
            trigger,
            parent,
            id,
            start
        }, unit)));

        return this._cursor
            .update("_unit", internals => internals.set("debug", debug.setCursor(null)));
    }

    updateCurrentTrace(op: Trace => Trace): Debug {
        const current = this.currentTrace;

        if(!current) return this;

        const key = this.traces.findLastKey(x => x.end === null && !x.locked);

        return this
            .update("traces", traces => traces.set(key, op(current)))
            .setCursor(null);
    }

    endTracing(): Debug {
        const filtered = this.traces.filter(x => !x.locked);
        const trace    = filtered
            .shift()
            .reduce((dest, x) => dest.addSubtrace(x), filtered.first().ended());

        return this
            .update("traces", traces => traces.filter(x => x.locked).push(trace.lock()));
    }


    get currentTrace(): ?Trace {
        return this.traces.findLast(x => x.end === null && !x.locked);
    }

    get isTracing(): boolean {
        return this.currentTrace instanceof Trace;
    }

    setCursor(cursor: Cursor): Debug {
        const updated = this.set("_cursor", cursor);

        this.trace._debug = updated;

        return updated;
    }

    toJS() {
        const debug = super.toJS.call(this);

        delete debug.trace;

        return debug;
    }
}

export default Debug;

