const express = require('express');
const router = express.Router();
const { getPurchases, getPurchase, createPurchase, deletePurchase } = require('../controllers/purchaseController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', getPurchases);
router.get('/:id', getPurchase);
router.post('/', createPurchase);
router.delete('/:id', deletePurchase);

module.exports = router;
