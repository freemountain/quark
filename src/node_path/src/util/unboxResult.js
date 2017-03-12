// @flow

import Cursor from "../domain/Cursor";
import PendingAction from "../domain/PendingAction";

const unboxResult = function(cursor: Cursor, result: (Promise<Cursor> | Error | Cursor | void)): Promise<Cursor> { // eslint-disable-line
    if(!(cursor.action instanceof PendingAction)) throw new Error("lulu");
    if(result instanceof Error)                   return cursor.action.state.error(result);
    if(result instanceof Promise)                 return result
        .then(unboxResult.bind(null, cursor))
        .catch(unboxResult.bind(null, cursor));

    return Promise.resolve(result instanceof Cursor ? result : cursor);
};

export default unboxResult;
