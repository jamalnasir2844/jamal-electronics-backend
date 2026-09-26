const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productNameSnapshot: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  sellingPrice: { type: Number, required: true, min: 0 },
  purchasePriceAtSale: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true },
  profit: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Bank', 'Other'], default: 'Cash' },
    invoiceNumber: { type: String, unique: true },
    saleDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
