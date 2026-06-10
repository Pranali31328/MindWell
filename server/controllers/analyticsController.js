const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ML_URL = process.env.ML_URL || 'http://localhost:5001';

async function predictBurnoutML(metrics) {
  try {
    const res = await fetch(`${ML_URL}/predict/burnout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });
    if (!res.ok) throw new Error('ML burnout error');
    return await res.json();
  } catch {
    const risk = Math.min(100, Math.round(
      (metrics.avg_stress_score || 30) * 0.55 + (metrics.avg_crisis_risk || 20) * 0.45
    ));
    return {
      burnout_risk: risk,
      burnout_level: risk >= 70 ? 'high' : risk >= 45 ? 'moderate' : 'low',
      burnout_label: 'Estimated risk (ML offline)',
      recommendation: 'Keep tracking your mood and workload.',
      drivers: [],
      model: 'fallback',
      confidence: 0.4,
    };
  }
}

async function getAnalytics(req, res, next) {
  try {
    const userId = req.user.id; // From JWT

    const sessions = await prisma.chatSession.findMany({
      where: { userId, deletedAt: null },
      include: {
        messages: {
          include: { emotionMetrics: true },
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 15,
    });

    let totalMessages = 0, totalMicroWins = 0;
    const moodDistribution = {};
    const wellnessScores = [];
    const crisisScores = [];
    const stressTrend = [];
    const crisisHistory = [];

    sessions.forEach(session => {
      session.messages.forEach(msg => {
        totalMessages++;
        if (msg.isMicroWin) totalMicroWins++;
        if (msg.emotionMetrics) {
          const em = msg.emotionMetrics;
          moodDistribution[em.currentMood] = (moodDistribution[em.currentMood] || 0) + 1;
          wellnessScores.push(em.wellnessScore);
          crisisScores.push(em.crisisScore);
          if (msg.sender === 'user') {
            stressTrend.push({
              date: msg.timestamp,
              stressScore: em.stressScore,
              stressLevel: em.stressLevel,
              wellnessScore: em.wellnessScore,
            });
            crisisHistory.push({
              date: msg.timestamp,
              crisisScore: em.crisisScore,
              mood: em.currentMood,
            });
          }
        }
      });
    });

    const avgWellness = wellnessScores.length
      ? Math.round(wellnessScores.reduce((a, b) => a + b, 0) / wellnessScores.length)
      : 75;
    const avgCrisis = crisisScores.length
      ? Math.round(crisisScores.reduce((a, b) => a + b, 0) / crisisScores.length)
      : 20;

    const [goalCount, moodCheckIns] = await Promise.all([
      prisma.userGoal.count({ where: { userId, completed: true } }),
      prisma.moodCheckIn.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 90,
      }),
    ]);

    // Build day-by-day heatmap merging checkin + chat data
    const dayScores = {};
    const moodIndexToScore = [92, 78, 62, 42, 28];
    const moodIndexToLabel = ['happy', 'calm', 'neutral', 'anxious', 'overwhelmed'];

    moodCheckIns.forEach(c => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      const idx = Math.min(4, Math.max(0, Number(c.moodIndex) || 0));
      dayScores[key] = { score: moodIndexToScore[idx], mood: moodIndexToLabel[idx], source: 'checkin' };
    });

    stressTrend.forEach(pt => {
      const key = new Date(pt.date).toISOString().slice(0, 10);
      const chatScore = Math.round(pt.wellnessScore ?? (100 - (pt.stressScore || 50)));
      if (!dayScores[key] || dayScores[key].source !== 'checkin') {
        dayScores[key] = {
          score: chatScore,
          mood: ['high', 'critical'].includes(pt.stressLevel) ? 'anxious' : 'neutral',
          source: 'chat',
        };
      }
    });

    const moodHeatmap = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = dayScores[key];
      moodHeatmap.push({ date: key, score: entry?.score ?? null, mood: entry?.mood ?? null });
    }

    const avgStress = stressTrend.length
      ? Math.round(stressTrend.reduce((a, b) => a + (b.stressScore || 0), 0) / stressTrend.length)
      : 30;

    const compounds = [];
    const recentTexts = [];
    let overwhelmedCount = 0;
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.sender === 'user') {
          recentTexts.push(msg.text);
          if (msg.emotionMetrics?.currentMood === 'overwhelmed') overwhelmedCount++;
          if (msg.emotionMetrics?.compound != null) compounds.push(msg.emotionMetrics.compound);
        }
      });
    });

    const avgCompound = compounds.length
      ? compounds.reduce((a, b) => a + b, 0) / compounds.length
      : 0;
    const userMsgCount = recentTexts.length;
    const overwhelmedRatio = userMsgCount ? overwhelmedCount / userMsgCount : 0;

    const burnoutML = await predictBurnoutML({
      avg_stress_score: avgStress,
      avg_crisis_risk: avgCrisis,
      avg_wellness_score: avgWellness,
      avg_compound: avgCompound,
      message_count: userMsgCount,
      overwhelmed_ratio: overwhelmedRatio,
      recent_texts: recentTexts.slice(-12),
    });

    res.json({
      totalSessions: sessions.length, totalMessages, totalMicroWins,
      moodDistribution, avgWellness, avgCrisis,
      stressTrend: stressTrend.slice(-20),
      crisisHistory: crisisHistory.slice(-20),
      completedGoals: goalCount,
      moodHeatmap,
      burnoutRisk: burnoutML.burnout_risk,
      burnoutLevel: burnoutML.burnout_level,
      burnoutLabel: burnoutML.burnout_label,
      burnoutRecommendation: burnoutML.recommendation,
      burnoutDrivers: burnoutML.drivers,
      burnoutModel: burnoutML.model,
      burnoutConfidence: burnoutML.confidence,
      // Note: burnout scores are indicative / exploratory — not clinically validated
      disclaimer: 'Results are indicative and exploratory, not diagnostic.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnalytics };
