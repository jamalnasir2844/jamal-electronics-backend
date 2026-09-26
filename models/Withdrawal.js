const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerNameSnapshot: { type: String, required: true },
    phoneSnapshot: { type: String, required: true },
    withdrawalAmount: { type: Number, required: true, min: 1 },
    chargeRateSnapshot: { type: Number, required: true },
    chargePerSnapshot: { type: Number, required: true },
    serviceCharge: { type: Number, required: true },
    customerPaid: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Bank', 'Other'], default: 'Cash' },
    transactionReference: { type: String, unique: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
