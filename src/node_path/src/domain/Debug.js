import { Record, List } from "immutable";
import Trace from "../telemetry/Trace";

type DebugInput = {
    traces?: List<Trace>
};

export default class Debug extends Record({
    traces: List()
}) {
    constructor(data: DebugInput) {
        super(data);
    }

    updateCurrentTrace(op: Trace => Trace): Debug {
        const current = this.trace;

        if(!current) return this;

        const key = this.traces.findLastKey(x => x.end === null && !x.locked);

        return this.update("traces", traces => traces.set(key, op(current)));
    }

    startTrace(unit: string, name: string, params: List<*>, trigger: ?string, guards: ?number = 0) {
        const current = this.trace;
        const parent  = current ? current.id : current;
        const id      = null;
        const start   = null;

        return this.update("traces", traces => traces.push(new Trace({
            name,
            params,
            guards,
            trigger,
            parent,
            id,
            start
        }, unit)));
    }

    compactTraces(): Debug {
        const filtered = this.traces.filter(x => !x.locked);
        const trace    = filtered
            .shift()
            .reduce((dest, x) => dest.addSubtrace(x), filtered.first().ended());

        return this
            .update("traces", traces => traces.filter(x => x.locked).push(trace.lock()));
    }


    get trace(): ?Trace {
        return this.traces.findLast(x => x.end === null && !x.locked);
    }

    get isTracing(): boolean {
        return this.trace instanceof Trace;
    }
}
