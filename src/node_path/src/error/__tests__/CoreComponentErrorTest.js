import CoreComponentError from "../CoreComponentError";
import { expect } from "chai";

describe("CoreComponentErrorTest", function() {
    it("creates a CoreComponentError", function() {
        expect((new CoreComponentError("bla", new Error("blub"))).isRecoverable()).to.equal(true);
        expect((new CoreComponentError("bla", new TypeError("blub"))).isRecoverable()).to.equal(false);
        expect((new CoreComponentError("bla")).isRecoverable()).to.equal(true);
    });
});
