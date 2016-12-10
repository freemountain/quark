import Cursor from "./Cursor";
import assert from "assert";
import printMethods from "../util/printMethods";

export default class Transformation {
    constructor({ args, op }) {
        this.op   = op;
        this.args = args.map(arg => arg instanceof Function ? (deps, ...args2) => arg(...args2.map(data => Cursor.of(data)), deps) : arg);
    }

    compute(data, deps = {}) {
        const cursor = Cursor.of(data);
        const action = cursor[this.op];

        if(!action || !(action instanceof Function)) return assert(false, `\n\tYou are trying to apply the non-existing method '${this.op}' on \n\t\t${data}.\n\n\tTry one of these instead: ${printMethods(data)}.`);

        return action.apply(cursor, this.args.map(arg => arg instanceof Function ? (...args) => arg(deps, ...args) : arg));
    }
}
