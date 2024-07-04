// jobs/UpdateWeeklyAvailabilityJob.js
const Job = require('./Job');
const AvailabilityController = require('../controllers/availabilityController');

class UpdateWeeklyAvailabilityJob extends Job {
    constructor(redisClient) {
        super();
        this.redisClient = redisClient;
    }

    async execute() {
        try {
            await AvailabilityController.clearWeeklyAvailability(this.redisClient);
            await AvailabilityController.addNewWeeklyAvailability(this.redisClient);
            console.log('Weekly availability cleared and new availability added successfully.');
        } catch (error) {
            console.error('Failed to update weekly availability:', error);
        }
    }
}

module.exports = UpdateWeeklyAvailabilityJob;
