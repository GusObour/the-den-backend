const express = require('express');
const statsController = require('../controllers/statsController.js');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/completed-appointments', authMiddleware.authenticate, statsController.getCompletedAppointments);
router.get('/canceled-appointments', authMiddleware.authenticate, statsController.getTodaysCanceledAppointments);
router.get('/todays-earnings', authMiddleware.authenticate, statsController.getTodaysEarnings);
router.get('/total-week-earnings', authMiddleware.authenticate, statsController.getTotalEarnings);

module.exports = router;
