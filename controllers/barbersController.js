const { User, Barber } = require('../models/User');
const BookingController = require('./bookingController');
const AvailabilityController = require('./availabilityController');
const { validationResult } = require("express-validator");
class BarbersController {
  async getAllBarbers(req, res) {
    try {
      const barbers = await User.find({ role: 'Barber' });
      const barbersData = barbers.map(barber => {
        return {
          id: barber._id,
          fullName: barber.fullName,
          email: barber.email,
          phoneNumber: barber.phoneNumber,
          headShot: `${process.env.SERVER_URL}/${barber.headShot}`
        }
      });
      res.json(barbersData);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      res.status(500).json({ message: 'Error fetching barbers' });
    }
  }

  async getBarberAppointments(req, res) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { barberId } = req.query;
    if (!barberId) {
      return res.status(400).json({ success: false, message: 'Barber ID is required' });
    }

    try {
      const results = await BookingController.getBarberAppointments(barberId,req);
      if (!results.success) {
        return res.status(500).json({ success: false, message: 'Error fetching appointments' });
      }

      res.status(200).json({ success: true, appointments: results.appointments });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ success: false, message: 'Error fetching appointments' });
    }
  }

  async getBarberAvailability(req, res) {
    const errors = validationResult(req);
    const { barberId } = req.query;

    if (!errors.isEmpty() || !barberId) {
      return res.status(400).json({ errors: errors.isEmpty() ? [{ msg: 'Barber ID is required' }] : errors.array() });
    }

    try {
      const results = await AvailabilityController.getBarberAvailability(barberId, req);

      if (results.success) {
        return res.json({ availability: results.availability });
      } else {
        return res.status(404).json({ message: 'No availability found' });
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      return res.status(500).json({ message: 'Error fetching availability' });
    }
  }

  async cancelAppointment(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appointmentId, userId } = req.params;
    if (!appointmentId || !userId) {
      return res.status(400).json({ success: false, message: 'Appointment ID is required' });
    }

    try {
      const results = await BookingController.cancelAppointment(appointmentId, userId, req);
      if (results.success) {
        return res.json({ success: true, message: results.message });
      } else {
        return res.status(404).json({ success: false, message: results.message  });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return res.status(500).json({ success: false, message: 'Error cancelling appointment' });
    }
  }

  async completeAppointment(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appointmentId, userId } = req.params;
    if (!appointmentId || !userId) {
      return res.status(400).json({ success: false, message: 'Appointment, user, amd barber IDs are required' });
    }

    try {
      const results = await BookingController.completeAppointment(appointmentId, userId, req);
      if (results.success) {
        return res.json({ success: true, message: results.message });
      } else {
        return res.status(404).json({ success: false, message: results.message });
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      return res.status(500).json({ success: false, message: 'Error completing appointment' });
    }
  }

}

module.exports = new BarbersController();
