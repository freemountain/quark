import Internals from "../Internals";
import { expect } from "chai";
import { List } from "immutable";

describe("InternalsTest", function() {
    it("creates internals", function() {
        const internals = new Internals({
            name: "Blub"
        });

        expect(internals.toJS()).to.eql({
            actions:     [],
            name:        "Blub",
            diffs:       [],
            errors:      [],
            history:     [],
            id:          null,
            description: [],
            revision:    0,
            current:     0,
            action:      null
        });

        expect(internals.get("description")).to.eql(List());
    });
});
