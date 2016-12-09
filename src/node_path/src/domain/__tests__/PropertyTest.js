import Property from "../Property";
import { expect } from "chai";
import Immutable from "immutable";

describe("PropertyTest", function() {
    it("creates a property", function() {
        const reducer   = (dest, y) => dest + y;
        const property  = Property.derive(({ counter, acc }) => counter + acc);
        const property2 = Property.derive(x => x.get("acc") + x.get("counter"));
        const property3 = Property.derive(x => x.reduce(reducer, 0));

        expect(property.compute(Immutable.fromJS({ counter: 1, acc: 2 }))).to.equal(3);
        expect(property.compute(Immutable.fromJS({ counter: 3, acc: 2 }))).to.equal(5);
        expect(property2.compute(Immutable.fromJS({ counter: 1, acc: 2 }))).to.equal(3);
        expect(property2.compute(Immutable.fromJS({ counter: 3, acc: 2 }))).to.equal(5);
        expect(property3.compute(Immutable.fromJS({ counter: 1, acc: 2 }))).to.equal(3);
        expect(property3.compute(Immutable.fromJS({ counter: 3, acc: 2 }))).to.equal(5);
    });

    it("creates a property with declarative constructor", function() {
        // FIXME: tap fügt sich iwie noch nich richtig ein, komisch??

        const property = Property.derive
            .from("*")
            .filter(({ id }) => id > 0)
            .tap(console.log.bind(console))
            .filter(x => x.id < 3)
            .map(x => x.get("name"))
            .reduce((dest, name) => `${dest}, ${name}`, "")
            .slice(2);

        expect(property.compute(Immutable.fromJS({
            0: {
                id:   0,
                name: "jupp"
            },

            1: {
                id:   1,
                name: "in"
            },

            2: {
                id:   2,
                name: "chantalle"
            },

            3: {
                id:   3,
                name: "wayne"
            }
        }))).to.equal("in, chantalle");
        // expect(property.compute(Immutable.fromJS({ counter: 3, acc: 2 }))).to.equal(5);
    });
});
