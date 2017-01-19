import Immutable from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import assert from "assert";

class Cursor {
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

    constructor(data) { // eslint-disable-line
        if(!(data instanceof Object) || data instanceof Cursor) return data;

        assert(this.__inherited, "Cursor can only be used, when inherited");

        this.__data = {
            x: Immutable.fromJS(data)
        };

        Object.defineProperty(this, "size", {
            enumerable:   false,
            configurable: false,
            get:          function() {
                return this.__data.x.size;
            }
        });

        this.trace.triggered = () => this.__data.x.update("_unit", internals => internals.traceTriggered());
        this.trace.error     = e => this.__data.x.update("_unit", internals => internals.traceErrored(e));
        this.trace.end       = prev => prev.errors().size < this.errors().size ? this.trace.error(this.errors().last()) : this.__data.x.update("_unit", internals => internals.traceEnded());

        return Object.freeze(this);
    }

    generic(mapper) {
        return mapper(this);
    }

    currentMessage() {
        return this.__data.x.get("_unit").action;
    }

    errors() {
        return this.__data.x.get("_unit").errors;
    }

    trace(...args) {
        assert(false, "Cursor.trace: implement!");

        // schritte:
        // - TraceTest
        // - InternalsTest die methoden für trace
        // - Curor.errorsTest
        // - CursorTest: trace
        // diese funktion soll einerseits das trace in triggerdescription ersetzen,
        // andererseits auch vom user benutzt werden können, um eigene subtraces
        // zu erstellen, hierbei mal checken wegen baum etc, diese traces dann auch
        // in den actions benutzen
        //
        // hier muss auch end un so weitergeleitet werden

        return this.__data.x.update("_unit", internals => internals.trace(...args));
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
                result instanceof Immutable.Record ||
                result instanceof Immutable.Seq ||
                result instanceof Immutable.Iterable ||
                result instanceof Immutable.Collection
            ) ? new this.constructor(result) : result;
        }
    }));

export default Cursor;
