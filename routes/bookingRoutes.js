const express = require('express');
const bookingController = require('../controllers/bookingController');
const router = express.Router();

router.post('/appointment', bookingController.createAppointment);

module.exports = router;
