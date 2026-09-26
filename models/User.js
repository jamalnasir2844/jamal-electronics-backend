const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    shopName: { type: String, default: 'Jamal Electronics' },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
    profileImage: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
