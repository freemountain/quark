// @flow

import { Record, Set } from "immutable";
import Cursor from "./Cursor";
import PendingAction from "./PendingAction";
import InvalidCursorError from "./error/InvalidCursorError";
import NoActionError from "./error/NoActionError";

type StateType = "before" | "triggers" | "error" | "done" | "cancel" | "progress" | "finished" | "waiting";

type StateInput = {
    type?:    StateType,    // eslint-disable-line
    errors?:  Set<Error>,   // eslint-disable-line
    _cursor?: Cursor | null
}

export default class State extends Record({
    type:    "before",
    errors:  Set(),
    _cursor: null
}) {
    constructor(data?: StateInput) {
        super(data);
    }

    change(type: StateType): State {
        return this.set("type", type);
    }

    addError(e: Error): State {
        return this.update("errors", errors => errors.add(e));
    }

    error(e: Error) {
        const cursor = this._cursor;

        if(!(cursor instanceof Cursor))               throw new InvalidCursorError(cursor);
        if(!(cursor.action instanceof PendingAction)) throw new NoActionError(cursor.action);

        const action = cursor.action
            .set("state", this.update("errors", errors => errors.add(e)));

        return cursor.update("_unit", unit => unit.set("action", action));
    }

    get isRecoverable(): boolean {
        return this.errors.every(x => x.isRecoverable instanceof Function && x.isRecoverable());
    }

    get currentError(): ?Error {
        return this.errors.last() || null;
    }

    get hasErrored(): boolean {
        return this.errors.size > 0;
    }

    setCursor(cursor: Cursor | null): State {
        return this.set("_cursor", cursor);
    }

    _cursor: ?Cursor;
}
