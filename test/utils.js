'use strict';

require('../index.js');
let utils = bayon.utils;
let assert = require('assert');

let validator = utils.validator;
let co = utils.co;
let loadClasses = utils.loadClasses;
let path = utils.path;
let getUuidV1 = utils.getUuidV1;
let getUuidV4 = utils.getUuidV4;
let getTimeStamp = utils.getTimeStamp;
let getHash = utils.getHash;
let getConfig = utils.getConfig;
let utilRequire = utils.require;
let thunkify = utils.thunkify;
let tryInvoke = utils.tryInvoke;
let clone = utils.clone;
let isGeneratorFunction = utils.isGeneratorFunction;


describe('utils', function () {
    describe('validator', function () {
        it('Should has validator instance', function () {
            assert(validator, 'validator instance is initlized');
        });
        it('Should be instance of validator lib', function () {
            assert(validator === require('validator'), 'not instance of validator lib');
        });
    });

    describe('co', function () {
        it('Should has co instance', function () {
            assert(co, 'validator instance is initlized');
        });
        it('Should be instance of co lib', function () {
            assert(co === require('co'), 'not instance of co lib');
        });
    });

    describe('loadClasses', function () {

    });

});
