// @flow

type Operation<T> = () => T

export const schedule = function _schedule(operation: Operation<* | Promise<*>>, delay?: number = 0): Promise<*> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const result = operation();

                return result instanceof Promise && result.then ? result.then(resolve).catch(reject) : resolve(result);
            } catch(e) {
                return reject(e);
            }
        }, delay);
    });
};
