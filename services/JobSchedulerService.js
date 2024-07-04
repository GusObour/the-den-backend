// services/JobSchedulerService.js
const cron = require('node-cron');

class JobSchedulerService {
    constructor(redisClient) {
        this.jobs = [];
        this.redisClient = redisClient;
    }

    registerJob(schedule, jobInstance) {
        this.jobs.push({ schedule, jobInstance });
    }

    start() {
        this.jobs.forEach(({ schedule, jobInstance }) => {
            cron.schedule(schedule, () => jobInstance.execute());
        });
    }
}

module.exports = JobSchedulerService;
