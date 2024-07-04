// jobs/UpdateExpiredAppointmentsJob.js
const Job = require('./Job');
const bookingController = require('../controllers/bookingController');

class UpdateExpiredAppointmentsJob extends Job {
    constructor(redisClient) {
        super();
        this.redisClient = redisClient;
    }

    async execute() {
        await bookingController.updateExpiredAppointments(this.redisClient);
    }
}

module.exports = UpdateExpiredAppointmentsJob;
