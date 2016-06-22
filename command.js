'use strict';
const git = require('commands/git');
const file = require('commands/file');
const guard = require('core/guard');
const co = require('co');
const logger = require('util/logger');

let path = '';

module.exports = {
    init: (config) => {
        if (config.path) {
            path = config.path;
        }
    },
    exec(command, argument, cb) {
        co(function* () {
            switch (command) {
                case 'init-project':
                    yield git.init(argument.project, argument.opts, path, cb);
                    break;
                case 'pull-project':
                    yield git.pull(argument.projectId, argument.commit, path, cb);
                    break;
                case 'push-file':
                    yield file.push(argument.file, argument.location, path);
                    cb(null, `File ${argument.file._id} pushed`);
                    break;
                case 'start':
                    yield guard.start(argument);
                    cb(null, `Project ${argument} started`);
                    break;
                case 'stop':
                    yield guard.stop(argument);
                    cb(null, `Project ${argument} stopped`);
                    break;
                case 'delete':
                    yield guard.remove(argument);
                    cb(null, `Project ${argument} deleted`);
                    break;
                default:
                    throw `Command ${command} is not found`;
            }
        })
        .catch(e => {
            cb(e);
            logger.error(e);
        });
    }
};