const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const UserController = require('../controllers/userController');

const router = express.Router();

router.get('/appointments', authMiddleware.authenticate, [
    check('userId').not().isEmpty().withMessage('User ID is required')
], UserController.getUserAppointments);

router.delete('/cancel-appointment/:appointmentId/:userId', authMiddleware.authenticate,
    [
        check('appointmentId').not().isEmpty().withMessage('Appointment ID is required'),
        check('userId').not().isEmpty().withMessage('User ID is required')
    ],UserController.cancelAppointment);

module.exports = router;