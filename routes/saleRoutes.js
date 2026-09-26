const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, deleteSale } = require('../controllers/saleController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', getSales);
router.get('/:id', getSale);
router.post('/', createSale);
router.delete('/:id', deleteSale);

module.exports = router;
