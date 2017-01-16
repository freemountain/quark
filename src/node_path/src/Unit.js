import Runtime from "./Runtime";
import Action from "./domain/Action";

export default class Unit extends Runtime {
    static triggered = Action.triggered;
}
