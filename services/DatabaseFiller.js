const bcrypt = require('bcryptjs');
const moment = require('moment');
const { User, Barber } = require('../models/User');
const Availability = require('../models/BarberAvailability');

class BarberClass {
    constructor(id, fullName) {
        this.id = id;
        this.fullName = fullName;
    }

    static async findOne() {
        const barberData = await User.findOne({ role: 'Barber' });
        if (barberData) {
            return new BarberClass(barberData._id, barberData.fullName);
        } else {
            throw new Error('Barber not found.');
        }
    }
}

class AvailabilityClass {
    constructor(barberId, date, start, end) {
        this.barber = barberId;
        this.date = date;
        this.start = start;
        this.end = end;
        this.appointment = null;
        this.locked = false;
        this.lockExpiration = null;
    }

    async save() {
        const availability = new Availability({
            barber: this.barber,
            date: this.date,
            start: this.start,
            end: this.end,
            appointment: this.appointment,
            locked: this.locked,
            lockExpiration: this.lockExpiration
        });
        await availability.save();
    }

    static async countDocuments() {
        return await Availability.countDocuments();
    }
}

class DatabaseFiller {
    async fillAvailabilityDatabase() {
        try {
            const count = await AvailabilityClass.countDocuments();

            if (count === 0) {
                const barber = await BarberClass.findOne();

                const today = moment().utc(); // Get current date and time in UTC

                for (let j = 0; j < 7; j++) {
                    const thisDay = today.clone().add(j, 'days').startOf('day'); // Start of each day in UTC

                    for (let i = 9; i <= 16; i++) {
                        let start = thisDay.clone().add(i, 'hours'); // Start time at ith hour in UTC
                        let end = start.clone().add(1, 'hours'); // End time at (i+1)th hour in UTC

                        const availabilityToAdd = new AvailabilityClass(
                            barber.id,
                            thisDay.toDate(), // Convert to JavaScript Date object
                            start.toDate(), // Convert to JavaScript Date object
                            end.toDate() // Convert to JavaScript Date object
                        );

                        await availabilityToAdd.save();
                    }
                }
                console.log(`Availability database filled for a week for ${barber.fullName}.`);
            } else {
                console.log('Availability database is not empty. No new records added.');
            }
        } catch (error) {
            console.error('Error filling availability database:', error.message);
        }
    }
}

async function addTempBarberAndFillAvailability() {
    const barberData = {
        fullName: 'Miguel Rodriguez',
        email: 'miguel.rodriguez@example.com',
        phoneNumber: '1234567890',
        password: await bcrypt.hash('Password123!', 10),
        admin: false,
        headShot: 'https://randomuser.me/api/portraits/men/75.jpg',
        agreeToSms: true,
        verified: true
    };

    let barber = await User.findOne({ email: barberData.email });
    if (!barber) {
        barber = new Barber(barberData);
        await barber.save();
        console.log('Temporary barber created:', barber);
    } else {
        console.log('Temporary barber already exists:', barber);
    }

    const databaseFiller = new DatabaseFiller();
    await databaseFiller.fillAvailabilityDatabase();
}

module.exports = {
    addTempBarberAndFillAvailability
};
