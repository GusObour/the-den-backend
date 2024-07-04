// jobs/UnlockExpiredSlotsJob.js
const Job = require('./Job');
const bookingController = require('../controllers/bookingController');

class UnlockExpiredSlotsJob extends Job {
    constructor(redisClient) {
        super();
        this.redisClient = redisClient;
    }

    async execute() {
        await bookingController.unlockExpiredSlots(this.redisClient);
    }
}

module.exports = UnlockExpiredSlotsJob;
