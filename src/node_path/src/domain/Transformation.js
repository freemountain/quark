import Cursor from "./Cursor";
import assert from "assert";
import printPublicMethods from "../util/printPublicMethods";
import Immutable from "immutable";

export default class Transformation {
    constructor({ args, op }) {
        this.op   = op;
        this.args = args.map(arg => arg instanceof Function ? (deps, ...args2) => arg(...args2.map(data => Cursor.of(data)), deps) : arg);
    }

    shouldExtract(data) {
        return (
            data instanceof Immutable.List &&
            data.first() instanceof Immutable.List &&
            this.op !== "join"
        );
    }

    compute(data, deps = {}) {
        const extracted = this.shouldExtract(data) ? data.first() : data;
        const cursor    = Cursor.of(extracted);
        const action    = cursor[this.op];

        if(!action || !(action instanceof Function)) return assert(false, `\n\tYou are trying to apply the non-existing method '${this.op}' on \n\t\t${data}.\n\n\tTry one of these instead: ${printPublicMethods(data)}.`);

        return action.apply(cursor, this.args.map(arg => arg instanceof Function ? (...args) => arg(deps, ...args) : arg));
    }
}
