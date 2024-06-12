const express = require('express');
const BarbersController = require('../controllers/barbersController');

const router = express.Router();

router.get('/', BarbersController.getAllBarbers);

module.exports = router;
