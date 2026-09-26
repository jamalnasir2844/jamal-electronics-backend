const ShopSettings = require('../models/ShopSettings');

const getSettings = async (req, res) => {
  try {
    let settings = await ShopSettings.findOne();
    if (!settings) {
      settings = await ShopSettings.create({ shopName: 'Jamal Electronics' });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await ShopSettings.findOne();
    if (!settings) {
      settings = await ShopSettings.create(req.body);
    } else {
      settings = await ShopSettings.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });
    }
    res.json({ success: true, message: 'Settings updated.', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSettings, updateSettings };
