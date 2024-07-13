const Job = require('./Job');
const AppointmentNotificationController = require('../controllers/AppointmentNotificationController');

class NotifyOneDayBeforeJob extends Job {
    async execute() {
        try {
            await AppointmentNotificationController.notifyOneDayBefore();
        } catch (error) {
            console.error('Error executing NotifyOneDayBeforeJob:', error);
        }
    }
}

module.exports = NotifyOneDayBeforeJob;
