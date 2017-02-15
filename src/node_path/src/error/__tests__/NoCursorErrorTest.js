// @flow

import NoCursorError from "../NoCursorError";
import { expect } from "chai";

describe("NoCursorErrorTest", function() {
    it("creates a NoCursorError", function() {
        expect((new NoCursorError("Test::test")).message).to.equal("Test::test - you need to set the cursor before using it.");
    });
});
