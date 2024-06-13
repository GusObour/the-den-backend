const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    barber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barber',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    status: {
        type: String,
        required: true,
        default: "Pending",
        enum: ["Pending", "Booked", "Completed", "Cancelled"]
    },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
