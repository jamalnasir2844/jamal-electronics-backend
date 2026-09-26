const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, unique: true, sparse: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, default: '' },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minimumStock: { type: Number, default: 5, min: 0 },
    unit: { type: String, default: 'pcs' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    imageUrl: { type: String, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minimumStock) return 'low_stock';
  return 'in_stock';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
