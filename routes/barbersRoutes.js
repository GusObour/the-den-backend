const express = require('express');
const BarbersController = require('../controllers/barbersController');
const authMiddleware = require('../middleware/authMiddleware');
const { check } = require('express-validator');

const router = express.Router();

router.get('/', BarbersController.getAllBarbers);
router.get(
    '/appointments',
    authMiddleware.authenticate,
    [
        check('barberId').not().isEmpty().withMessage('Barber ID is required')
    ],
    BarbersController.getBarberAppointments);

router.get(
    '/availability',
    authMiddleware.authenticate,
    [
        check('barberId').not().isEmpty().withMessage('Barber ID is required')
    ],
    BarbersController.getBarberAvailability
);

router.delete('/cancel-appointment', authMiddleware.authenticate, 
[
    check('appointmentId').not().isEmpty().withMessage('Appointment ID is required')
],
BarbersController.cancelAppointment)

module.exports = router;
