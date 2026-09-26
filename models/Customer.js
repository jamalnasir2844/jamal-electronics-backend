const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    // Electronics sales totals
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    // PCO totals
    totalWithdrawals: { type: Number, default: 0 },
    totalCharges: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
