const express = require('express');
const ServicesController = require('../controllers/servicesController');

const router = express.Router();

router.get('/', ServicesController.getAllServices);

module.exports = router;
