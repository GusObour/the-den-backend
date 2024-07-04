const jwt = require('jsonwebtoken');
const { User, Barber } = require('../models/User');

const authMiddleware = {
  authenticate: async (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET);
      req.user = await User.findById(decoded._id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      console.error('Token verification error:', err);
      res.status(401).json({ message: 'Token is not valid' });
    }
  },

  refreshToken: async (req, res) => {
    const authHeader = req.header('Authorization');
    const refreshToken = authHeader && authHeader.split(' ')[1];

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const newToken = jwt.sign({
        _id: user._id,
        admin: user.admin,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        email: user.email,
        headShot: `${process.env.SERVER_URL}/${user.headShot}`,
      }, process.env.SESSION_SECRET, { expiresIn: "1h" });

      return res.json({ token: newToken });
    } catch (err) {
      console.error('Refresh token error:', err);
      return res.status(401).json({ message: 'Refresh token is not valid' });
    }
  }
};

module.exports = authMiddleware;
