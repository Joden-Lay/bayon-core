'use strict';

let memStore = bayon.memStore;
module.exports = function (memStoreConfig) {
    return function () {
        if (memStoreConfig.unixSocket) {
            return memStore.driver.createClient(
                memStoreConfig.unixSocket, memStoreConfig.options
            );
        } else {
            return memStore.driver.createClient(
                memStoreConfig.port, memStoreConfig.host, memStoreConfig.options
            );
        }
    };
};
