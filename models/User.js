const mongoose = require('mongoose');

const options = { discriminatorKey: 'role', collection: 'users' };

const baseUserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    admin: {
        type: Boolean,
        required: true,
        default: false
    },
    headShot: { type: String, required: false },
    agreeToSms: { type: Boolean, default: true },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    verificationCode: {
        type: Number,
        default: null
    },
    verificationAttempts: {
        type: Number,
        default: 0
    },
    verificationAttemptsExpiration: {
        type: Date,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordTokenExpiration: {
        type: Date,
        default: null
    },
    nextResetAllowedAfter: {
        type: Date,
        default: null
    },
    googleCalendarTokens: {
        accessToken: {
            type: String,
            default: null
        },
        refreshToken: {
            type: String,
            default: null
        },
        tokenExpirationDate: {
            type: Date,
            default: null
        }
    }
}, options);

const User = mongoose.model('User', baseUserSchema);

const barberSchema = new mongoose.Schema({
    // Add any additional fields specific to barbers here
}, options);

const Barber = User.discriminator('Barber', barberSchema);

module.exports = { User, Barber };
