export default function printMethods(obj, carry = "") {
    if(!(obj instanceof Object) || obj === Object) return carry;

    const prototype = obj instanceof Function ? obj.prototype : Object.getPrototypeOf(obj);
    const object    = obj instanceof Function ? {} : obj;
    const methods   = Object
        .getOwnPropertyNames(object)
        .filter(key => object[key] instanceof Function && key.slice(0, 1) !== "_");

    return printMethods(prototype, `\n\t.${methods.join("()\n\t.")}()\n`);
}
