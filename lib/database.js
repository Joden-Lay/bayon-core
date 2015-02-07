'use strict';

// import namespaces
let utils = bayon.utils;
let app = bayon.app;
let Sequelize = bayon.sequelize;

global.Sequelize = require('sequelize');
let databaseConfig = utils.getConfig('database');
let dbLog = require('debug')('bayon:db');

if (app.config.debug) {
    databaseConfig.logging = dbLog;
}

let db = new Sequelize(
    databaseConfig.database,
    databaseConfig.username,
    databaseConfig.password,
    databaseConfig
);

module.exports = db;
