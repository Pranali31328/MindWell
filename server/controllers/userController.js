const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getMe(req, res, next) {
  try {
    // req.user is set by authMiddleware — no ID from URL
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profession: user.profession,
      company: user.company,
      personality: user.personality,
      primaryStressors: user.primaryStressors || [],
      goals: user.goals || [],
      onboardingComplete: !!(user.profession && user.primaryStressors),
    });
  } catch (err) {
    next(err);
  }
}

async function updateOnboarding(req, res, next) {
  try {
    const { profession, company, personality, primaryStressors, goals } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profession,
        company,
        personality: personality || 'emotional',
        primaryStressors: primaryStressors || [],
        goals: goals || [],
      },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profession: user.profession,
      company: user.company,
      personality: user.personality,
      primaryStressors: user.primaryStressors || [],
      goals: user.goals || [],
      onboardingComplete: true,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateOnboarding };
