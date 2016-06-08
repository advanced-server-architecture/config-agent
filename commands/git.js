'use strict';

const shell = require('shelljs');
const co = require('co');
const guard = require('../guard');
const debug = require('../debug');
const handleCommand = require('./handler');
const fs = require('fs');


module.exports = function deployGit(params, config, cb) {
    co(function* () {
        const git = params.git;
        const opts = params.opts;
        if (!git) return;
        const path = config.path + '/' + git.name;
        if (shell.cd(path).stderr) {
            shell.exec(`mkdir -p ${path}`);
            debug(`${path} is not a directory, mkdir it`);
        }


        let currCommit = '';

        let isGit = true;

        try {
            fs.statSync(path + '/.git');
        } catch(e) {
            isGit = false;
        }

        if (!isGit) {
            debug(`${path} is not a git repo, cloning it`);
            shell
                .cd(path)
                .exec('rm ./* -rf')
                .exec(`git clone https://${git.username}:${git.accessToken}@github.com/${git.repo} ./`);
            currCommit = shell
                .cd(path)
                .exec('git rev-parse HEAD').stdout;
            debug(`${git.repo} cloned into ${path}`);
        } else {
            currCommit = shell
                .cd(path)
                .exec('git rev-parse HEAD').stdout;
        }

        if (currCommit !== git.commit) {
            debug(`${path} is not at deployed commit, fetching it`);
            shell
                .cd(path)
                .exec('git fetch')
                .exec(`git checkout ${git.commit}`);
        }

        return;

        if (git.command) {
            const curr = shell.cd(git.path);
            const commands = git.command.split('\n');
            for (const command of commands) {
                debug(`running ${command}`);
                if (!handleCommand(command)) {
                    curr.exec(command);
                }
            }
        }
    })
    .then(() => {
        if (cb) {
            cb(null);
        }
    })
    .catch(e => {
        if (cb) {
            cb(e) 
        } else {
            throw e;
        }
    });
}
