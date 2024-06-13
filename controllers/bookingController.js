const Appointment = require('../models/Appointment');
const BarberAvailability = require('../models/BarberAvailability');
const TwilioService = require('../services/TwilioService');
const GoogleCalendarService = require('../services/GoogleCalendarService');
const {User, Barber} = require('../models/User');
const Service = require('../models/Service');

class BookingController {
    async createAppointment(req, res) {
        const { date, start, end, barberId, userId, serviceId} = req.body;
        try {
            const availability = await BarberAvailability.findOne({
                barber: barberId,
                date: new Date(date),
                start: new Date(start),
                end: new Date(end),
                appointment: null,
                locked: true,
                lockExpiration: { $gte: new Date() }
            });

            if (!availability) {
                return res.status(400).json({ message: 'Appointment slot is no longer available' });
            }

            const appointment = new Appointment({
                date,
                start,
                end,
                user: userId,
                barber: barberId,
                service: serviceId,
                status: 'Booked'
            });

            await appointment.save();

            availability.appointment = appointment._id;
            availability.locked = false;
            availability.lockExpiration = null;
            await availability.save();

            const user = await User.findById(userId);
            const barber = await User.findById(barberId);
            const service = await Service.findById(serviceId)
            
            // await TwilioService.sendSMS(user.phoneNumber, `Your appointment for ${service.name} on ${date} at ${start} is confirmed.`);

            // const tokens = user.googleCalendarTokens;
            // GoogleCalendarService.setCredentials(tokens);

            // await GoogleCalendarService.createEvent({
            //     summary: `Appointment with ${user.fullName}`,
            //     description: `Service: ${service}`,
            //     start,
            //     end,
            //     attendees: [user.email, barber.email]
            // });

            res.status(201).json({ message: 'Appointment booked successfully', appointment });
        } catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({ message: 'Error creating appointment' });
        }
    }
}

module.exports = new BookingController();
