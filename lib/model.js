'use strict';

// import namespaces
let utils = bayon.utils;
let db = bayon.db;
module.exports = modelLoader();

function modelLoader() {
    return utils.loadClasses({
        loaderPath: 'model',
        parser: function (name, identifier) {
            return db.import(name, identifier);
        }
    });
}
