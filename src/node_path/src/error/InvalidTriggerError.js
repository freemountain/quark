import RuntimeError from "./RuntimeError";

export default class InvalidTriggerError extends RuntimeError {
    constructor(name: string) {
        super(`You are trying to define a trigger for the LifecycleHandler '${name}'. This is not possible.`);
    }
}
