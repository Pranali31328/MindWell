const express = require('express');
const router = express.Router();
const { getMe, updateOnboarding } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, onboardingSchema } = require('../middleware/validateMiddleware');

// All user routes require authentication
router.get('/me', authMiddleware, getMe);
router.put('/onboarding', authMiddleware, validate(onboardingSchema), updateOnboarding);

module.exports = router;
