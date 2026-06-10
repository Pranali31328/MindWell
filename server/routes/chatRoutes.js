const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionHistory,
  sendMessage,
} = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, chatSessionSchema, chatSendSchema } = require('../middleware/validateMiddleware');

// All chat routes require authentication
router.post('/session', authMiddleware, validate(chatSessionSchema), createSession);
router.get('/sessions', authMiddleware, getSessions);
router.get('/session/:sessionId', authMiddleware, getSessionHistory);
router.post('/send', authMiddleware, validate(chatSendSchema), sendMessage);

module.exports = router;
