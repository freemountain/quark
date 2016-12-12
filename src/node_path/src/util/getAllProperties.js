/**
 * takes a value and returns all properties of the prototype
 * chain
 *
 * @author Marco Sliwa <marco@circle.ai>
 *
 * @param  {*}         obj             to extract methods from
 * @param  {?string[]} [properties=[]] extracted
 * @return {string[]}
 */
export default function getAllProperties(obj, properties = []) {
    if(!(obj instanceof Object) || obj === Object) return properties;

    const next    = obj instanceof Function ? obj.prototype : Object.getPrototypeOf(obj);
    const current = obj instanceof Function ? {} : obj;
    const props   = Object.getOwnPropertyNames(current);

    return getAllProperties(next, properties.concat(props));
}

