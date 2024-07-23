const express = require('express');
const bookingController  = require('../controllers/bookingController');
const InvoiceService = require('../services/InvoiceService');
const router = express.Router();
// const cron = require('node-cron');

router.post('/appointment', bookingController.createAppointment);

module.exports = router;
