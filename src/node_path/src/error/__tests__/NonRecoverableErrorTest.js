// @flow
import NonRecoverableError from "../NonRecoverableError";
import { expect } from "chai";

describe("RecoverableErrorTest", function() {
    it("creates a TraceError", function() {
        expect((new NonRecoverableError("lulu")).isRecoverable()).to.equal(false);
    });
});
