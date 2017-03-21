// @flow

import Relation from "../Relation";
import { expect } from "chai";

describe("RelationTest", function() {
    it("creates some relations", function() {
        const relation  = new Relation("test");
        const relation2 = new Relation("test", Relation.INDIE, "test2");

        expect(relation).to.eql({
            name:     "test",
            cascades: [],
            tag:      Relation.SELF,
            key:      null
        });

        expect(relation2).to.eql({
            name:     "test",
            cascades: [],
            tag:      Relation.INDIE,
            key:      "test2"
        });

        expect(relation.setCascades(["PUT", "POST"])).to.eql({
            name:     "test",
            cascades: ["PUT", "POST"],
            tag:      Relation.SELF,
            key:      null
        });

        expect(relation.setCascades(["ALL"]).setCascades(["PUT", "POST"]).setPrefix("lala")).to.eql({
            name:     "lala.test",
            cascades: ["PUT", "POST"],
            tag:      Relation.SELF,
            key:      null
        });
    });
});
