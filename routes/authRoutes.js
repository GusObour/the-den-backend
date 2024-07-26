const express = require('express');
const { check } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer();

const router = express.Router();

// Registration Route
router.post(
  '/register', upload.single('headShot'),
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

router.post('/refresh-token', authMiddleware.refreshToken);

router.put(
  "/update-profile/:userId",
  authMiddleware.authenticate,
  upload.single("headShot"),
  [
    check("fullName").not().isEmpty().withMessage("Full name is required"),
    check("email").isEmail().withMessage("Valid email is required"),
    check("phoneNumber").not().isEmpty().withMessage("Phone number is required")
  ],
  AuthController.updateProfile
);

router.post("/request-password-reset", [
  check("email").isEmail().withMessage("Valid email is required")
], AuthController.requestPasswordReset);

router.post("/reset-password", [
  check("token").not().isEmpty().withMessage("Reset token is required"),
  check("userId").not().isEmpty().withMessage("User ID is required"),
  check("password").isLength({ min: 8 }).withMessage("New password must be at least 8 characters long")
], AuthController.resetPassword);

router.put(
  "/change-password/:userId",
  authMiddleware.authenticate,
  [
    check("currentPassword").not().isEmpty().withMessage("Current password is required"),
    check("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters long")
  ],
  AuthController.changePassword
);

router.delete(
  "/delete-profile/:userId",
  authMiddleware.authenticate,
  AuthController.deleteAccount
);


module.exports = router;