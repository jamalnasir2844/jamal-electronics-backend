const Purchase = require('../models/Purchase');

const generateInvoiceNumber = async (prefix = 'INV') => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Count documents with today's date prefix
  const count = await Purchase.countDocuments({
    invoiceNumber: { $regex: `^${prefix}-${dateStr}` },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${dateStr}-${seq}`;
};

const generateSaleInvoiceNumber = async () => {
  const Sale = require('../models/Sale');
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const count = await Sale.countDocuments({
    invoiceNumber: { $regex: `^SI-${dateStr}` },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `SI-${dateStr}-${seq}`;
};

const generatePurchaseInvoiceNumber = async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const count = await Purchase.countDocuments({
    invoiceNumber: { $regex: `^PI-${dateStr}` },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `PI-${dateStr}-${seq}`;
};

module.exports = { generateSaleInvoiceNumber, generatePurchaseInvoiceNumber };
