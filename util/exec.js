'use strict';
const exec = require('child_process').exec;

module.exports = {
    run: function *(cmd, path) {
        path = path || process.env.PWD;
        return yield cb => exec(cmd, {
            cwd: path,
            env: process.env
        }, (err, stdout, stderr) => {
            if (err) return cb(err);
            if (stdout && stderr) {
                return cb(stderr);
            }
            cb(null, stdout);
        });
    }
} 