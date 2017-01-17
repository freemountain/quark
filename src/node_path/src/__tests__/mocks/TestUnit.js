import Action from "../../domain/Action";
import Runtime from "../../Runtime";

const triggered = Action.triggered;

export default class TestUnit extends Runtime {
    static isAction = x => x.resource.indexOf("/action") !== -1;

    static triggers = {
        action: triggered
            .by("message")
            .if((x, unit) => (
                TestUnit.isAction(x) &&
                !unit.childHandles(x)
            )),

        children: triggered
            .by("message")
            .if(x => (
                TestUnit.isAction(x) &&
                !x.triggers("action")
            )),

        diffs: triggered
            .by("message")
            .if(x => !TestUnit.isAction(x)),

        props: triggered.by("message.done")
    };

    children() {}

    diffs() {}

    props() {}

    action() {}
}

