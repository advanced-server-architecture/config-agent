'use strict';
const fs = require('fs');
const logger = require('../util/logger');
const _ = require('lodash');
const info = require('../core/info');

let list = [];

module.exports = {
    restore(content, projectPath) {
        list = content;
        let index = 0;
        for (const i of list) {
            const path = projectPath + '/'  + i.location;
            try {
                fs.statSync(path)
            } catch(e) {
                list.splice(index, 1);
            }
            index++;
        }
        info.report('file', list);
        logger.info('file restored, ' + list.length);
    },
    push: function* (f, location, projectPath) {
        let file = _.find(list, { 
            ref: f.ref,
            location: location
        });

        if (!file) {
            file = {
                createdAt: Date.now(),
                ref: f.ref,
                name: f.name,
                location: location
            };
            list.push(file);
        }
        file.updatedAt = Date.now(); 
        file._id = f._id;
        file.content = f.content;

        const path = projectPath + '/' + file.location;

        fs.writeFileSync(path, file.content);
        info.report('file', list);
    }
}