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
        // TODO:
        // - cascaden berechnen
        const property = Property.derive
            .from("users", "sorter", "x")
            .join("messages")
                .on("message", (user, message) => user.message === message.id)
                .cascade("ALL")
            .join("addresses")
                .on("addresses", (user, address) => user.addresses === address.id)
                .cascade("PUT")
            .join.self
                 .on("parent", (user, parent) => user.parent === parent.id)
            .filter(data => data.message.text.indexOf("geier") !== -1)
            .sort((a, b, { sorter }) => sorter(a, b))
            .pop()
            .shift()
            .pop()
            .last();

        expect(property.relations.toJS()).to.eql([{
            key:      null,
            cascades: [],
            name:     "users",
            tag:      "SELF"
        }, {
            key:      null,
            cascades: [],
            name:     "sorter",
            tag:      "INDIE"
        }, {
            key:      null,
            cascades: [],
            name:     "x",
            tag:      "INDIE"
        }, {
            key:      "message",
            cascades: ["POST", "PUT", "DELETE"],
            name:     "messages",
            tag:      "JOINED"
        }, {
            key:      "addresses",
            cascades: ["PUT"],
            name:     "addresses",
            tag:      "JOINED"
        }, {
            key:      "parent",
            cascades: [],
            name:     "users",
            tag:      "JOINED"
        }]);

        expect(property.compute(Immutable.fromJS({
            x:      4,
            sorter: (a, b) => a.id - b.id,
            users:  [{
                id:        0,
                name:      "geier",
                message:   0,
                addresses: [],
                parent:    1
            }, {
                id:        1,
                name:      "jupp",
                message:   0,
                addresses: [0],
                parent:    1
            }, {
                id:        2,
                name:      "in",
                message:   0,
                addresses: [0, 1],
                parent:    1
            }, {
                id:        3,
                name:      "chantalle",
                message:   1,
                addresses: [0],
                parent:    1
            }, {
                id:        4,
                name:      "wayne",
                message:   1,
                addresses: [0, 1],
                parent:    1
            }, {
                id:        5,
                name:      "hubertus",
                message:   2,
                addresses: 0,
                parent:    1
            }, {
                id:        6,
                name:      "hansi",
                message:   null,
                addresses: 0,
                parent:    1
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
            }],
            addresses: [{
                id:     0,
                street: "sesam"
            }, {
                id:     1,
                street: "elm"
            }]
        })).toJS()).to.eql({
            id:      2,
            message: {
                id:   0,
                text: "ein geier, zwei geier, drei geier"
            },
            addresses: [{
                id:     0,
                street: "sesam"
            }, {
                id:     1,
                street: "elm"
            }],
            name:   "in",
            parent: {
                addresses: [{
                    id:     0,
                    street: "sesam"
                }],
                message: {
                    id:   0,
                    text: "ein geier, zwei geier, drei geier"
                },
                id:     1,
                name:   "jupp",
                parent: 1
            }
        });
    });
});
