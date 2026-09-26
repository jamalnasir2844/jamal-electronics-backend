const express = require('express');
const router = express.Router();
const { getWithdrawals, getWithdrawal, createWithdrawal, deleteWithdrawal } = require('../controllers/withdrawalController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', getWithdrawals);
router.get('/:id', getWithdrawal);
router.post('/', createWithdrawal);
router.delete('/:id', deleteWithdrawal);

module.exports = router;
