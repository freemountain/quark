import Cursor from "./Cursor";
import assert from "assert";

export default class Transformation {
    constructor({ args, op }) {
        this.op   = op;
        this.args = args.map(arg => arg instanceof Function ? (...args2) => arg(...args2.map(data => Cursor.of(data))) : arg);
    }

    compute(data) {
        const cursor = Cursor.of(data);
        const action = cursor[this.op];

        if(!action) return assert(false, `Expected an action for '${this.op}' with ${data}`);

        return action.apply(cursor, this.args);
    }
}
