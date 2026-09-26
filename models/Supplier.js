const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
