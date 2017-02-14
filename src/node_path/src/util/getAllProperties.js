// @flow

/**
 * takes a value and returns all properties of the prototype
 * chain
 *
 * @author Marco Sliwa <marco@circle.ai>
 *
 * @param  {*}         object          to extract methods from
 * @param  {?string[]} [properties=[]] extracted
 * @return {string[]}
 */
export default function getAllProperties(object: Object, properties?: Array<string> = []): Array<string> { // eslint-disable-line
    if(!(object instanceof Object) || object === Object) return properties;

    const next    = Object.getPrototypeOf(object);
    const props   = Object.getOwnPropertyNames(object);

    return getAllProperties(next, properties.concat(props));
}

