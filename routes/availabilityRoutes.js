const express = require('express');
const AvailabilityController = require('../controllers/availabilityController');

const router = express.Router();

router.get('/', AvailabilityController.getAvailability);

module.exports = router;
