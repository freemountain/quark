import { Record, Set } from "immutable";

type StateType = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

type StateInput = {
    type?:  StateType, // eslint-disable-line
    errors: Set<Error>
}

export default class State extends Record({
    type:   "before",
    errors: Set()
}) {
    constructor(data: StateInput) {
        super(data);
    }

    change(type: StateType): State {
        return this.set("type", type);
    }

    addError(e: Error): State {
        return this.update("errors", errors => errors.add(e));
    }

    get isRecoverable(): boolean {
        return this.errors.every(x => x.isRecoverable && x.isRecoverable());
    }

    get error(): ?Error {
        return this.errors.last() || null;
    }

    get hasErrored(): boolean {
        return this.errors.size > 0;
    }
}
