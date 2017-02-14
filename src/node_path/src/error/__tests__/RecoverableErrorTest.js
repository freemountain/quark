// @flow
import RecoverableError from "../RecoverableError";
import { expect } from "chai";

describe("RecoverableErrorTest", function() {
    it("creates a TraceError", function() {
        expect((new RecoverableError("lulu")).isRecoverable()).to.equal(true);
    });
});
