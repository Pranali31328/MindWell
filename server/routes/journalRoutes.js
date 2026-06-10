const express = require('express');
const router = express.Router();
const { getJournal, createJournalEntry } = require('../controllers/journalController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, journalSchema } = require('../middleware/validateMiddleware');

router.get('/', authMiddleware, getJournal);
router.post('/', authMiddleware, validate(journalSchema), createJournalEntry);

module.exports = router;
