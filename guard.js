'use strict';

const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const debug = require('./debug');
const _ = require('lodash');

let list = [];

function guard(location, opts, internal) {
    internal = internal || {};
    opts = opts || {};

    let errorLog = `${process.env.CONFIG_HOME}/error.log`;
    let outLog = `${process.env.CONFIG_HOME}/out.log`;

    try {
        fs.statSync(errorLog);
    } catch (e) {
        fs.writeFileSync(errorLog, '');
    }

    try {
        fs.statSync(outLog);
    } catch (e) {
        fs.writeFileSync(outLog, '');
    }

    debug(`Starting location:${location} with opts:${JSON.stringify(opts,0,2)}`);
    const args = opts.args || [];
    let env = _.extend({}, process.env);
    let script = '';
    {
        let path = location.split('/');
        path.pop();
        env.PWD = path.join('/');
    }
    const p = exec(`node ${args.join(' ')} ${location}`,{
        env,
        cwd: env.PWD
    });

    let createdAt = internal.createdAt || Date.now();
    let updatedAt = internal.updatedAt || createdAt;
    let restartCount = internal.restartCount || 0;
    let shortRestartCount = internal.shortRestartCount || 0;

    const optsRestartLimit = opts.restartLimit || 1;
    const optsRestartDelay = opts.restartDelay || 3000;

    let proc = _.find(list, {pid: p.pid}) || {};

    proc.pid = p.pid,
    proc.process = p,
    proc.createdAt = createdAt;
    proc.updatedAt = updatedAt;
    proc.restartCount = restartCount;
    proc.shortRestartCount = shortRestartCount;
    proc.status = 0;
    proc.name =  opts.name || p.pid;
    proc.opts = opts;
    proc.location = location;

    let content = [];
    for (const child of list) {
        content.push({
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
            restartCount: child.restartCount,
            shortRestartCount: child.shortRestartCount,
            opts: child.opts,
            location: child.location
        });
    }

    fs.writeFileSync(`${process.env.CONFIG_HOME}/.process`, JSON.stringify(content,0 , 2));


    p.stdout.on('data', data => {
        fs.appendFileSync(outLog, data);
        debug(data);
    });

    p.stderr.on('data', data => {
        fs.appendFileSync(errorLog, data);
        debug(data);
    });

    p.on('exit', code => {
        let flag = true;
        let proc = _.find(list, {pid: p.pid});
        if (proc) {
            if (internal.shortRestartCount >= optsRestartLimit) {
                proc.status = 1;
                proc.shortRestartCount++;
                proc.pid = -1;
                return;
            }
            let index = _.findIndex(list, {pid: p.pid});
            list.splice(index, 1);
            //delete list[p.pid];
            internal.createdAt = createdAt;
            internal.updatedAt = Date.now();
            internal.restartCount = ++restartCount;
            if (Date.now() - updatedAt < optsRestartDelay) {
                internal.shortRestartCount = ++shortRestartCount;
            } else {
                internal.shortRestartCount = 0;
            }
        }
        guard(location, opts, internal);
    });

}

module.exports = {
    start(location, opts) {
        guard(path.resolve(process.env.PWD, location), opts);
    },
    kill(pid) {
        let proc = _.find(list, {pid});
        let index = _.findIndex(list, {pid});
        if (proc) {
            proc.process.kill('SIGINT');
            list.splice(index, 1);
        }
    },
    restart(name) {
        let proc = _.find(list, {name});
        let index = _.findIndex(list, {name});
        if (proc) {
            if (proc.status === 1) {
                proc.process.kill('SIGINT');
            }
            guard(proc.location, child.opts);
            list.splice(index, 1);
        }
    },
    list() {
        return list;
    },
    recover() {
        try {
            let content = fs.readFileSync(`${process.env.CONFIG_HOME}/.process`);
            content = JSON.parse(content.toString());
            for (const child of content) {
                guard(child.location, child.opts, {
                    createdAt: child.createdAt,
                    updatedAt: child.updatedAt,
                    restartCount: child.restartCount,
                    shortRestartCount: child.shortRestartCount
                });
            }
        } catch (e) {
        }
    },
    add(location, opts) {
        list.push({
            pid: -1,
            status: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            restartCount: 0,
            shortRestartCount: 0,
            name: opts.name || Date.now(),
            location: location,
            opts: opts
        });
    }
}