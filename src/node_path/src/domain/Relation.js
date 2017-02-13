// @flow

/**
 * this class represents a relation to some
 * other value in a domain. the enum represents
 * the type of the relation, while Cascades shows
 * how updates are triggered. A relation saves a name
 * (of the key it relates to) a type, a key it is
 * merged into (only Join) and the cascades it has to
 * the related data
 *
 * @author Marco Sliwa <marco@circle.ai>
 * @example
 * const relation  = new Relation("test");
 * const cascading = relation.setCascades(["PUT"]);
 * const prefixed  = relation.setPrefix("prefix");
 * const joined    = new Relation("test", Relation.JOINED, "key");
 *
 * console.log(relation);  // prints Relation  { name: "test", tag: "SELF", key: null, cascades: [] }
 * console.log(cascading); // prints Relation  { name: "test", tag: "SELF", key: null, cascades: ["PUT"] }
 * console.log(prefixed);  // prints Relation  { name: "prefix.test", tag: "SELF", key: null, cascades: [] }
 * console.log(joined);    // prints Relation  { name: "test", tag: "JOINED", key: "key", cascades: [] }
 */
export default class Relation {
    name:     string;        // eslint-disable-line
    cascades: Array<string>;
    tag:      string;        // eslint-disable-line
    key:      ?string;       // eslint-disable-line

    static JOINED = "JOINED";
    static SELF   = "SELF";   // eslint-disable-line
    static INDIE  = "INDIE";  // eslint-disable-line

    static Cascades = {
        ALL:    "ALL",
        POST:   "POST",
        PUT:    "PUT",
        DELETE: "DELETE"
    };

    /**
     * constructor for relations - takes at minimum a name.
     * if its a joined relation, a key needs to be set.
     *
     * @param {string}   name          of related key
     * @param {string}   tag           of relation (JOINED, SELF or INDIE)
     * @param {?string}  [key]         to merge into (only JOINED)
     * @param {string[]} [cascades=[]] to related values
     */
    constructor(name: string, tag?: string = Relation.SELF, key?: ?string = null, cascades?: Array<string> = []) {
        /** @type {string} */ // eslint-disable-line
        this.name = name;

        /** @type {string[]} */
        this.cascades = cascades;

        /** @type {string} */
        this.tag = tag;

        /** @type {?string} */
        this.key = key;
    }

    /**
     * sets cascades and returns a new Relation
     *
     * @param  {string[]} cascades for relation
     * @return {Relation}
     */
    setCascades(cascades: Array<string>): Relation {
        const hasAll = cascades.filter(x => x === Relation.Cascades.ALL).length > 0;
        const mapped = hasAll ? Object.keys(Relation.Cascades).filter(x => x !== Relation.Cascades.ALL) : cascades;

        return new Relation(this.name, this.tag, this.key, mapped);
    }

    /**
     * adds a prefix to the related key
     *
     * @param  {string}  prefix for key
     * @return {Relation}
     */
    setPrefix(prefix: string): Relation {
        return new Relation(`${prefix}.${this.name}`, this.tag, this.key, this.cascades);
    }
}
