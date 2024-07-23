const { User, Barber } = require("../models/User");
const { validationResult } = require("express-validator");
const BookingController = require('./bookingController');
const AvailabilityController = require('./availabilityController');

class UserController{
    async completeAppointment(req, res){
        const errors = validationResult(req.body);
        if(!errors.isEmpty()){
            return res.status(400).json({ errors: errors.array() });
        }

        const bookingResult = await BookingController.createAppointment(req);

        res.status(200).json({ success: bookingResult.success, message: bookingResult.message });
    }

    async getUserAppointments(req, res){
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        try {
            const results = await BookingController.getUserAppointments(userId, req);
            if (!results.success) {
                return res.status(500).json({ success: false, message: 'Error fetching appointments' });
            }

            res.status(200).json({ success: true, appointments: results.appointments });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            res.status(500).json({ success: false, message: 'Error fetching appointments' });
        }
    }

    async cancelAppointment(req, res){
        const errors = validationResult(req);
        const { appointmentId, userId } = req.params;

        if (!errors.isEmpty() || !appointmentId || !userId) {
            return res.status(400).json({ errors: errors.isEmpty() ? [{ msg: 'Appointment  and User ID are required' }] : errors.array() });
        }

        try {
            console.log()
            const results = await BookingController.cancelAppointment(appointmentId, userId, req);
            if (!results.success) {
                return res.status(500).json({ success: false, message: results.message });
            }

            res.status(200).json({ success: true, message: results.message });
        } catch (error) {
            console.error('Error canceling appointment:', error);
            res.status(500).json({ success: false, message: 'Error canceling appointment' });
        }
    }
}

module.exports = new UserController();