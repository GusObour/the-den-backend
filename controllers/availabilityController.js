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

    async getBarberAvailability(barberId, req, cacheExpiry = 3600) {
        const redisClient = req.redisClient;
        const cacheKey = `barberAvailability:${barberId}`;
      
        try {
          const cachedData = await redisClient.get(cacheKey);
      
          if (cachedData) {
            return { success: true, availability: JSON.parse(cachedData) };
          }
      
          const availability = await Availability.find({
            barber: barberId,
            appointment: null,
            locked: false,
          }).populate('barber', '_id fullName');
      
          if (availability.length > 0) {
            await redisClient.set(cacheKey, JSON.stringify(availability), 'EX', cacheExpiry);
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
