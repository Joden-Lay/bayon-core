'use strict';

let i18n = require("i18n");

module.exports = languageSetup;

function languageSetup(config) {
    config = config || {};
    config.directory = bayon.app.path + '/' + (config.directory || 'locale');
    i18n.configure(config);
    return i18n.init;
}
