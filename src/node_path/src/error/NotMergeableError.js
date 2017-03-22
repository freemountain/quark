// @flow

import PropsError from "./PropsError";
import { type Collection } from "immutable";

export default class NotMergeableError extends PropsError {
    constructor(child: Object, childProps: Collection<*, *>, parent: Object, parentProps: Collection<*, *>) {
        super(`Props of type '${childProps.constructor.name}' of '${child.constructor.name}' can't be merged with '${parentProps.constructor.name}' of '${parent.constructor.name}'.`);
    }
}
