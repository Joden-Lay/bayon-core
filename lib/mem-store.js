'use strict';

// import namespaces
let utils = bayon.utils;
let memStoreConfig = utils.getConfig('mem-store');
let memStore = require('./mem-store/' + memStoreConfig.driver + '.js');

module.exports = {
    driver: require(memStoreConfig.driver),
    createClient: memStore(memStoreConfig)
};
