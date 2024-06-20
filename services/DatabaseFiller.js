const bcrypt = require('bcryptjs');
const moment = require('moment');
const { User, Barber } = require('../models/User');
const Availability = require('../models/BarberAvailability');
const Service = require('../models/Service');

class BarberClass {
    constructor({ fullName, email, phoneNumber, password, admin, headShot, agreeToSms, verified, _id }) {
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.password = password;
        this.admin = admin;
        this.headShot = headShot;
        this.agreeToSms = agreeToSms;
        this.verified = verified;
        this._id = _id;
    }

    static async findOne() {
        const barberData = await User.findOne({ role: 'Barber' });
        if (barberData) {
            return new BarberClass(barberData);
        } else {
            throw new Error('Barber not found.');
        }
    }

    async save() {
        let barber = await User.findOne({ email: this.email });
        if (!barber) {
            const hashedPassword = await bcrypt.hash(this.password, 10);
            barber = new User({
                fullName: this.fullName,
                email: this.email,
                phoneNumber: this.phoneNumber,
                password: hashedPassword,
                admin: this.admin,
                headShot: this.headShot,
                agreeToSms: this.agreeToSms,
                verified: this.verified
            });
            await barber.save();
            console.log('Temporary barber created:', barber);
        } else {
            console.log('Temporary barber already exists:', barber);
        }
    }
}

class AvailabilityClass {
    constructor({ barberId, date, start, end }) {
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

class ServiceClass {
    constructor({ name, price, duration }) {
        this.name = name;
        this.price = price;
        this.duration = duration;
    }

    static async addServices() {
        const services = [
            {name: 'The Basics', price:40, duration: 30, description: 'A simple haircut with a line up.'},
            {name: 'The Executive', price:45, duration: 45, description: 'A haircut with line up, bread trim/shave & enhancements.'},
            {name: 'The V.I.P', price:50, duration: 60, description: 'A haircut with line up, steam + hot towel, bread trim/shave & enhancements.'},
            {name: 'The Kids Cut 5 - 17', price:30, duration: 30, description: 'A simple haircut with a line up for kids.'},
            {name: 'senior Cut 65+', price:30, duration: 30, description: 'A simple haircut with a line up for seniors.'},
            {name: 'The Beard Trim / line up', price:25, duration: 15, description: 'A simple beard trim.'}
        ];

        try {
            await Service.insertMany(services);
            console.log('Services added successfully');
        } catch (err) {
            console.error('Failed to add services', err.message);
        }
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

                        const availabilityToAdd = new AvailabilityClass({
                            barberId: barber._id,
                            date: thisDay.toDate(), // Convert to JavaScript Date object
                            start: start.toDate(), // Convert to JavaScript Date object
                            end: end.toDate() // Convert to JavaScript Date object
                        });

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

    async addTempBarberAndFillAvailability() {
        // const barberData = {
        //     fullName: 'Miguel Rodriguez',
        //     email: 'miguel.rodriguez@example.com',
        //     phoneNumber: '1234567890',
        //     password: 'Password123!',
        //     admin: false,
        //     headShot: 'https://randomuser.me/api/portraits/men/75.jpg',
        //     agreeToSms: true,
        //     verified: true
        // };

        // const barber = new BarberClass(barberData);
        // await barber.save();

        await this.fillAvailabilityDatabase();
        // await ServiceClass.addServices();
    }
}

module.exports = new DatabaseFiller();
