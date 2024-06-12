const mongoose = require('mongoose');

const barberAvailabilitySchema = new mongoose.Schema({
    barber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barber',
        required: true
    },
    date: {
        type: Date,
        required: true,
        get: v => new Date(v).toISOString(),
        set: v => new Date(v).toISOString()
    },
    start: {
        type: Date,
        required: true,
        get: v => new Date(v).toISOString(),
        set: v => new Date(v).toISOString()
    },
    end: {
        type: Date,
        required: true,
        get: v => new Date(v).toISOString(),
        set: v => new Date(v).toISOString()
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        default: null
    },
    locked: {
        type: Boolean,
        default: false
    },
    lockExpiration: {
        type: Date,
        default: null,
        get: v => new Date(v).toISOString(),
        set: v => new Date(v).toISOString()
    }
});

module.exports = mongoose.model('BarberAvailability', barberAvailabilitySchema);
