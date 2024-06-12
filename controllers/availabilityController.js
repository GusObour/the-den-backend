const Availability = require('../models/BarberAvailability');

class AvailabilityController {
    async getAvailability(req, res) {
        const { barberId, date } = req.query;

        if (!barberId || !date) {
            return res.status(400).json({ message: 'Barber ID and date are required' });
        }

        try {
            const availability = await Availability.find({ barber: barberId, date: new Date(date) });
            res.json(availability);
        } catch (error) {
            console.error('Error fetching availability:', error);
            res.status(500).json({ message: 'Error fetching availability' });
        }
    }
}

module.exports = new AvailabilityController();
