// @flow

import NonRecoverableError from "../../error/NonRecoverableError";
import type Trigger from "../Trigger";

export default class MergeError extends NonRecoverableError {
    constructor(a: Trigger, b: Trigger) {
        super(`You can only merge triggers with the same action and emits value, got (${a.emits}, ${a.action}) and (${b.emits}, ${b.action}).`);
    }
}
