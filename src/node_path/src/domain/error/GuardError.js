import NonRecoverableError from "../../error/NonRecoverableError";

export default class GuardError extends NonRecoverableError {
    constructor(trigger, position, e) {
        super(`The ${position}${GuardError.addition(position)} guard for '${trigger}' threw an error:\n\n\t${e}\n`);
    }

    static addition(position) {
        if(position === 1) return "st.";
        if(position === 2) return "nd.";
        if(position === 3) return "rd.";

        return "th.";
    }
}
