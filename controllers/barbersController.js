const { User } = require('../models/User');

class BarbersController {
    async getAllBarbers(req, res) {
        try {
            const barbers = await User.find({ role: 'Barber' });
            const barbersData = barbers.map(barber => {
                return{
                    id: barber._id,
                    fullName: barber.fullName,
                    email: barber.email,
                    phoneNumber: barber.phoneNumber,
                    headShot: barber.headShot,
                }
            });
            res.json(barbersData);
        } catch (error) {
            console.error('Error fetching barbers:', error);
            res.status(500).json({ message: 'Error fetching barbers' });
        }
    }
}

module.exports = new BarbersController();
