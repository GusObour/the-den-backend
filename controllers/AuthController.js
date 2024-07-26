const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const validator = require("validator");
const { User, Barber } = require("../models/User");
const { AvatarGenerator } = require("random-avatar-generator");
const TwilioService = require("../services/TwilioService");
const EmailService = require('../services/EmailService');
const multer = require("multer");
const upload = multer();
const path = require("path");
const fs = require("fs");

class AuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.logout = this.logout.bind(this);
  }

  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { fullName, email, password, admin, phoneNumber, agreeToSms } =
      req.body;
    admin = admin === "true";
    agreeToSms = agreeToSms === "true";
    let headShot = null;

    if (req.file) {
      const uploadDir = path.join(__dirname, "..", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const userFullName = fullName.toLowerCase().replace(/\s/g, "_");
      const newFileName = `${userFullName}_${req.file.originalname.toLowerCase()}`;


      const relativeUploadPath = path.join("uploads", newFileName);
      const absoluteUploadPath = path.join(__dirname, "..", relativeUploadPath);


      fs.writeFileSync(absoluteUploadPath, req.file.buffer);
      headShot = relativeUploadPath;
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
      });
    }

    if (!validator.isMobilePhone(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    if (admin !== undefined && typeof admin !== "boolean") {
      return res.status(400).json({ message: "admin must be a boolean" });
    }

    if (agreeToSms !== undefined && typeof agreeToSms !== "boolean") {
      return res.status(400).json({ message: "agreeToSms must be a boolean" });
    }

    const generator = new AvatarGenerator();
    const avatarUrl = generator.generateRandomAvatar();

    try {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        fullName,
        email,
        password: hashedPassword,
        admin,
        phoneNumber,
        headShot: headShot ? headShot : avatarUrl,
        agreeToSms,
        role: "User",
      });

      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }) || await Barber.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({
        _id: user._id,
        admin: user.admin,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        email: user.email,
        headShot: `${process.env.SERVER_URL}/${user.headShot}`,
      }, process.env.SESSION_SECRET, { expiresIn: "1h" });

      const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

      return res.json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async updateProfile(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, phoneNumber, userId } = req.body;
    let headShot = null;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!validator.isMobilePhone(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    if (req.file) {
      const uploadDir = path.join(__dirname, "..", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const relativeUploadPath = path.join("uploads", req.file.originalname);
      const absoluteUploadPath = path.join(__dirname, "..", relativeUploadPath);

      fs.writeFileSync(absoluteUploadPath, req.file.buffer);
      headShot = relativeUploadPath;
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.fullName = fullName;
      user.email = email;
      user.phoneNumber = phoneNumber;
      if (headShot) user.headShot = headShot;

      await user.save();

      const updatedUser = {
        email: user.email,
        fullName: user.fullName,
        headShot: `${process.env.SERVER_URL}/${user.headShot}`,
        phoneNumber: user.phoneNumber,
      };

      // send SMS notification

      return res.json(updatedUser);
    } catch (err) {
      console.error('Error updating profile:', err);
      return res.status(500).json({ message: "Server error" });
    }
  }


  async changePassword(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (
        !validator.isStrongPassword(newPassword, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      // send SMS notification

      // Invalidate the current session
      res.clearCookie('refreshToken', { httpOnly: true, secure: true });
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log out" });
        }
        return res.json({ message: "Password changed successfully, please log in again" });
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async deleteAccount(req, res) {
    const userId = req.params.userId;

    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // send SMS notification

      return res.json({ message: "Account deleted successfully" });
    } catch (err) {
      console.error('Error deleting account:', err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async requestPasswordReset(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const tokenExpiration = 3600000; // 1 hour
    const rateLimitDuration = 14 * 24 * tokenExpiration; // 14 days
    const currentDateTime = Date.now();
    const genericResponse = 'If your email is valid, you will receive a link to reset your password.';

    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Return generic response without checking user existence
        return res.json({ message: genericResponse });
      }

      if (user.nextResetAllowedAfter > currentDateTime) {
        return res.status(429).json({ message: `Password reset request rate limited. Please try again after ${new Date(user.nextResetAllowedAfter).toLocaleString()}` });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const saltRounds = 10;

      // Hash the token with bcrypt
      const resetTokenHashed = await bcrypt.hash(resetToken, saltRounds);

      user.resetPasswordToken = resetTokenHashed;
      user.resetPasswordTokenExpiration = currentDateTime + tokenExpiration;
      user.nextResetAllowedAfter = currentDateTime + rateLimitDuration;
      await user.save();

      const resetDetails = {
        resetUrl: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&userID=${user._id}`,
      };

      // Send SMS notification and email concurrently
      await Promise.all([
        EmailService.sendRequestPasswordResetEmail(user.email, resetDetails),
        TwilioService.sendSMS(user.phoneNumber, `The Den: Password reset link. ${resetDetails.resetUrl}. This link will expire in 1 hour.`)
      ]);

      return res.json({ message: genericResponse });
    } catch (err) {
      console.error('Error requesting password reset:', err);
      return res.status(500).json({ message: "Server error" });
    }
  }


  async resetPassword(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, userId, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Error while resetting password" });
    }

    if (!validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })) {
      return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character" });
    }

    try {
      const user = await User.findOne({_id: userId});
      if (!user || user.resetPasswordTokenExpiration < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        return res.status(400).json({ message: "New password must be different from the old password" });
      }

      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
      user.resetPasswordToken = null;
      user.resetPasswordTokenExpiration = null;
      await user.save();

      const resetDetails = { resetMessage: "Password reset successfully. Please log in with your new password." };

      await Promise.all([
        EmailService.sendPasswordResetEmail(user.email, resetDetails),
        TwilioService.sendSMS(user.phoneNumber, `The Den: ${resetDetails.resetMessage}`)
      ]);

      return res.json({ success: true, message: "Password reset successfully" });
    } catch (err) {
      console.error('Error resetting password:', err);
      return res.status(500).json({ message: "Server error" });
    }
  }


  async logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  }

  async refreshToken(req, res) {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const newAccessToken = jwt.sign(
        {
          user: {
            _id: user._id,
            admin: user.admin,
            phoneNumber: user.phoneNumber,
            fullName: user.fullName,
            email: user.email,
            headShot: `${process.env.SERVER_URL}/${user.headShot}`,
          },
        },
        process.env.SESSION_SECRET,
        { expiresIn: "1h" }
      );

      return res.json({ token: newAccessToken });
    } catch (err) {
      console.error('Token verification error:', err);
      res.status(401).json({ message: 'Token is not valid' });
    }
  }
}

module.exports = new AuthController();
