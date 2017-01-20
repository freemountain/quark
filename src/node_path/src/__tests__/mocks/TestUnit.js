import Action from "../../domain/Action";
import Runtime from "../../Runtime";

const triggered = Action.triggered;

export default class TestUnit extends Runtime {
    static triggers = {
        action: triggered
            .by("message")
            .if((_, unit) => (
                !unit.currentMessage.willTrigger("init") &&
                unit.currentMessage.isAction()
            )),

        children: triggered
            .by("message")
            .if((_, unit) => unit.currentMessage.willTrigger("props", "action", "init")),

        diffs: triggered
            .by("message")
            .if((x, unit) => unit.currentMessage.isDiff()),

        props: triggered.by("message.done")
    };

    children() {}

    diffs() {}

    props() {}

    action() {}
}

