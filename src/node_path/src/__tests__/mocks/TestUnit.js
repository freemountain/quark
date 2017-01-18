import Action from "../../domain/Action";
import Runtime from "../../Runtime";

const triggered = Action.triggered;

export default class TestUnit extends Runtime {
    static isAction = x => x.resource.indexOf("/action") !== -1;

    static triggers = {
        action: triggered
            .by("message")
            .if((x, unit) => (
                !unit.triggers("init").on(x) &&
                unit.isMessage(x) &&
                !unit.children.some(child => child.handles(x))
            )),

        children: triggered
            .by("message")
            .if((x, unit) => (
                unit.isMessage(x) &&
                !unit.triggers("action").on(x)
            )),

        diffs: triggered
            .by("message")
            .if((x, unit) => unit.isMessage(x)),

        props: triggered.by("message.done")
    };

    children() {}

    diffs() {}

    props() {}

    action() {}
}

