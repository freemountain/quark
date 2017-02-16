// @flow

import DeclaredAction from "../../domain/DeclaredAction";
import Runtime from "../../Runtime";

const triggered = DeclaredAction.triggered;

export default class TestUnit extends Runtime {
    static triggers = {
        action: triggered
            .by("message.before")
            .if((_, unit) => (
                !unit.message.willTrigger("init") &&
                unit.message.isAction()
            )),

        children: triggered
            .by("message.before")
            .if((_, unit) => unit.message.willTrigger("diffs", "action", "init")),

        diffs: triggered
            .by("message.before")
            .if((_, unit) => unit.message.isDiff()),

        props: triggered.by("message")
    };
}

