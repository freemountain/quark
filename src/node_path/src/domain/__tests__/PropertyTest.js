import Property from "../Property";
import { expect } from "chai";
import Immutable from "immutable";
import sinon from "sinon";

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
        const spy      = sinon.spy();
        const property = Property.derive
            .from("*")
            .filter(({ id }) => id > 0)
            .filter(x => x.id < 3)
            .tap(spy)
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

        expect(spy.getCall(0).args[0].toJS()).to.eql({
            1: {
                id:   1,
                name: "in"
            },

            2: {
                id:   2,
                name: "chantalle"
            }
        });
    });

    it("creates a property with declarative constructor (2)", function() {
        // TODO: wie krieg ich abhängigkeiten von anderen props hin?
        // zB bei sort nen sorter?
        //
        // idee: from("users", "sorter", "x")
        //          .join("messages")
        //          .on("message", ...) <- joins gehen immer nur in den ersten des tupels
        //          .sort((a, b, { sorter }) => sorter(a, b))
        //
        // Des weiteren mit mehreren joins testen.
        //
        // Wahrscheinlich müssen relations und dependencies unterschieden werden,
        // siehe dazu todo bei property
        const property = Property.derive
            .from("users")
            .join("messages")
                .on("message", ({ message }, { id }) => message === id)
                .cascade("ALL")
            .filter(({ message }) => message.text.indexOf("geier") !== -1)
            .sort((a, b) => a.id - b.id)
            .pop()
            .shift()
            .pop()
            .last();

        expect(property.compute(Immutable.fromJS({
            sorter: (a, b) => a.id - b.id,
            users:  [{
                id:      0,
                name:    "geier",
                message: 0
            }, {
                id:      1,
                name:    "jupp",
                message: 0
            }, {
                id:      2,
                name:    "in",
                message: 0
            }, {
                id:      3,
                name:    "chantalle",
                message: 1
            }, {
                id:      4,
                name:    "wayne",
                message: 1
            }, {
                id:      5,
                name:    "hubertus",
                message: 2
            }, {
                id:      6,
                name:    "hansi",
                message: null
            }],
            messages: [{
                id:   0,
                text: "ein geier, zwei geier, drei geier"
            }, {
                id:   1,
                text: "geier sturzflug - eine band"
            }, {
                id:   2,
                text: "kein geir"
            }]
        })).toJS()).to.eql({
            id:      2,
            message: {
                id:   0,
                text: "ein geier, zwei geier, drei geier"
            },
            name: "in"
        });
    });
});
