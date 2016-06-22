'use strict';
const log4js = require('log4js');
const fs = require('fs');
const moment = require('moment');
const info = require('core/info');

let logs = [];

function appender(e) {
    info.report('log', {
        date: e.startTime,
        message: e.data.join(' '),
        level: e.level.levelStr
    });
}


log4js.addAppender(appender, 'remote');
let logger = log4js.getLogger('remote');
module.exports = logger;