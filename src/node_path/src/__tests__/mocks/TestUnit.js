// @flow

import DeclaredAction from "../../domain/DeclaredAction";
import Runtime from "../../Runtime";

const triggered = DeclaredAction.triggered;

export default class TestUnit extends Runtime {
    static triggers = {
        action: triggered
            .by("message.before")
            .if((...args) => {
                const unit = args.pop();

                return unit.message.isAction();
            }),

        children: triggered
            .by("message.before")
            .if(() => false),

        diffs: triggered
            .by("message.before")
            .if((...args) => {
                const unit = args.pop();

                return unit.message.isDiff();
            }),

        props: triggered.by("message")
    };
}

