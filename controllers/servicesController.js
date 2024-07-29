const Service = require('../models/Service');

class ServicesController {
    async getAllServices(req, res) {
        try {
            const redisClient = req.redisClient;
            const cacheKey = 'services';

            const cachedData = await redisClient.get(cacheKey);

            if(cachedData){
                return res.status(200).json(JSON.parse(cachedData));
            }

            const services = await Service.find();
            await redisClient.set(cacheKey, JSON.stringify(services),'EX', 3600);

            res.status(200).json(services);
        } catch (error) {
            console.error('Error fetching services:', error);
            res.status(500).json({ message: 'Error fetching services' });
        }
    }
}

module.exports = new ServicesController();
