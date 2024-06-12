const { User } = require('../models/User');

class BarbersController {
    async getAllBarbers(req, res) {
        try {
            const barbers = await User.find({ role: 'Barber' });
            res.json(barbers);
        } catch (error) {
            console.error('Error fetching barbers:', error);
            res.status(500).json({ message: 'Error fetching barbers' });
        }
    }
}

module.exports = new BarbersController();
