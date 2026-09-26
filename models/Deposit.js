const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerNameSnapshot: { type: String, required: true },
    phoneSnapshot: { type: String, required: true },
    depositAmount: { type: Number, required: true, min: 1 },
    chargeRateSnapshot: { type: Number, required: true },
    chargePerSnapshot: { type: Number, required: true },
    serviceCharge: { type: Number, required: true },
    customerReceived: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Bank', 'Other'], default: 'Cash' },
    transactionReference: { type: String, unique: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deposit', depositSchema);
