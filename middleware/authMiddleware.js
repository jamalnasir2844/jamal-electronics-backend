const admin = require('firebase-admin');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
    }

    const token = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (firebaseError) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token.' });
    }

    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      if (decodedToken.email) {
        user = await User.findOne({ email: decodedToken.email });
      }
      if (user) {
        user.firebaseUid = decodedToken.uid;
        await user.save();
      } else {
        const name = decodedToken.name || decodedToken.email?.split('@')[0] || 'Admin User';
        const email = decodedToken.email || `${decodedToken.uid}@jamalelectronics.com`;
        user = await User.create({
          firebaseUid: decodedToken.uid,
          name,
          email,
          shopName: 'Jamal Electronics',
          role: 'admin',
        });
      }
    }

    req.user = user;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error in auth middleware.' });
  }
};

module.exports = authMiddleware;
