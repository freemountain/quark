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

    static trace(unit: string, name: string, params: List<*>, trigger: ?string, guards: ?number = 0) {
        if(this._cursor instanceof Cursor && !this._cursor.debug.isTracing) throw new TraceNotStartedError("You can only call 'Cursor::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance to the constructor of this class, which did receive a message.");

        const current = this.currentTrace;
        const parent  = current ? current.id : current;
        const id      = null;
        const start   = null;
        const debug   = this.update("traces", traces => traces.push(new Trace({
            name,
            params,
            guards,
            trigger,
            parent,
            id,
            start
        }, this._cursor instanceof Cursor ? this._cursor._unit.name : unit))).setCursor(null);

        return !(this._cursor instanceof Cursor) ? debug : this._cursor
            .update("_unit", internals => internals.set("debug", debug));
    }

    static triggered(): Cursor {
        this.assertTraceStarted("triggered");

        const debug = this.updateCurrentTrace(trace => trace.triggered());

        return !(this._cursor instanceof Cursor) ? debug : this._cursor
            .update("_unit", internals => internals.set("debug", debug));
    }

    static errored(e: Error): Cursor {
        this.assertTraceStarted("errored");

        const debug = this.updateCurrentTrace(trace => trace.errored(e));

        return !(this._cursor instanceof Cursor) ? debug : this._cursor
            .update("_unit", internals => internals.set("debug", debug));
    }

    static ended(): Cursor {
        this.assertTraceStarted("ended");

        const debug = this.updateCurrentTrace(trace => trace.ended());

        return !(this._cursor instanceof Cursor) ? debug : this._cursor
            .update("_unit", internals => internals.set("debug", debug));
    }


    constructor(data?: DebugInput = {}) {
        super(data);

        // trace.triggered = Debug.triggered.bind(this);
        // this.trace.error     = Cursor.error.bind(null, this);
        // this.trace.end       = Cursor.end.bind(null, this);
        //
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

    updateCurrentTrace(op: Trace => Trace): Debug {
        const current = this.currentTrace;

        if(!current) return this;

        const key = this.traces.findLastKey(x => x.end === null && !x.locked);

        return this
            .update("traces", traces => traces.set(key, op(current)))
            .setCursor(null);
    }

    compactTraces(): Debug {
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

