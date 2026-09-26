const admin = require('firebase-admin');
const User = require('../models/User');

// POST /api/auth/sync-user — Called after Firebase registration/login
const syncUser = async (req, res) => {
  try {
    const { name, email, shopName } = req.body;
    const firebaseUid = req.firebaseUser.uid;
    const firebaseEmail = req.firebaseUser.email;

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      user = await User.create({
        firebaseUid,
        name: name || firebaseEmail.split('@')[0],
        email: email || firebaseEmail,
        shopName: shopName || 'Jamal Electronics',
        role: 'admin',
      });
    }

    res.status(200).json({ success: true, message: 'User synced.', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { syncUser, getMe };
