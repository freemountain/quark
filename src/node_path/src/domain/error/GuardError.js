import NonRecoverableError from "../../error/NonRecoverableError";

export default class GuardError extends NonRecoverableError {
    constructor(context, trigger, position, e) {
        super(`The ${position}${GuardError.addition(position)} guard for '${context}::${trigger}' threw an error:\n\n\t${e}\n`);

        this.e = e;
    }

    static addition(position) {
        if(position === 1) return "st.";
        if(position === 2) return "nd.";
        if(position === 3) return "rd.";

        return "th.";
    }
}
