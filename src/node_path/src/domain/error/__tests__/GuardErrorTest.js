// @flow

import { expect } from "chai";
import GuardError from "../GuardError";

describe("GuardErrorTest", function() {
    it("creates a GuardError", function() {
        expect((new GuardError("Test", "test", 1, new Error("blub"))).message).to.equal("The 1st. guard for \'Test::test\' threw an error:\n\n\tError: blub\n\n");
        expect((new GuardError("Test", "test", 2, new Error("blub"))).message).to.equal("The 2nd. guard for \'Test::test\' threw an error:\n\n\tError: blub\n\n");
        expect((new GuardError("Test", "test", 3, new Error("blub"))).message).to.equal("The 3rd. guard for \'Test::test\' threw an error:\n\n\tError: blub\n\n");
        expect((new GuardError("Test", "test", 4, new Error("blub"))).message).to.equal("The 4th. guard for \'Test::test\' threw an error:\n\n\tError: blub\n\n");
    });
});
