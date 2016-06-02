var io = require('socket.io-client');

var EventEmitter = require('events');
if (EventEmitter.EventEmitter) EventEmitter = EventEmitter.EventEmitter;

var emitter = new EventEmitter();



emitter.init = (url, channels, repos) => {

    var client = io(url);

    client.on('connect', e => {
        emitter.emit('connected')
        for (var channel of channels) {
            client.emit('watch', channel);
        }
        for (var repo of repos) {
            client.emit('watch', 'repo:' + repo);
        }
    });

    client.on('disconnect', e => emitter.emit('closed'));


    client.on('change', doc => {
        emitter.emit('change', doc);
    });

    client.on('deploy', git => {
        emitter.emit('deploy', git);
    })

}

module.exports = emitter;