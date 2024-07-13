const TwilioService = require('../services/TwilioService');
const Appointment = require('../models/Appointment');
const moment = require('moment');

class NotificationController {
    async notifyOneDayBefore() {
        const now = moment();
        const oneDayFromNow = moment().add(1, 'day');

        const appointments = await Appointment.find({
            'barberAvailability.start': {
                $gte: now.toDate(),
                $lt: oneDayFromNow.toDate()
            }
        }).populate('user barber service barberAvailability');

        for (const appointment of appointments) {
            const user = appointment.user;
            if (user.agreeToSms) {
                const message = `Reminder: Your appointment with ${appointment.barber.fullName} for ${appointment.service.name} is scheduled on ${moment(appointment.barberAvailability.start).format('MMMM Do YYYY, h:mm:ss a')}.`;
                await TwilioService.sendSMS(user.phoneNumber, message);
            }
        }
    }

    async notifyOneHourBefore() {
        const now = moment();
        const oneHourFromNow = moment().add(1, 'hour');

        const appointments = await Appointment.find({
            'barberAvailability.start': {
                $gte: now.toDate(),
                $lt: oneHourFromNow.toDate()
            }
        }).populate('user barber service barberAvailability');

        for (const appointment of appointments) {
            const user = appointment.user;
            if (user.agreeToSms) {
                const message = `Reminder: Your appointment with ${appointment.barber.fullName} for ${appointment.service.name} is scheduled in one hour at ${moment(appointment.barberAvailability.start).format('h:mm:ss a')}.`;
                await TwilioService.sendSMS(user.phoneNumber, message);
            }
        }
    }
}

module.exports = new NotificationController();
