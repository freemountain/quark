import { Record, List } from "immutable";

export default class Internals extends Record({
    description: List(),
    id:          null,
    revision:    0,
    history:     List(),
    errors:      List(),
    diffs:       List(),
    actions:     List(),
    current:     0,
    action:      null,
    name:        "Default"
}) {}
