import Immutable from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import assert from "assert";

class Cursor {
    static assertTraceStarted(cursor, caller) {
        assert(cursor.__data.traceStarted, `You have to start a trace with 'Cursor::trace: (string -> { name: string }) -> Cursor', before you can change it's state to '${caller}'.`);
    }

    static triggered() {
        Cursor.assertTraceStarted(this, "triggered");

        this.__data.x = this.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(x => x.triggered()));

        return this;
    }

    static error(e) {
        Cursor.assertTraceStarted(this, "errored");

        this.__data.x = this.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(x => x.errored(e)));

        this.__data.traceStarted = this.__data.x.get("_unit").isTracing();

        return this;
    }

    static end(prev) {
        if((
            prev &&
            prev.errors.size < this.errors.size
        ) || this.errors.size > 0) return this.trace.error(this.errors.last());

        Cursor.assertTraceStarted(this, "ended");

        this.__data.x = this.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(x => x.ended()));

        this.__data.traceStarted = this.__data.x.get("_unit").isTracing();

        return this;
    }

    static for(instance, description) {
        assert(instance instanceof Object, `instance has to be an object, but got ${JSON.stringify(instance)}`);
        assert(description instanceof Immutable.Map, `description has to be an Immutable.Map, but got ${JSON.stringify(description)}`);

        const inherited = function(...args) {
            Object.defineProperty(this, "__inherited", {
                enumerable:   false,
                value:        true,
                writable:     false,
                configurable: false
            });

            return Cursor.call(this, ...args);
        };

        Object.defineProperty(inherited, "name", {
            writable: true
        });

        inherited.name = `${instance.constructor.name}Cursor`;

        Object.defineProperty(inherited, "name", {
            writable: false
        });

        inherited.prototype             = Object.create(Cursor.prototype);
        inherited.prototype.constructor = inherited;

        description.forEach((action, key) => {
            Object.defineProperty(inherited.prototype, key, {
                enumerable:   false,
                configurable: false,
                writable:     false,
                value:        function(...args) {
                    return action.func.call(this, ...args);
                }
            });
        });

        return inherited;
    }

    constructor(data, prev, traceStarted = false) { // eslint-disable-line
        if(!(data instanceof Object) || data instanceof Cursor) return data;

        assert(this.__inherited, "Cursor can only be used, when inherited");

        this.__data = {
            x:            Immutable.fromJS(data),
            traceStarted: traceStarted
        };

        this.trace.triggered = Cursor.triggered.bind(this);
        this.trace.error     = Cursor.error.bind(this);
        this.trace.end       = Cursor.end.bind(this, prev);

        return Object.freeze(this);
    }

    generic(mapper) {
        return mapper(this);
    }

    get size() {
        return this.__data.x.size;
    }

    get currentMessage() {
        const message = this.__data.x.get("_unit").action;

        return message;
    }

    get currentContext() {
        return this.__data.x.get("_unit").name;
    }

    get errors() {
        return this.__data.x.get("_unit").errors;
    }

    get children() {
        return this.__data.x.get("_unit").children;
    }

    trace(...args) {
        assert(this.__data.x.get("_unit").isTracing(), "You can only call 'Cursor::trace' in the context of an arriving message. Please make sure to use this class in conjunction with 'Runtime' or to provide an 'Internals' instance to the constructor of this class, which did receive a message.");

        this.__data.x            = this.__data.x.update("_unit", internals => internals.trace(...args));
        this.__data.traceStarted = true;

        return this;
    }

    progress() {
        assert(false, "Cursor.progress: implement!");

        // hier soll der progress wert hochgesetzt werden um den gegebenen param
    }

    cancel() {
        assert(false, "Cursor.progress: implement!");

        // hiermit soll die aktuelle action gecanceled, werden + state revert
    }

    undo() {
        assert(false, "Cursor.undo: implement!");

        // hiermit soll die history en schritt zurückgesetzt werden
    }

    redo() {
        assert(false, "Cursor.redo: implement!");

        // hiermit soll ein schritt in der history nach vorne gegangen werden
    }

    toString() {
        return `${this.constructor.name}<${this.__data ? this.__data.x : this.__data}>`;
    }
}

ImmutableMethods
    .filter(key => ( // eslint-disable-line
        key.slice(0, 1) !== "_" &&
        (
            Immutable.Map.prototype[key] instanceof Function ||
            Immutable.List.prototype[key] instanceof Function ||
            Immutable.Set.prototype[key] instanceof Function ||
            Immutable.OrderedSet.prototype[key] instanceof Function ||
            Immutable.OrderedMap.prototype[key] instanceof Function ||
            Immutable.Stack.prototype[key] instanceof Function ||
            Immutable.Record.prototype[key] instanceof Function ||
            Immutable.Seq.prototype[key] instanceof Function ||
            Immutable.Iterable.prototype[key] instanceof Function ||
            Immutable.Collection.prototype[key] instanceof Function
        )
    ))
    .forEach(method => Object.defineProperty(Cursor.prototype, method, {
        enumerable:   false,
        configurable: false,
        value:        function(...args) { // eslint-disable-line
            const op = this.__data.x[method];

            assert(op instanceof Function, `Can't call ${method} on ${this.__data.x.constructor.name}`);

            const result = op.call(this.__data.x, ...args);

            return (
                result instanceof Immutable.Map ||
                result instanceof Immutable.List ||
                result instanceof Immutable.Set ||
                result instanceof Immutable.OrderedSet ||
                result instanceof Immutable.OrderedMap ||
                result instanceof Immutable.Stack ||
                result instanceof Immutable.Seq
            ) ? new this.constructor(result, this) : result;
        }
    }));

export default Cursor;
