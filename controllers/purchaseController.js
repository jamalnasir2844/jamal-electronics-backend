const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { generatePurchaseInvoiceNumber } = require('../utils/generateInvoiceNumber');

const getPurchases = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, startDate, endDate } = req.query;
    const filter = { isDeleted: false };

    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Purchase.countDocuments(filter);
    const purchases = await Purchase.find(filter)
      .populate('supplier', 'name phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: purchases,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error('getPurchases error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier', 'name phone address')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name');
    if (!purchase || purchase.isDeleted)
      return res.status(404).json({ success: false, message: 'Purchase not found.' });
    res.json({ success: true, data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createPurchase = async (req, res) => {
  try {
    const { supplierId, items, discount = 0, paidAmount = 0, paymentMethod = 'Cash', purchaseDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product item is required.' });
    }

    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.isDeleted) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }

      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const price = Number(item.purchasePrice) >= 0 ? Number(item.purchasePrice) : product.purchasePrice;
      const itemTotal = qty * price;
      subtotal += itemTotal;

      processedItems.push({
        product: product._id,
        productNameSnapshot: product.name,
        quantity: qty,
        purchasePrice: price,
        total: itemTotal,
      });

      // Increase stock & optionally update product cost price
      const updateOps = { $inc: { stock: qty } };
      if (price > 0) {
        updateOps.$set = { purchasePrice: price };
      }
      await Product.findByIdAndUpdate(product._id, updateOps);
    }

    const numDiscount = Math.max(0, Number(discount) || 0);
    const grandTotal = Math.max(0, subtotal - numDiscount);
    const numPaid = Math.max(0, Number(paidAmount) || 0);
    const remainingAmount = Math.max(0, grandTotal - numPaid);

    const invoiceNumber = await generatePurchaseInvoiceNumber();

    const purchase = await Purchase.create({
      supplier: supplierId || null,
      items: processedItems,
      subtotal,
      discount: numDiscount,
      grandTotal,
      paidAmount: numPaid,
      remainingAmount,
      paymentMethod: paymentMethod || 'Cash',
      invoiceNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      createdBy: req.user?._id || null,
    });

    // Update supplier totals
    if (supplierId) {
      await Supplier.findByIdAndUpdate(supplierId, {
        $inc: {
          totalPurchases: grandTotal,
          totalPaid: numPaid,
          remainingBalance: remainingAmount,
        },
      });
    }

    const populated = await Purchase.findById(purchase._id)
      .populate('supplier', 'name phone')
      .populate('items.product', 'name sku');

    res.status(201).json({ success: true, message: 'Purchase created successfully.', data: populated });
  } catch (error) {
    console.error('createPurchase error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase || purchase.isDeleted) {
      return res.status(404).json({ success: false, message: 'Purchase not found.' });
    }

    // Reverse stock
    for (const item of purchase.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Reverse supplier totals
    if (purchase.supplier) {
      await Supplier.findByIdAndUpdate(purchase.supplier, {
        $inc: {
          totalPurchases: -purchase.grandTotal,
          totalPaid: -purchase.paidAmount,
          remainingBalance: -purchase.remainingAmount,
        },
      });
    }

    await Purchase.findByIdAndUpdate(req.params.id, { isDeleted: true });

    res.json({ success: true, message: 'Purchase deleted and stock reversed.' });
  } catch (error) {
    console.error('deletePurchase error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPurchases, getPurchase, createPurchase, deletePurchase };
