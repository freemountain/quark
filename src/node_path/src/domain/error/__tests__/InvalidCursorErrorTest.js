// @flow

import InvalidCursorError from "../InvalidCursorError";
import { expect } from "chai";
import Action from "../../Action";
import { List } from "immutable";

describe("InvalidCursorErrorTest", function() {
    it("creates an InvalidCursorError", function() {
        expect((new InvalidCursorError("test", new Action("Test", "test", List()))).message).to.equal("Invalid cursor of test for \'Test[test]\'.");
        expect((new InvalidCursorError(null, new Action("Test", "test", List()))).message).to.equal("Invalid cursor of null for \'Test[test]\'.");
        expect((new InvalidCursorError(5, new Action("Test", "test", List()))).message).to.equal("Invalid cursor of 5 for \'Test[test]\'.");
        expect((new InvalidCursorError(true, new Action("Test", "test", List()))).message).to.equal("Invalid cursor of true for \'Test[test]\'.");
        expect((new InvalidCursorError(undefined, new Action("Test", "test", List()))).message).to.equal("Invalid cursor of undefined for \'Test[test]\'."); // eslint-disable-line
        expect((new InvalidCursorError({}, new Action("Test", "test", List()))).message).to.equal("Invalid cursor of Object for \'Test[test]\'.");
    });
});
