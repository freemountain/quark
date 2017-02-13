// @flow

import getAllProperties from "./getAllProperties";

/**
 * prints all public methods of an object, whereby
 * methods prefixed with _ are seen as private
 *
 * @author Marco Sliwa <marco@circle.ai>
 *
 * @param  {object} obj to extract methods from
 * @return {string}
 */
export default function printPublicMethods(obj: Object): string {
    const object  = obj;
    const methods = getAllProperties(obj)
        .filter(key => object[key] instanceof Function && key.slice(0, 1) !== "_");

    return `\n\t.${methods.join("()\n\t.")}()\n`;
}
