import Q from "q";

export const schedule = function schedule(operation, delay = 0) {
    const deferred = Q.defer();

    setTimeout(() => {
        try {
            const result = operation();

            return result.then ? result.then(deferred.resolve).catch(deferred.reject) : deferred.resolve(result);
        } catch(e) {
            return deferred.reject(e);
        }
    }, delay);

    return deferred.promise;
};
