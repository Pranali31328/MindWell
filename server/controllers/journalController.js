const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getJournal(req, res, next) {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    // Tags and analysis are now native JSON in PostgreSQL — no JSON.parse needed
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

async function createJournalEntry(req, res, next) {
  try {
    const { text, mood, tags, analysis, copingTip } = req.body;

    const entry = await prisma.journalEntry.create({
      data: {
        userId: req.user.id,
        text: text.trim(),
        mood: mood || null,
        tags: tags || [],
        analysis: analysis || null,
        copingTip: copingTip || null,
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

module.exports = { getJournal, createJournalEntry };
