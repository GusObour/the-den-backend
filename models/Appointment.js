const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
    barberAvailability:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BarberAvailability',
        required: true
    }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
