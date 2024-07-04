const express = require('express');
const BarbersController = require('../controllers/barbersController');
const AvailabilityController = require('../controllers/availabilityController');
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
  BarbersController.getBarberAppointments
);

router.get(
  '/availability',
  authMiddleware.authenticate,
  [
    check('barberId').not().isEmpty().withMessage('Barber ID is required')
  ],
  BarbersController.getBarberAvailability
);

router.delete(
  '/cancel-appointment/:appointmentId/:userId',
  authMiddleware.authenticate,
  [
    check('appointmentId').not().isEmpty().withMessage('Appointment ID is required'),
    check('userId').not().isEmpty().withMessage('User ID is required')
  ],
  BarbersController.cancelAppointment
);

router.put(
  '/complete-appointment/:appointmentId/:userId',
  authMiddleware.authenticate,
  [
    check('appointmentId').not().isEmpty().withMessage('Appointment ID is required'),
    check('userId').not().isEmpty().withMessage('User ID is required')
  ],
  BarbersController.completeAppointment
);

module.exports = router;
