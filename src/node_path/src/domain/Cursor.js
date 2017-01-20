import Immutable from "immutable";
import ImmutableMethods from "../util/ImmutableMethods";
import assert from "assert";

class Cursor {
    static triggered() {
        const data = this.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(x => x.triggered()));

        return new this.constructor(data, this);
    }

    static error(e) {
        const data = this.__data.x
            .update("_unit", internals => internals.updateCurrentTrace(x => x.errored(e)));

        return new this.constructor(data, this);
    }

    static end(prev) {
        if((
            prev &&
            prev.errors.size < this.errors.size
        ) || this.errors.size > 0) return this.trace.error(this.errors.last());

        const data = this.__data.x.update("_unit", internals => internals.updateCurrentTrace(x => x.ended()));

        return new this.constructor(data, this);
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

    constructor(data, prev) { // eslint-disable-line
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

        console.log("###Cursor.constructor ", this.__data.x.toJS());
        this.trace.triggered = Cursor.triggered.bind(this);
        this.trace.error     = Cursor.error.bind(this);
        this.trace.end       = Cursor.end.bind(this, prev);

        return Object.freeze(this);
    }

    generic(mapper) {
        return mapper(this);
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
        assert(false, "Cursor.children: implement!");

        return this.__data.x.get("_unit").children;
    }

    trace(...args) {
        // schritte:
        // - CursorTest: trace
        // diese funktion soll einerseits das trace in triggerdescription ersetzen,
        // andererseits auch vom user benutzt werden können, um eigene subtraces
        // zu erstellen, hierbei mal checken wegen baum etc, diese traces dann auch
        // in den actions benutzen
        // - message.willTrigger
        // - cursor.children setzen
        //
        // hier muss auch end un so weitergeleitet werden

        return new this.constructor(this.__data.x.update("_unit", internals => internals.trace(...args)), this);
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
            ) ? new this.constructor(result, this) : result;
        }
    }));

export default Cursor;
