const mongoose = require('mongoose');

const shopSettingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'Jamal Electronics' },
    chargeRate: { type: Number, default: 20 },
    chargePer: { type: Number, default: 1000 },
    currency: { type: String, default: 'PKR' },
    currencySymbol: { type: String, default: 'Rs.' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopSettings', shopSettingsSchema);
