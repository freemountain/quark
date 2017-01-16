import Runtime from "../Runtime";
import { expect } from "chai";
import Action from "../domain/Action";

const triggered = Action.triggered;

class TestUnit extends Runtime {
    static isAction = x => x.resource.indexOf("/action") !== -1;

    static triggers = {
        action: triggered
            .by("message")
            .if((x, unit) => (
                Runtime.isAction(x) &&
                !unit.childHandles(x)
            )),

        children: triggered
            .by("message")
            .if(x => (
                Runtime.isAction(x) &&
                !x.triggers("action")
            )),

        diffs: triggered
            .by("message")
            .if(x => !Runtime.isAction(x)),

        props: triggered.by("action.done")
    };

    children() {}

    diffs() {}

    props() {}

    actions() {}
}

describe("RuntimeTest", function() {
    it("extract all methods from a class", function() {
        const methods = Runtime.allActions(new TestUnit());

        expect(methods.keySeq().toJS()).to.eql([
            "message",
            "children",
            "diffs",
            "props",
            "actions"
        ]);
    });

        /* it("creates a an extended Runtime", function() {
        const unit = new TestUnit();

        expect(unit.actions).to.eql({
            message: {
                name:   "message",
                before: [{
                    name:   "children",
                    guards: 1,
                    params: [],
                    delay:  0
                }, {
                    name:   "diffs",
                    guards: 1,
                    params: [],
                    delay:  0
                }, {
                    name:   "action",
                    guards: 1,
                    params: [],
                    delay:  0
                }],
                cancel:   [],
                progress: [],
                error:    [],
                done:     []
            },

            action: {
                name:     "action",
                before:   [],
                cancel:   [],
                progress: [],
                error:    [],
                done:     [{
                    name:   "props",
                    guards: 0,
                    params: [],
                    delay:  0
                }]
            }
        });
});*/
});
