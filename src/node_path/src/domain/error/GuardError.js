// @flow

import CoreComponentError from "../../error/CoreComponentError";

export default class GuardError extends CoreComponentError {
    constructor(context: string, trigger: string, position: number, e: Error) {
        super(`The ${position}${GuardError.addition(position)} guard for '${context}::${trigger}' threw an error:\n\n\t${e.toString()}\n\n`, e);
    }

    static addition(position) {
        if(position === 1) return "st.";
        if(position === 2) return "nd.";
        if(position === 3) return "rd.";

        return "th.";
    }
}
