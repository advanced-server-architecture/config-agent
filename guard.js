'use strict';

const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const shell = require('shelljs');
const logger = require('./logger');

let list = [];

const out = {
    start(params) {
        const proc = _.find(list, {name: params.name});
        if (!proc) {
            logger.error(`cannot find project ${params.name}`);
            return;
        }
        guard(proc);
    },
    stop(pid) {
        pid = parseInt(pid);
        let proc = _.find(list, { pid });
        if (proc) {
            proc.status = 1;
            proc.pid = -1;
            this.save();
            if (proc.process) {
                proc.process.kill('SIGINT');
            }
        }
    },
    kill(name) {
        try {
        let proc = _.find(list, {name});
        let index = _.findIndex(list, {name});
        if (proc) {
            if (proc.process) {
                proc.process.kill('SIGINT');
            }
            list.splice(index, 1);
        }
    }catch(e) {console.log(e.stack); throw e}
    },
    list() {
        return list;
    },
    restore() {
        try {
            let content = fs.readFileSync(`${process.env.CONFIG_HOME}/.process`);
            content = JSON.parse(content.toString());
            for (const child of content) {
                if (child.status === 0) {
                    guard(child);
                } else {
                    this.add(child, true);
                }
            }
        } catch (e) {
            if (e.code !== 'ENOENT') {
                logger.error(e);
            }
        }
    },
    add(proc, ignore) {
        if (_.find(list, {name: proc.name})) {
            logger.error(`${proc.name} already exits`);
        }
        list.push(proc);
        if (!ignore) this.save();
    },
    save() {
        let content = [];
        for (const child of list) {
            content.push({
                createdAt: child.createdAt,
                updatedAt: child.updatedAt,
                restartCount: child.restartCount,
                location: child.location,
                status: child.status,
                name: child.name,
                opts: child.opts,
                pid: -1
            });
        }
        fs.writeFileSync(`${process.env.CONFIG_HOME}/.process`, JSON.stringify(content,0 , 2));
    }
}

function guard(proc, internal) {
    internal = internal || {};
    const opts = proc.opts;
    const optsRestartLimit = 5;

    logger.info(`Starting location:${proc.location}`);

    const argument = opts.argument || [];
    let env = _.extend({}, process.env);

    let script = '';
    {
        let path = proc.location.split('/');
        path.pop();
        env.PWD = path.join('/');
    }
    const p = exec(`node` + 
            ` ${argument.join(' ')}` + 
            ` ${proc.location + '/' + opts.main}`,{
        env,
        cwd: env.PWD
    });


    proc.pid = p.pid,
    proc.process = p,
    proc.updatedAt = Date.now();
    proc.status = 0;
    internal.shortRestartCount = internal.shortRestartCount || 0;

    out.save();

    p.stdout.on('data', data => {
        logger.info(proc.name, data);
    });

    p.stderr.on('data', data => {
        logger.info(proc.name, data);
    });

    p.on('exit', code => {
        if (proc.status === 1) {
            return;
        }
        proc.status = 1;
        proc.pid = -1;
        out.save();
        if (code === 0) {
            return;
        }
        if (internal.shortRestartCount >= optsRestartLimit) {
            return;
        }
        internal.shortRestartCount++;
        guard(proc, internal);
    });

}


module.exports = out;
