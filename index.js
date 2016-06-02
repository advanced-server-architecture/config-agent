#!/usr/bin/env node
var program = require('commander');
var agent = require('./agent');
var fs = require('fs');

var config = {
};
var template = {
    URL: '',
    HTTP: '',
    WATCH: [],
    DEPLOY: [],
    LOGFILE: false
};


program
    .option('-i, --init <output>', 'Generate config file')
    .parse(process.argv);



if (program.init) {
    var init = program.init;
    var ext = init.split('.');
    ext = ext[ext.length - 1];
    if (ext !== 'js' && ext !== 'json') {
        console.error('Can noly generate .js and .json file');
    }
    var output = '';
    if (ext === 'js') {
        output = 'module.exports = ';
        output += JSON.stringify(template, 0, 2);
        output += '\n';
    } else if (ext === 'json') {
        output = JSON.stringify(template, 0, 2) + '\n';
    }
    fs.writeFileSync(init, output);
    process.exit(0);
}


var configFile = program.args[0];
if (!configFile) {
    console.log('Please provide a config file');
}

if (configFile) {
    var file = configFile;
    if (file !== '/' &&
        file.substr(0, 2) !== './') {
        file = './' + file;
    }
    file = process.cwd() + '/' + file;
    config = require(file);
}

agent(config);
