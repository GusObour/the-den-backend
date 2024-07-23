const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');
const UserController = require('../controllers/userController');

const router = express.Router();

router.get('/appointments', authMiddleware.authenticate, [
    check('userId').not().isEmpty().withMessage('User ID is required')
], UserController.getUserAppointments);

router.post('/complete-appointment', authMiddleware.authenticate, [
    check('userId').not().isEmpty().withMessage('User ID is required'),
    check('barberId').not().isEmpty().withMessage('Barber ID is required'),
    check('serviceId').not().isEmpty().withMessage('Service ID is required'),
    check('date').not().isEmpty().withMessage('Date is required'),
    check('start').not().isEmpty().withMessage('Start time is required'),
    check('end').not().isEmpty().withMessage('End time is required')
], UserController.completeAppointment);

router.delete('/cancel-appointment/:appointmentId/:userId', authMiddleware.authenticate,
    [
        check('appointmentId').not().isEmpty().withMessage('Appointment ID is required'),
        check('userId').not().isEmpty().withMessage('User ID is required')
    ], UserController.cancelAppointment);


module.exports = router;