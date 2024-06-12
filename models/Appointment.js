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
        ref: 'User', // Change from 'Barber' to 'User' to match the unified User model
        required: true
    },
    service: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: "Pending",
        enum: ["Pending", "Booked", "Completed", "Cancelled"]
    },
    notes: {
        type: String
    }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
