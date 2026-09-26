const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { generateSaleInvoiceNumber } = require('../utils/generateInvoiceNumber');

const getSales = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, startDate, endDate } = req.query;
    const filter = { isDeleted: false };

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Sale.countDocuments(filter);
    const sales = await Sale.find(filter)
      .populate('customer', 'name phone')
      .populate('createdBy', 'name')
      .sort({ saleDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: sales,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name phone address')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name');
    if (!sale || sale.isDeleted)
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { customerId, items, discount = 0, paidAmount = 0, paymentMethod = 'Cash', saleDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'At least one item is required.' });
    }

    let subtotal = 0;
    let totalProfit = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product || product.isDeleted) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }

      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;

      if (product.stock < qty) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`,
        });
      }

      const sellingPrice = Number(item.sellingPrice) > 0 ? Number(item.sellingPrice) : product.sellingPrice;
      const purchasePriceAtSale = product.purchasePrice;
      const itemTotal = sellingPrice * qty;
      const itemProfit = (sellingPrice - purchasePriceAtSale) * qty;

      subtotal += itemTotal;
      totalProfit += itemProfit;

      processedItems.push({
        product: product._id,
        productNameSnapshot: product.name,
        quantity: qty,
        sellingPrice,
        purchasePriceAtSale,
        total: itemTotal,
        profit: itemProfit,
      });

      // Decrease stock
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -qty } },
        { session }
      );
    }

    const numDiscount = Math.max(0, Number(discount) || 0);
    const grandTotal = Math.max(0, subtotal - numDiscount);
    const numPaid = Math.max(0, Number(paidAmount) || 0);
    const remainingAmount = Math.max(0, grandTotal - numPaid);

    const invoiceNumber = await generateSaleInvoiceNumber();

    const [sale] = await Sale.create(
      [
        {
          customer: customerId || null,
          items: processedItems,
          subtotal,
          discount: numDiscount,
          grandTotal,
          paidAmount: numPaid,
          remainingAmount,
          paymentMethod: paymentMethod || 'Cash',
          invoiceNumber,
          saleDate: saleDate || new Date(),
          createdBy: req.user?._id || null,
        },
      ],
      { session }
    );

    // Update customer totals
    if (customerId) {
      await Customer.findByIdAndUpdate(
        customerId,
        {
          $inc: {
            totalPurchases: grandTotal,
            totalPaid: numPaid,
            remainingBalance: remainingAmount,
          },
        },
        { session }
      );
    }

    await session.commitTransaction();

    const populated = await Sale.findById(sale._id)
      .populate('customer', 'name phone')
      .populate('items.product', 'name sku');

    res.status(201).json({ success: true, message: 'Sale created.', data: populated });
  } catch (error) {
    await session.abortTransaction();
    console.error('createSale error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

const deleteSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale || sale.isDeleted) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    // Reverse stock
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    // Reverse customer totals
    if (sale.customer) {
      await Customer.findByIdAndUpdate(
        sale.customer,
        {
          $inc: {
            totalPurchases: -sale.grandTotal,
            totalPaid: -sale.paidAmount,
            remainingBalance: -sale.remainingAmount,
          },
        },
        { session }
      );
    }

    await Sale.findByIdAndUpdate(req.params.id, { isDeleted: true }, { session });
    await session.commitTransaction();

    res.json({ success: true, message: 'Sale deleted and stock restored.' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = { getSales, getSale, createSale, deleteSale };
