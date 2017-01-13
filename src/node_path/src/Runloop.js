export const schedule = function schedule(operation, delay = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const result = operation();

                return result && result.then ? result.then(resolve).catch(reject) : resolve(result);
            } catch(e) {
                return reject(e);
            }
        }, delay);
    });
};
