const User = require('../models/User');
const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

const getProfile = async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, shopName } = req.body;
    let updateData = {};
    if (name) updateData.name = name.trim();
    if (shopName) updateData.shopName = shopName.trim();

    if (req.file) {
      if (req.user.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(req.user.cloudinaryPublicId).catch(() => {});
      }

      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'jamal-electronics/profiles');
        updateData.profileImage = uploadResult.secure_url;
        updateData.cloudinaryPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.warn('Cloudinary upload warning:', uploadErr.message);
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    res.json({ success: true, message: 'Profile updated successfully.', data: user });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { getProfile, updateProfile };
