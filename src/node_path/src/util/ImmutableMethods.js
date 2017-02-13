// @flow

import { Map, Set, List } from "immutable";
import getAllProperties from "./getAllProperties";

/**
 * @author Marco Sliwa <marco@circle.ai>
 * @type   {string[]}
 */
export default (Set(getAllProperties(Map.prototype))
    .concat(getAllProperties(List.prototype))
    .filter(key => key !== "constructor" && key !== "toString") : Set<string>);

