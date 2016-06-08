'use strict';
const crypto = require('crypto');
const fs = require('fs');
const guard = require('../guard');
const handleCommand = require('./handler');



module.exports = function fetchFile(doc) {
    let content = '';

    var t = doc.path.split('/');
    t.pop();

    shell.exec('mkdir -p ' + t.join('/'));
    fs.writeFileSync(doc.path, content);

    let path = doc.path.split('/');
    path.pop();
    path = path.join('/')

    try {
        for (var command of doc.commands || []) {
            if (!handleCommand(command, {path})) {
                shell.cd(path).exec(command);
            }
        }
    } catch (e) {
        throw e;
    }
}