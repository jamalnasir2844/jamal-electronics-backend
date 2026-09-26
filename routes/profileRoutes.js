const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authMiddleware);
router.get('/', getProfile);
router.put('/', upload.single('profileImage'), updateProfile);

module.exports = router;
