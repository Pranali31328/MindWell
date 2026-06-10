const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getGoals(req, res, next) {
  try {
    const goals = await prisma.userGoal.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (err) {
    next(err);
  }
}

async function createGoal(req, res, next) {
  try {
    const { title, category } = req.body;
    const goal = await prisma.userGoal.create({
      data: {
        userId: req.user.id,
        title: title.trim(),
        category: category || 'wellness',
      },
    });
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
}

async function toggleGoal(req, res, next) {
  try {
    const existing = await prisma.userGoal.findUnique({
      where: { id: req.params.goalId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found.' });
    }
    // Ensure the goal belongs to the requesting user
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const goal = await prisma.userGoal.update({
      where: { id: req.params.goalId },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      },
    });
    res.json(goal);
  } catch (err) {
    next(err);
  }
}

async function checkInMood(req, res, next) {
  try {
    const { moodIndex, moodLabel } = req.body;
    const checkIn = await prisma.moodCheckIn.create({
      data: {
        userId: req.user.id,
        moodIndex: Number(moodIndex) || 0,
        moodLabel: moodLabel || null,
      },
    });
    res.status(201).json(checkIn);
  } catch (err) {
    next(err);
  }
}

async function getStreak(req, res, next) {
  try {
    const checkIns = await prisma.moodCheckIn.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
    const days = new Set(
      checkIns.map(c => new Date(c.createdAt).toISOString().slice(0, 10))
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) streak++;
      else if (i > 0) break;
    }
    res.json({ streak, totalCheckIns: checkIns.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGoals, createGoal, toggleGoal, checkInMood, getStreak };
