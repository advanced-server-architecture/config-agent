var log4js = require('log4js');
log4js.loadAppender('file');

var logger = log4js.getLogger();

module.exports = function(file) {
    if (!file) return logger;
    log4js.addAppender(log4js.appenders.file(file), 'file');
    return log4js.getLogger('file');
}
