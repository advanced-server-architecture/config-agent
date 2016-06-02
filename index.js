#!/usr/bin/env node
var program = require('commander');
var agent = require('./agent');

var config = {
};

program
    .option('-c, --config [file]', 'Configuration File')
    .option('-u, --url', 'Syncgateway url')
    .parse(process.argv);

if (program.config) {
    var file = program.config;
    if (file !== '/' &&
        file.substr(0, 2) !== './') {
        file = './' + file;
    }
    config = require(file);
}

if (program.url) {
    config.URL = url;
}

agent(config);
