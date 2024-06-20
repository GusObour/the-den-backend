const jwt = require('jsonwebtoken');
const {User, Barber} = require('../models/User');

const authMiddleware = {
  authenticate: async (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.SESSION_SECRET);
      } catch (err) {
        decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
      }
      
      req.user = await User.findById(decoded._id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      next();
    } catch (err) {
      console.error('Token verification error:', err);
      res.status(401).json({ message: 'Token is not valid' });
    }
  }
};

module.exports = authMiddleware;
