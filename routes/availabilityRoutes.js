
const AvailabilityController = require('../controllers/availabilityController');
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { check, validationResult } = require('express-validator');
const cron = require('node-cron');
const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get(
  '/',
  [
    check('barberId').not().isEmpty().withMessage('Barber ID is required'),
    check('date').not().isEmpty().withMessage('Date is required'),
    check('userId').not().isEmpty().withMessage('User ID is required')
  ],
  validateRequest,
  AvailabilityController.getAvailability
);

router.get(
    '/dates',
    [
      check('barberId').not().isEmpty().withMessage('Barber ID is required'),
    ],
    validateRequest,
    AvailabilityController.getAvailableDates
  );

router.post(
  '/',
  authMiddleware.authenticate,
  [
    check('barberId').not().isEmpty().withMessage('Barber ID is required'),
    check('startDate').not().isEmpty().withMessage('Start date is required'),
    check('start').not().isEmpty().withMessage('Start time is required'),
    check('end').not().isEmpty().withMessage('End time is required')
  ],
  validateRequest,
  AvailabilityController.addAvailability
);

router.put(
  '/block',
  authMiddleware.authenticate,
  [
    check('availabilityIds').isArray().withMessage('Availability IDs are required')
  ],
  validateRequest,
  AvailabilityController.blockAvailabilities
);

router.put(
    '/unblock',
    authMiddleware.authenticate,
    [
      check('availabilityIds').isArray().withMessage('Availability IDs are required')
    ],
    validateRequest,
    AvailabilityController.unblockAvailabilities
  );


router.delete(
  '/:id',
  authMiddleware.authenticate,
  [
    check('id').not().isEmpty().withMessage('Availability ID is required')
  ],
  validateRequest,
  AvailabilityController.deleteAvailability
);

router.put(
    '/:id',
    authMiddleware.authenticate,
    [
      check('id').not().isEmpty().withMessage('Availability ID is required')
    ],
    validateRequest,
    AvailabilityController.updateAvailability
  );

module.exports = router;