'use strict';
const log4js = require('log4js');
const fs = require('fs');
const moment = require('moment');

let logs = [];

function appender(e) {
    logs.push({
        time: e.startTime,
        data: e.data.join(' '),
        level: {
            level: e.level.level,
            levelStr: e.level.levelStr
        }
    });
}


log4js.addAppender(appender, 'mem');
let logger = log4js.getLogger('mem');

logger.save = function save(path) {
    try {
        fs.statSync(path);
    } catch (e) {
        fs.writeFileSync(path, '');
    }
    const content = logs.map(l => {
        return 
    });
    for (const l of logs) {
        const log = `[${moment(l.time).format('YYYY-MM-DD hh:mm:ss.SSS')}] ` +
            `[${l.level.levelStr}] ${l.data}`;
        fs.appendFileSync(path, log + '\n');
    }
}

logger.get = function get(size, page) {
    return {
        logs: logs.slice(size * page, size * (page + 1)),
        size,
        page,
        total: logs.length
    };
}

module.exports = logger;