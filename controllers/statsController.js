const Appointment = require('../models/Appointment');
const moment = require('moment');

class StatsController {
    constructor() {
        this.getCompletedAppointments = this.getCompletedAppointments.bind(this);
        this.getTodaysCanceledAppointments = this.getTodaysCanceledAppointments.bind(this);
        this.getTodaysEarnings = this.getTodaysEarnings.bind(this);
        this.getTotalEarnings = this.getTotalEarnings.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    async getCompletedAppointments(req, res) {
        try {
            const { today, tomorrow } = this.getStartAndEndOfDay();
            const completedAppointments = await this.countAppointments('Completed', today, tomorrow);
            res.json({ completedAppointments });
        } catch (error) {
            this.handleError(res, 'Failed to fetch completed appointments', error);
        }
    }

    async getTodaysCanceledAppointments(req, res) {
        try {
            const { today, tomorrow } = this.getStartAndEndOfDay();
            const canceledAppointments = await this.countAppointments('Cancelled', today, tomorrow);
            res.json({ canceledAppointments });
        } catch (error) {
            this.handleError(res, 'Failed to fetch canceled appointments', error);
        }
    }

    async getTodaysEarnings(req, res) {
        try {
            const { today, tomorrow } = this.getStartAndEndOfDay();
            const earnings = await this.calculateEarnings(today, tomorrow);
            res.json({ earnings });
        } catch (error) {
            this.handleError(res, 'Failed to fetch earnings', error);
        }
    }

    async getTotalEarnings(req, res) {
        try {
            const startDate = moment().utc().startOf('isoWeek').toDate();
            const endDate = moment().utc().endOf('isoWeek').toDate();
            const totalEarnings = await this.calculateEarnings(startDate, endDate);
            res.json({ totalEarnings });
        } catch (error) {
            this.handleError(res, 'Failed to fetch total earnings', error);
        }
    }

    getStartAndEndOfDay() {
        const today = moment().utc().startOf('day').toDate();
        const tomorrow = moment().utc().add(1, 'days').startOf('day').toDate();
        return { today, tomorrow };
    }

    async countAppointments(status, startDate, endDate) {
        return await Appointment.countDocuments({
            status,
            date: { $gte: startDate, $lt: endDate }
        });
    }

    async calculateEarnings(startDate, endDate) {
        const appointments = await Appointment.find({
            status: 'Completed',
            date: { $gte: startDate, $lt: endDate }
        }).populate('service');
        return appointments.reduce((total, appointment) => total + appointment.service.price, 0);
    }

    handleError(res, message, error) {
        console.error(message, error);
        res.status(500).json({ message });
    }
}

module.exports = new StatsController();
