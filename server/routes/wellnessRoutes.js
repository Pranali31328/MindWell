const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  toggleGoal,
  checkInMood,
  getStreak,
} = require('../controllers/wellnessController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, goalSchema, moodCheckInSchema } = require('../middleware/validateMiddleware');

router.get('/goals', authMiddleware, getGoals);
router.post('/goals', authMiddleware, validate(goalSchema), createGoal);
router.patch('/goals/:goalId/toggle', authMiddleware, toggleGoal);
router.post('/mood', authMiddleware, validate(moodCheckInSchema), checkInMood);
router.get('/streak', authMiddleware, getStreak);

module.exports = router;
