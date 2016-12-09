import Cursor from "./Cursor";

export default class Transformation {
    constructor({ args, op }) {
        this.op   = op;
        this.args = args.map(arg => arg instanceof Function ? (...args2) => arg(...args2.map(data => Cursor.of(data))) : arg);
    }
}
