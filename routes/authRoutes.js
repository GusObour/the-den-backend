const express = require('express');
const { check } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer();

const router = express.Router();

// Registration Route
router.post(
  '/register',upload.single('headShot'),
  [
    check('fullName').not().isEmpty().withMessage('Full name is required'),
    check('email').isEmail().withMessage('Invalid email format'),
    check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    check('admin').optional().isBoolean().withMessage('isLeader must be a boolean'),
    check('phoneNumber').isMobilePhone().withMessage('Invalid phone number format'),
  ],
  AuthController.register
);

// Login Route
router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Invalid email format'),
    check('password').not().isEmpty().withMessage('Password is required'),
  ],
  AuthController.login
);

// Update Profile Route
router.put(
  '/updateProfile',
  authMiddleware.authenticate,
  [
    check('fullName').not().isEmpty().withMessage('First name is required'),
    check('email').isEmail().withMessage('Invalid email format'),
  ],
  AuthController.updateProfile
);

// Change Password Route
router.put(
  '/changePassword',
  authMiddleware.authenticate,
  [
    check('currentPassword').not().isEmpty().withMessage('Current password is required'),
    check('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 6 characters long'),
  ],
  AuthController.changePassword
);

// Logout Route
router.post('/logout', AuthController.logout);

// Get Session Route
router.get('/session', AuthController.getSession);

router.post('refresh-token', authMiddleware.refreshToken)

module.exports = router;