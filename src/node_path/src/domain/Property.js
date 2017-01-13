import Immutable from "immutable";
import set from "lodash.set";
import Transformation from "./Transformation";
import assert from "assert";
import Relation from "./Relation";
import Join from "./Join";
import ImmutableMethods from "../util/ImmutableMethods";
import Trigger from "./Trigger2";

/**
 * This class describes a property, derived from some parent
 * state. It's used to offer a declarative and intuitive
 * interface to describe the transformations needed to arrive
 * at the desired property.
 *
 * @author Marco Sliwa <marco@circle.ai>
 * @example
 * Property.derive
 *      .from("users")
 *      .join("messages")
 *          .on((user, message => user.message === message.id)
 *      .filter(...)
 *      .map(...)
 *      .sort(...)
 *      .first()
 */
class Property {

    /**
     * overloaded user facing constructor for properties
     *
     * @param   {function(state: Immutable.Collection): *} mapper used to arrive at desired prop
     * @returns {Property}
     */
    static derive = set(mapper => new Property(Immutable.List(), [new Transformation({
        op:   "generic",
        args: [mapper]
    })]), "from", (...aliases) => new Property(Immutable.List(aliases)
        .filter(alias => alias !== "*")
        .map((alias, idx) => new Relation(alias, idx === 0 ? Relation.SELF : Relation.INDIE))))

    /**
     * constructor, takes a list of relations, transformations
     * and a current relation, which is used for assigning
     * successive cascade calls to it.
     *
     * @param {Relation[]}       relations            relational data
     * @param {Transformation[]} [transformations=[]] transformations to apply on data
     * @param {?Relation}        [current]            current relation
     */
    constructor(relations, transformations = [], current) {
        /** @private */ // eslint-disable-line
        this.relations = relations;

        /** @private */
        this.transformations = transformations;

        /** @private */
        this.current = current;
    }

    /**
     * prefixes all relation selectors
     *
     * @param  {string}   prefix for relations
     * @return {Property}
     */
    setPrefix(prefix) {
        return new Property(this.relations.map(relation => relation.setPrefix(prefix)), this.transformations, this.current ? this.current.setPrefix(prefix) : this.current);
    }

    /**
     * extract the relational data from the parent state
     *
     * @private
     * @param  {Immutable.Map | Immutable.List} parent state
     * @return {Property}
     */
    dataForRelations(parent) {
        const mapped = this.relations
            .filter(x => x.tag === Relation.JOINED || x.tag === Relation.SELF)
            .map(({ name }) => name
                .split(".")
                .reduce((dest, key) => {
                    assert(dest && dest.get instanceof Function, `trying to access unknown key '${key}' from path '${name}' on ${parent}`);
                    return dest.get(key);
                }, parent));

        return mapped
            .slice(0, 1)
            .concat(mapped.slice(1).reverse());
    }

    /**
     * receive parent state and recompute
     *
     * @param  {Immutable.Collection} parent state
     * @return {Property}
     */
    receive(parent) {
        const values = this.relations.isEmpty() ? parent : this.dataForRelations(parent);
        const indies = this.relations
            .filter(({ tag }) => tag === Relation.INDIE)
            .map(({ name }) => name.split(".").reduce((dest, key) => dest.get(key), parent))
            .reduce((dest, x) => dest.set(x.name, x), Immutable.Map())
            .toObject();

        const result = this.transformations.reduce((dest, transformation) => transformation.compute(dest, indies), Immutable.fromJS(values));

        return result;
    }

    /**
     * adds a transformation to this Property
     *
     * @private
     * @param  {string}   op   operation to be applied
     * @param  {...*}     args for operation
     * @return {Property}
     */
    addTransformation(op, ...args) {
        return new Property(this.relations, this.transformations.concat(new Transformation({
            op:   op,
            args: args
        })), this.current);
    }

    /**
     * returns the dependencies of this computed
     * property
     *
     * @return {string[]}
     */
    getDependencies() {
        const props = `props.${Trigger.DONE}`;

        return this.relations.isEmpty() ? Immutable.List.of(props) : this.relations
            .map(x => `${x.name}.${Trigger.DONE}`)
            .concat(props).toSet().toList();
    }

    /**
     * sets the current value on the property
     *
     * @private
     * @param  {Relation} current relation
     * @return {Property}
     */
    setCurrent(current) {
        return new Property(this.relations, this.transformations, current);
    }

    /**
     * taps into the function chain, eg to log
     * the current state of the transformation
     *
     * @param  {function} tapper callback
     * @return {Property}
     */
    tap(tapper) {
        return this.addTransformation("generic", cursor => {
            tapper(cursor);
            return cursor;
        });
    }

    /**
     * adds cascades to the current relation
     *
     * @param  {...string} cascades for current relation
     * @return {Property}
     */
    cascade(...cascades) {
        assert(this.current);

        const key   = this.relations.findKey(x => x.name === this.current.name);
        const value = this.current.setCascades(cascades);

        return new Property(this.relations.set(key, value), this.transformations);
    }
}

/**
 * this function is used in conjunction to joins. It creates
 * a new property containing the relation
 *
 * @param  {string}                   alias     for relation
 * @param  {string}                   key       to be set with relation
 * @param  {function(args: *) : boolean} predicate to join on
 * @return {Property}
 */
const on = function on(alias, key, predicate) {
    const current   = new Relation(alias, Relation.JOINED, key);
    const relations = this.relations.push(current);

    return new Property(relations, this.transformations, this.current)
        .setCurrent(current)
        .addTransformation("join", Join.of(current, relations.first(), predicate));
};

/**
 * this has to be defined like this, because join
 * can be used as a selector and as a function, thats
 * why, we need to implement a getter
 */
Object.defineProperty(Property.prototype, "join", {
    enumerable:   false,
    configurable: false,
    get:          function join() {
        assert(this.relations.size > 0, "You are trying to do an illegal join. If you are just operating on the whole domain, joins have to be done manually");

        return set(name => ({
            on: on.bind(this, name)
        }), "self", {
            on: on.bind(this, this.relations.first().name)
        });
    }
});

/**
 * we add proxies for all public immutable methods
 */
ImmutableMethods
    .filter(key => (
        key !== "join" &&
        key.slice(0, 1) !== "_" &&
        (
            Immutable.Map.prototype[key] instanceof Function ||
            Immutable.List.prototype[key] instanceof Function
        )
    ))
    .forEach(method => Object.defineProperty(Property.prototype, method, {
        enumerable:   false,
        writable:     false,
        configurable: false,
        value:        function(...args) {
            return this.addTransformation(method, ...args);
        }
    }));

export default Property;
