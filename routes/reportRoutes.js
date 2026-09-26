const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getSalesReport,
  getPurchasesReport,
  getProfitReport,
  getStockReport,
  getPCOReport,
  getExpensesReport,
} = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/dashboard', getDashboard);
router.get('/sales', getSalesReport);
router.get('/purchases', getPurchasesReport);
router.get('/profit', getProfitReport);
router.get('/stock', getStockReport);
router.get('/pco', getPCOReport);
router.get('/expenses', getExpensesReport);

module.exports = router;
