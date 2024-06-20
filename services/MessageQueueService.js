const Queue = require('bull');

class MessageQueue {
    constructor(name, redisConfig) {
        this.queue = new Queue(name, {
            redis: redisConfig,
        });
    }

    addJob(data) {
        return this.queue.add(data);
    }

    processJob(processFunction) {
        this.queue.process(processFunction);
    }

    onFailed(callback) {
        this.queue.on('failed', callback);
    }
}

module.exports = MessageQueue;
