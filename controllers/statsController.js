const Appointment = require('../models/Appointment');
const moment = require('moment');

class StatsController {
    async getCompletedAppointments(req, res) {
        try {
            const today = moment().utc().startOf('day').toDate();
            const tomorrow = moment().utc().add(1, 'days').startOf('day').toDate();

            const completedAppointments = await Appointment.countDocuments({
                status: 'Completed',
                date: { $gte: today, $lt: tomorrow }
            });

            res.json({ completedAppointments });
        } catch (error) {
            console.error('Failed to fetch completed appointments:', error);
            res.status(500).json({ message: 'Failed to fetch completed appointments' });
        }
    }

    async getTodaysCanceledAppointments(req, res) {
        try {
            const today = moment().utc().startOf('day').toDate();
            const tomorrow = moment().utc().add(1, 'days').startOf('day').toDate();

            const canceledAppointments = await Appointment.countDocuments({
                status: 'Canceled',
                date: { $gte: today, $lt: tomorrow }
            });

            res.json({ canceledAppointments });
        } catch (error) {
            console.error('Failed to fetch canceled appointments:', error);
            res.status(500).json({ message: 'Failed to fetch canceled appointments' });
        }
    }

    async getTodaysEarnings(req, res) {
        try {
            const today = moment().utc().startOf('day').toDate();
            const tomorrow = moment().utc().add(1, 'days').startOf('day').toDate();

            const appointments = await Appointment.find({
                status: 'Completed',
                date: { $gte: today, $lt: tomorrow }
            }).populate('service');

            const earnings = appointments.reduce((total, appointment) => total + appointment.service.price, 0);

            res.json({ earnings });
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
            res.status(500).json({ message: 'Failed to fetch earnings' });
        }
    }

    async getTotalEarnings(req, res) {
        try {
            const endDate = moment().utc().endOf('isoWeek').toDate();
            const startDate = moment().utc().startOf('isoWeek').toDate();

            const appointments = await Appointment.find({
                status: 'Completed',
                date: { $gte: startDate, $lte: endDate }
            }).populate('service');

            const totalEarnings = appointments.reduce((total, appointment) => total + appointment.service.price, 0);

            res.json({ totalEarnings });
        } catch (error) {
            console.error('Failed to fetch total earnings:', error);
            res.status(500).json({ message: 'Failed to fetch total earnings' });
        }
    }
}

module.exports = new StatsController();
