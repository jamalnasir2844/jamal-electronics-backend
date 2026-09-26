const express = require('express');
const router = express.Router();
const { syncUser, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/sync-user', authMiddleware, syncUser);
router.get('/me', authMiddleware, getMe);

module.exports = router;
