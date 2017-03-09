import ActionError from "./ActionError";

export default class NoActionError extends ActionError {
    constructor(action: any) {
        super(`There is no valid ongoing action, got ${action} instead.`);
    }
}
