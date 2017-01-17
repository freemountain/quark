import Cursor from "./Cursor2";
import assert from "assert";
import printPublicMethods from "../util/printPublicMethods";
import Immutable from "immutable";

/**
 * this class represents a transformation of data.
 * Compute takes an Immutable.Collection and an object
 * of independent dependencies to apply it on.
 *
 * @author Marco Sliwa <marco@circle.ai>
 * @example
 * const transformation = new Transformation({
 *     op:   "map",
 *     args: [(arg, { acc }) => arg.x + acc]
 * });
 *
 * const data = Immutable.Map({
 *     test: {
 *         x: 1
 *     }
 * });
 *
 * const independent = {
 *     acc: 2
 * };
 *
 * const list = transformation.compute(data.toList(), independent);
 * const map  = transformation.compute(data);
 *
 * console.log(list.toJS()); // prints [3]
 * console.log(map.toJS());  // prints { test: 3 }
 */
export default class Transformation {

    /**
     * constructs a transformation from op and args
     *
     * @param {{ op: string, args: array}} first description of transformation
     */
    constructor({ args, op }) {
        /** @private */ // eslint-disable-line
        this.op   = op;

        /** @private */
        this.args = args.map(arg => arg instanceof Function ? (deps, ...args2) => arg(...args2.map(data => Cursor.of(data)), deps) : arg);
    }

    /**
     * checks if data should be extracted
     *
     * @private
     * @param   {*}       data to check
     * @return  {boolean}
     */
    shouldExtract(data) {
        return (
            data instanceof Immutable.List &&
            data.first() instanceof Immutable.List &&
            this.op !== "join"
        );
    }

    /**
     * computes a transformation with the data to be
     * transformed and some independent stuff
     *
     * @param  {Immutable.Collection} data for computation
     * @param  {?object}              deps for computation
     * @return {*}
     */
    compute(data, deps = {}) {
        const extracted = this.shouldExtract(data) ? data.first() : data;
        const cursor    = Cursor.of(extracted);
        const action    = cursor[this.op];

        if(!action || !(action instanceof Function)) return assert(false, `\n\tYou are trying to apply the non-existing method '${this.op}' on \n\t\t${data}.\n\n\tTry one of these instead: ${printPublicMethods(data)}.`);

        return action.apply(cursor, this.args.map(arg => arg instanceof Function ? (...args) => arg(deps, ...args) : arg));
    }
}
