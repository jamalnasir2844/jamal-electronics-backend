const express = require('express');
const router = express.Router();
const { getDeposits, getDeposit, createDeposit, deleteDeposit } = require('../controllers/depositController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', getDeposits);
router.get('/:id', getDeposit);
router.post('/', createDeposit);
router.delete('/:id', deleteDeposit);

module.exports = router;
