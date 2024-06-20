const Availability = require('../models/BarberAvailability');
const redisClient = require('../services/RedisClientService');

class AvailabilityController {
    async getAvailability(req, res) {
        const { userId, barberId, date } = req.query;

        if (!barberId || !date) {
            return res.status(400).json({ message: 'Barber ID and date are required' });
        }

        try {
            const availability = await Availability.find({ barber: barberId, date: new Date(date) });

            const filteredAvailability = availability.filter(item => {
                return item.appointment === null && (item.locked === false || item.lockedBy.toString() === userId);
            });

            res.json(filteredAvailability);
        } catch (error) {
            console.error('Error fetching availability:', error);
            res.status(500).json({ message: 'Error fetching availability' });
        }
    }

    async getBarberAvailability(barberId) {
        try {
            const availability = await Availability.find({
                barber: barberId,
                appointment: null,
                locked: false
            }).populate('barber', '_id fullName');


            if (availability.length > 0) {
                return { success: true, availability };
            } else {
                return { success: false, message: 'No availability found' };
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
            return { success: false, message: 'Error fetching availability' };
        }
    }

}

module.exports = new AvailabilityController();
