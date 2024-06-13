const Appointment = require('../models/Appointment');
const BarberAvailability = require('../models/BarberAvailability');

const unlockAppointments = async () => {
    try {
        // Find all locked appointments that haven't been booked, completed, or cancelled
        const expiredLocks = await BarberAvailability.find({
            locked: true,
            lockExpiration: { $lte: new Date() },
            appointment: null
        });

        for (let lock of expiredLocks) {
            lock.locked = false;
            lock.lockExpiration = null;
            await lock.save();
        }

        console.log(`${expiredLocks.length} appointments unlocked.`);
    } catch (error) {
        console.error('Error unlocking appointments:', error);
    }
};

module.exports = unlockAppointments;
