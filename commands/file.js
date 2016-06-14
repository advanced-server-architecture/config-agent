'use strict';
const fs = require('fs');
const logger = require('../logger');
const _ = require('lodash');
const shell = require('shelljs');

let list = [];

module.exports = {
    restore() {
        try {
            let content = fs.readFileSync(`${process.env.CONFIG_HOME}/.files`);
            list = JSON.parse(content.toString());
        } catch (e) {
            if (e.code !== 'ENOENT') {
                logger.error(e);
            }
        }
    },
    save() {
        fs.writeFileSync(`${process.env.CONFIG_HOME}/.files`,
                JSON.stringify(list, 0, 2));
    },
    push(params, config, cb) {
        const file = params.file;
        const name = params.location;
        let f =  _.find(list, {name});

        if (f) {
            f.updatedCount++;
        } else {
            f = {
                createdAt: Date.now(),
                updatedCount: 0,
                name,
                fileName: file.name
            };
            list.push(f);
        }

        f.updatedAt = Date.now();
        f._id = file._id;
        f.ref = file.ref;

        let t = config.path + '/' + name;
        t = t.split('/');
        t.pop();
        let path = t.join('/');

        try {
            fs.statSync(path);
        } catch (e) {
            shell
                .exec(`mkdir -p ${path}`);
        }

        fs.writeFileSync(`${config.path}/${name}`, file.content);
        this.save();
    },
    get(path, name) {
        const f = _.find(list, {name });
        if (!f) {
            return '';
        }
        return fs.readFileSync(path + '/' + name).toString();
    },
    list() {
        return list;
    }
}