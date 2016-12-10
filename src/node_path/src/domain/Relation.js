export default class Relation {
    static JOINED = "JOINED";
    static SELF   = "SELF";   // eslint-disable-line
    static INDIE  = "INDIE";  // eslint-disable-line

    static Cascades = {
        ALL:    "ALL",
        POST:   "POST",
        PUT:    "PUT",
        DELETE: "DELETE"
    };

    constructor(name, tag = Relation.SELF, cascades = []) {
        this.name     = name;
        this.cascades = cascades;
        this.tag      = tag;
    }

    setCascades(cascades) {
        const hasAll = cascades.filter(x => x === Relation.Cascades.ALL).length > 0;
        const mapped = hasAll ? Object.keys(Relation.Cascades).filter(x => x !== Relation.Cascades.ALL) : cascades;

        return new Relation(this.name, this.tag, mapped);
    }
}
