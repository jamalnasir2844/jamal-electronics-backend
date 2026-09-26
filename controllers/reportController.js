const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Withdrawal = require('../models/Withdrawal');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// GET /api/reports/dashboard
const getDashboard = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    // Today's Sales
    const todaySales = await Sale.aggregate([
      { $match: { saleDate: { $gte: start, $lte: end }, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalProfit: { $sum: { $sum: '$items.profit' } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Today's Purchases
    const todayPurchases = await Purchase.aggregate([
      { $match: { purchaseDate: { $gte: start, $lte: end }, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    // Today's PCO Withdrawals & Charges
    const todayWithdrawals = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: '$withdrawalAmount' },
          totalCharges: { $sum: '$serviceCharge' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Today's Expenses
    const todayExpenses = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const salesData = todaySales[0] || { totalRevenue: 0, totalProfit: 0, count: 0 };
    const purchasesData = todayPurchases[0] || { total: 0, count: 0 };
    const withdrawalsData = todayWithdrawals[0] || { totalWithdrawals: 0, totalCharges: 0, count: 0 };
    const expensesData = todayExpenses[0] || { total: 0, count: 0 };

    const grossProfit = salesData.totalProfit + withdrawalsData.totalCharges;
    const netProfit = grossProfit - expensesData.total;

    // Low stock products
    const lowStockProducts = await Product.find({
      isDeleted: false,
      $expr: { $lte: ['$stock', '$minimumStock'] },
    })
      .select('name sku stock minimumStock imageUrl')
      .limit(10);

    // Stock value
    const stockValue = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$purchasePrice'] } } } },
    ]);

    // Top selling products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topProducts = await Sale.aggregate([
      { $match: { saleDate: { $gte: thirtyDaysAgo }, isDeleted: false } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productNameSnapshot' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
    ]);

    // Chart data — last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [daySales] = await Sale.aggregate([
        { $match: { saleDate: { $gte: dayStart, $lte: dayEnd }, isDeleted: false } },
        { $group: { _id: null, revenue: { $sum: '$grandTotal' }, profit: { $sum: { $sum: '$items.profit' } } } },
      ]);
      const [dayPurchases] = await Purchase.aggregate([
        { $match: { purchaseDate: { $gte: dayStart, $lte: dayEnd }, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]);

      chartData.push({
        date: dayStart.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
        sales: daySales?.revenue || 0,
        purchases: dayPurchases?.total || 0,
        profit: daySales?.profit || 0,
      });
    }

    // Recent transactions
    const recentSales = await Sale.find({ isDeleted: false })
      .populate('customer', 'name')
      .sort({ saleDate: -1 })
      .limit(5)
      .select('invoiceNumber grandTotal saleDate customer paymentMethod');

    res.json({
      success: true,
      data: {
        today: {
          sales: salesData.totalRevenue,
          salesCount: salesData.count,
          purchases: purchasesData.total,
          purchasesCount: purchasesData.count,
          pcoWithdrawals: withdrawalsData.totalWithdrawals,
          pcoCharges: withdrawalsData.totalCharges,
          pcoTransactions: withdrawalsData.count,
          expenses: expensesData.total,
          grossProfit,
          netProfit,
        },
        stockValue: stockValue[0]?.value || 0,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        topProducts,
        chartData,
        recentSales,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/sales
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const sales = await Sale.aggregate([
      { $match: { saleDate: { $gte: start, $lte: end }, isDeleted: false } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
          totalRevenue: { $sum: '$items.total' },
          totalProfit: { $sum: '$items.profit' },
          totalCost: { $sum: { $multiply: ['$items.purchasePriceAtSale', '$items.quantity'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totals = await Sale.aggregate([
      { $match: { saleDate: { $gte: start, $lte: end }, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalProfit: { $sum: { $sum: '$items.profit' } },
          count: { $sum: 1 },
          totalDiscount: { $sum: '$discount' },
        },
      },
    ]);

    res.json({ success: true, data: { sales, totals: totals[0] || {} } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/purchases
const getPurchasesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const purchases = await Purchase.aggregate([
      { $match: { purchaseDate: { $gte: start, $lte: end }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
          total: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totals = await Purchase.aggregate([
      { $match: { purchaseDate: { $gte: start, $lte: end }, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    res.json({ success: true, data: { purchases, totals: totals[0] || {} } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/profit
const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const [salesAgg] = await Sale.aggregate([
      { $match: { saleDate: { $gte: start, $lte: end }, isDeleted: false } },
      { $group: { _id: null, revenue: { $sum: '$grandTotal' }, profit: { $sum: { $sum: '$items.profit' } } } },
    ]);

    const [pcoAgg] = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, isDeleted: false } },
      { $group: { _id: null, charges: { $sum: '$serviceCharge' } } },
    ]);

    const [expensesAgg] = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const salesRevenue = salesAgg?.revenue || 0;
    const grossProfit = (salesAgg?.profit || 0) + (pcoAgg?.charges || 0);
    const expenses = expensesAgg?.total || 0;
    const netProfit = grossProfit - expenses;

    res.json({
      success: true,
      data: {
        salesRevenue,
        pcoCharges: pcoAgg?.charges || 0,
        grossProfit,
        expenses,
        netProfit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/stock
const getStockReport = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate('category', 'name')
      .select('name sku stock minimumStock purchasePrice sellingPrice unit imageUrl');

    const stockValue = products.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minimumStock);
    const outOfStock = products.filter((p) => p.stock === 0);

    res.json({
      success: true,
      data: { products, stockValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/pco
const getPCOReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const withdrawals = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalWithdrawals: { $sum: '$withdrawalAmount' },
          totalCharges: { $sum: '$serviceCharge' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totals = await Withdrawal.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: '$withdrawalAmount' },
          totalCharges: { $sum: '$serviceCharge' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: { withdrawals, totals: totals[0] || {} } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/expenses
const getExpensesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const byCategory = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const [totals] = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({ success: true, data: { byCategory, totals: totals || { total: 0, count: 0 } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getSalesReport,
  getPurchasesReport,
  getProfitReport,
  getStockReport,
  getPCOReport,
  getExpensesReport,
};
