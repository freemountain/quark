import Immutable from "immutable";
import getAllProperties from "./getAllProperties";

/**
 * @author Marco Sliwa <marco@circle.ai>
 * @type   {string[]}
 */
export default Immutable.Set(getAllProperties(Immutable.Map.prototype))
    .concat(getAllProperties(Immutable.List.prototype))
    .filter(key => key !== "constructor" && key !== "toString");

