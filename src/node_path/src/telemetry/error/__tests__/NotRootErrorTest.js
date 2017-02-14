// @flow
import NotRootError from "../NotRootError";
import { expect } from "chai";
import Trace from "../../Trace";

describe("NotRootErrorTest", function() {
    it("creates a NotRootError", function() {
        expect((new NotRootError(new Trace({ name: "test" }))).message).to.equal("You can only lock the root of a trace (@test).");
    });
});
