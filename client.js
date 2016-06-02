var io = require('socket.io-client');

var EventEmitter = require('events');
if (EventEmitter.EventEmitter) EventEmitter = EventEmitter.EventEmitter;

var emitter = new EventEmitter();



emitter.init = (url, channels) => {

    var client = io(url);

    client.on('connect', e => {
        emitter.emit('connected')
        for (var channel of channels) {
            client.emit('watch', channel);
        }
    });

    client.on('disconnect', e => emitter.emit('closed'));


    client.on('change', doc => {
        emitter.emit('change', doc);
    })
}

module.exports = emitter;