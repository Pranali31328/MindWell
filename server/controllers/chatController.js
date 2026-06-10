const { PrismaClient } = require('@prisma/client');
const { generateChatResponse } = require('../llm');
const { getUserMemory, updateUserMemory } = require('../memory');

const prisma = new PrismaClient();
const ML_URL = process.env.ML_URL || 'http://localhost:5001';

async function analyzeText(text) {
  try {
    const res = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('ML service error');
    return await res.json();
  } catch {
    return {
      sentiment: 'neutral', compound: 0, crisis_risk: 20, stress_score: 20,
      stress_level: 'low', mood: 'neutral', wellness_score: 75,
      workplace_flags: [], loneliness_flag: false, needs_intervention: false,
    };
  }
}

async function createSession(req, res, next) {
  try {
    const userId = req.user.id; // From JWT — never from body
    const { therapyMethod } = req.body;
    const method = therapyMethod || 'warm';

    const session = await prisma.chatSession.create({
      data: { userId, therapyMethod: method },
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
}

async function getSessions(req, res, next) {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { startTime: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 1,
        },
      },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

async function getSessionHistory(req, res, next) {
  try {
    const { sessionId } = req.params;

    // Ensure the session belongs to the requesting user
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      include: { emotionMetrics: true },
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { sessionId, text, personality, therapyMethod } = req.body;
    const userId = req.user.id;

    // Verify session ownership before processing
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: { name: true, profession: true, personality: true } } },
    });
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // 1. ML analysis
    const mlResult = await analyzeText(text);

    // 2. Save user message
    const userMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'user',
        text,
        emotionMetrics: {
          create: {
            speed: 0, backspaces: 0, pauses: 0, capsBursts: 0,
            currentMood: mlResult.mood,
            crisisScore: Math.round(mlResult.crisis_risk),
            wellnessScore: Math.round(mlResult.wellness_score),
            stressScore: Math.round(mlResult.stress_score),
            stressLevel: mlResult.stress_level,
            sentiment: mlResult.sentiment,
            compound: mlResult.compound,
          },
        },
      },
      include: { emotionMetrics: true },
    });

    // 3. Build context for LLM
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      select: { sender: true, text: true },
      take: 20,
    });

    const userContext = session.user
      ? { name: session.user.name, profession: session.user.profession }
      : {};
    const effectivePersonality = personality || session.user?.personality || 'emotional';

    let userMemory = await getUserMemory(prisma, userId);
    await updateUserMemory(prisma, userId, {
      userText: text,
      mlResult,
      userName: session.user?.name,
    }).catch(err => console.warn('[Memory]', err.message));
    userMemory = await getUserMemory(prisma, userId);

    // 4. Generate LLM response
    const llmResult = await generateChatResponse({
      userText: text,
      personality: effectivePersonality,
      therapyMethod: therapyMethod || session.therapyMethod,
      mlResult,
      contextMessages: history,
      userContext,
      userMemory,
    });

    // 5. Update therapy method if changed
    if (therapyMethod && therapyMethod !== session.therapyMethod) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { therapyMethod },
      }).catch(() => {});
    }

    // 6. Save bot message
    const botMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'bot',
        text: llmResult.text,
        isMicroWin: false,
        winIcon: null,
      },
    });

    const correlationId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (llmResult.usedFallback) {
      console.warn(`[Chat ${correlationId}] Fallback used for session ${sessionId}`);
    }

    res.json({
      userMessage: userMsg,
      botMessage: botMsg,
      analysis: mlResult,
      usedFallback: llmResult.usedFallback,
      aiProvider: llmResult.provider,
      correlationId,
      memory: userMemory,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSession, getSessions, getSessionHistory, sendMessage };
