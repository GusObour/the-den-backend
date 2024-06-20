const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const BarberAvailability = require('../models/BarberAvailability');
const RedisClient = require('../services/RedisClientService');
const TwilioService = require('../services/TwilioService');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const { User, Barber } = require('../models/User');
const Service = require('../models/Service');
const moment = require('moment');

class BookingController {
    constructor() {
        this.redisClient = RedisClient;
    }

    async createAppointment(req, res) {
        const { date, start, end, barberId, userId, serviceId } = req.body;

        const MAX_RETRIES = 3; // Maximum number of retries to book an appointment
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const availability = await BarberAvailability.findOne({
                    barber: barberId,
                    date: new Date(date),
                    start: new Date(start),
                    end: new Date(end),
                    appointment: null,
                    locked: true,
                    lockedBy: userId,
                    lockExpiration: { $gte: new Date() }
                });

                if (!availability) {
                    await session.abortTransaction();
                    return res.status(400).json({ message: 'Appointment slot is no longer available' });
                }

                const appointment = new Appointment({
                    user: userId,
                    barber: barberId,
                    service: serviceId,
                    status: 'Booked',
                    barberAvailability: availability._id,
                });

                await appointment.save({ session });

                availability.appointment = appointment._id;
                availability.locked = false;
                availability.lockedBy = null;
                availability.lockExpiration = null;
                await availability.save({ session });

                // Invalidate the cache for barber and user appointments
                try {
                    await this.redisClient.del(`barberAppointments:${barberId}`);
                    await this.redisClient.del(`userAppointments:${userId}`);
                } catch (cacheError) {
                    console.error('Error invalidating cache:', cacheError);
                }

                await session.commitTransaction();
                return res.status(201).json({ success: true, message: 'Appointment booked successfully', appointment });
            } catch (error) {
                if (error.code === 112 && attempt < MAX_RETRIES - 1) {
                    console.warn(`Write conflict detected, retrying operation (attempt ${attempt + 1})...`);
                    await session.abortTransaction();
                    continue;
                } else {
                    console.error('Error creating appointment:', error);
                    await session.abortTransaction();
                    return res.status(500).json({ message: 'Error creating appointment' });
                }
            } finally {
                session.endSession();
            }
        }

        return res.status(500).json({ message: 'Failed to create appointment after multiple attempts. Please try again later.' });
    }

    async unlockExpiredSlots() {
        const now = new Date();
        const results = await BarberAvailability.updateMany(
            { locked: true, lockExpiration: { $lt: now } },
            { $set: { locked: false, lockExpiration: null, lockedBy: null } }
        );

        console.log(`unlocked ${results.nModified} expired slots`);
    }

    async getBarberAppointments(barberId) {
        const cacheKey = `barberAppointments:${barberId}`;
        const cachedData = await RedisClient.get(cacheKey);

        if (cachedData) {
            return { appointments: JSON.parse(cachedData), success: true };
        }

        try {
            const appointments = await Appointment.find({ barber: barberId })
                .populate('user')
                .populate('service')
                .populate('barberAvailability')
                .populate('barber');

            const returnedAppointments = appointments.map(appointment => {
                return {
                    _id: appointment._id,
                    user: {
                        _id: appointment.user._id,
                        fullName: appointment.user.fullName,
                    },
                    barber: {
                        _id: appointment.barber._id,
                        fullName: appointment.barber.fullName,
                    },
                    service: appointment.service.name,
                    date: appointment.barberAvailability.date,
                    start: appointment.barberAvailability.start,
                    end: appointment.barberAvailability.end,
                    status: appointment.status,
                };
            });

            await this.redisClient.set(cacheKey, JSON.stringify(returnedAppointments), 3600); // Cache for 1 hour

            return { appointments: returnedAppointments, success: true };
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return { success: false, message: 'Error fetching appointments' };
        }
    }

    async getUserAppointments(userId) {
        const cacheKey = `userAppointments:${userId}`;
        const cachedData = await RedisClient.get(cacheKey);

        if (cachedData) {
            return { appointments: JSON.parse(cachedData), success: true };
        }

        try {
            const appointments = await Appointment.find({ user: userId })
                .populate('barber')
                .populate('service')
                .populate('barberAvailability');

            const returnedAppointments = appointments.map(appointment => {
                return {
                    _id: appointment._id,
                    barber: {
                        _id: appointment.barber._id,
                        fullName: appointment.barber.fullName,
                    },
                    service: appointment.service.name,
                    date: appointment.barberAvailability.date,
                    start: appointment.barberAvailability.start,
                    end: appointment.barberAvailability.end,
                    status: appointment.status,
                };
            });

            await this.redisClient.set(cacheKey, JSON.stringify(returnedAppointments), 3600); // Cache for 1 hour

            return { appointments: returnedAppointments, success: true };
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return { success: false, message: 'Error fetching appointments' };
        }
    }

    async updateExpiredAppointments() {
        const now = new Date();

        try {
            const barberAvailabilities = await BarberAvailability.find({ 'end': { $lt: now } }, '_id');
            const availabilityIds = barberAvailabilities.map(availability => availability._id);
            const results = await Appointment.updateMany(
                { status: 'Booked', barberAvailability: { $in: availabilityIds } },
                { $set: { status: 'Completed' } }
            );

            console.log(`Updated ${results.nModified} expired appointments`);
        } catch (error) {
            console.error('Error updating expired appointments:', error);
        }
    }


    async cancelAppointment(appointmentId, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const appointment = await Appointment.findById(appointmentId).populate('barberAvailability').session(session);
            if (!appointment) {
                await session.abortTransaction();
                return { success: false, message: 'Appointment not found' };
            }

            const barberAvailability = await BarberAvailability.findById(appointment.barberAvailability._id).session(session);
            if (!barberAvailability) {
                await session.abortTransaction();
                return { success: false, message: 'Barber availability not found' };
            }

            const appointmentStartTime = moment(appointment.barberAvailability.start);
            const currentTime = moment();
            const timeDifference = appointmentStartTime.diff(currentTime, 'hours');

            if (timeDifference < 12) {
                appointment.status = 'Cancelled';
                await appointment.save({ session });
            } else {
                await appointment.remove({ session });
                barberAvailability.appointment = null;
                barberAvailability.lockedBy = null;
                await barberAvailability.save({ session });
            }

            await this.redisClient.del(`barberAppointments:${appointment.barber}`);
            await this.redisClient.del(`userAppointments:${appointment.user}`);

            await session.commitTransaction();

            // TO-DO: Notify user about the cancellation
            // TO-DO: Notify all users about the potential open slot if timeDifference < 12

            return { success: true, message: 'Appointment canceled successfully' };
        } catch (error) {
            await session.abortTransaction();
            console.error('Error canceling appointment:', error);
            return { success: false, message: 'Error canceling appointment' };
        } finally {
            session.endSession();
        }
    }

}

module.exports = new BookingController();
