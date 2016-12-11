import getAllProperties from "./getAllProperties";

export default function printPublicMethods(obj) {
    const object  = obj instanceof Function ? {} : obj;
    const methods = getAllProperties(obj)
        .filter(key => object[key] instanceof Function && key.slice(0, 1) !== "_");

    return `\n\t.${methods.join("()\n\t.")}()\n`;
}
