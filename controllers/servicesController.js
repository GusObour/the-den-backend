const Service = require('../models/Service');

class ServicesController {
    async getAllServices(req, res) {
        try {
            const services = await Service.find();
            res.json(services);
        } catch (error) {
            console.error('Error fetching services:', error);
            res.status(500).json({ message: 'Error fetching services' });
        }
    }
}

module.exports = new ServicesController();
