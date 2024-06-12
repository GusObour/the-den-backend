const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        get: getPrice,
        set: setPrice,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    },
    duration: {
        type: Number,
        required: true,
        validate: {
            validator: number => number > 0,
            message: '{VALUE} is not a positive number'
        }
    }
});

function getPrice(num) {
    return `$${(num / 100).toFixed(2)}`;
}

function setPrice(num) {
    return num * 100;
}

module.exports = mongoose.model('Service', serviceSchema);
