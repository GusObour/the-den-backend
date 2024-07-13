const Job = require('./Job');
const AppointmentNotificationController = require('../controllers/AppointmentNotificationController');

class NotifyOneHourBeforeJob extends Job {
    async execute() {
        try {
            await AppointmentNotificationController.notifyOneHourBefore();
        } catch (error) {
            console.error('Error executing NotifyOneHourBeforeJob:', error);
        }
    }
}

module.exports = NotifyOneHourBeforeJob;
