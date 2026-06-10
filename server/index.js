require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Debug: log DATABASE_URL runtime and sqlite path (helps session creation failures)
console.log('[MindWell Server] DATABASE_URL runtime:', process.env.DATABASE_URL);
console.log('[MindWell Server] Database initialized.');
console.log('[Gemini] GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;
const ML_URL = process.env.ML_URL || 'http://localhost:5001';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    llmPrimary: process.env.LLM_PRIMARY || 'groq',
  });
});

// ── Helper: call the Python ML service ────────────────────────────────────────
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
    // Fallback: simple rule-based if ML service is offline
    return {
      sentiment: 'neutral', compound: 0, crisis_risk: 20, stress_score: 20,
      stress_level: 'low', mood: 'neutral', wellness_score: 75,
      workplace_flags: [], loneliness_flag: false, needs_intervention: false,
    };
  }
}

async function analyzeVoiceInput(text, features = {}) {
  try {
    const res = await fetch(`${ML_URL}/analyze/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, features }),
    });
    if (!res.ok) throw new Error('ML voice analyze error');
    return await res.json();
  } catch {
    return analyzeText(text);
  }
}

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
      burnout_label: 'Estimated risk',
      recommendation: 'Keep tracking mood and workload.',
      drivers: [],
      model: 'fallback',
      confidence: 0.4,
    };
  }
}

const { generateChatResponse } = require('./llm');
const { getUserMemory, updateUserMemory, refreshMemoryWithLLM } = require('./memory');
const { gatherExportData, buildHtmlReport } = require('./export');

// ── Helper: generate contextual bot response ──────────────────────────────────
function generateBotResponse(userText, mlResult, personality, therapyMethod = 'warm') {
  const { mood, stress_level, needs_intervention, workplace_flags, loneliness_flag } = mlResult;

  const method = therapyMethod || 'warm';




  // 🚨 Crisis intervention (always highest priority)

  if (needs_intervention) {
    return {
      text: "I'm really concerned about what you just shared. Please know that you are not alone, and help is available. If you're in immediate distress, please reach out to a crisis helpline (iCall: 9152987821). I'm here with you right now — can you tell me more about what's happening?",
      isMicroWin: false,
      winIcon: null,
    };
  }

  // 🧠 Personality-adjusted responses
  const responses = {
    analytical: {
      overwhelmed: "Let's break this down systematically. Take a breath and identify the single most critical item on your plate right now — just one. What is it?",
      anxious: "Anxiety often comes from uncertainty. Let's map out what you know vs. what you don't, so we can create a clear action plan.",
      distressed: "I can see you're under significant pressure. Can we identify the root cause together? Sometimes naming the problem reduces its power.",
      happy: "Great to hear you're doing well! Would you like to set a small goal to keep this momentum going?",
      calm: "You're in a good mental state — a great time to reflect or plan. Is there anything you'd like to work through today?",
      neutral: "I'm here to listen. What's been on your mind most today?",
    },
    emotional: {
      overwhelmed: "It sounds like you're carrying a really heavy load right now. That's completely valid — you don't have to have it all together. What feels most draining?",
      anxious: "It makes sense that you're feeling this way — anxiety is your mind's way of trying to protect you. Would a quick grounding exercise help?",
      distressed: "I hear you, and I want you to know your feelings are real and they matter. You don't have to go through this alone.",
      happy: "That warmth you're feeling? Hold onto it 💛 What's been the highlight of your day?",
      calm: "There's something beautiful about a calm moment. What are you grateful for today?",
      neutral: "How are you really feeling beneath the surface? This is a safe space.",
    },
    creative: {
      overwhelmed: "When everything feels tangled, sometimes a creative reset helps. Try this: if your stress was a color right now, what would it be and why?",
      anxious: "Anxiety can sometimes be redirected into creative energy. What's one thing you've been putting off that you actually enjoy?",
      distressed: "Your feelings are valid. Sometimes writing them out can help — even just a few words about what you're experiencing.",
      happy: "Love that energy! What creative project has been on your mind lately?",
      calm: "A calm mind is fertile ground. What idea or dream have you been gently nurturing?",
      neutral: "What's been stirring in your mind lately — anything you've been curious or excited about?",
    },
    focused: {
      overwhelmed: "Let's triage. List the top 3 things you need to handle. We'll tackle them one at a time — no multitasking.",
      anxious: "Anxiety clouds focus. Let's do a 2-minute reset: close your eyes, take 5 deep breaths, then we'll build your priority list.",
      distressed: "You're in a tough spot, but you've handled hard things before. What's the first small step you can take right now?",
      happy: "Excellent! Momentum is powerful. What goal are you working towards this week?",
      calm: "Solid state of mind. Let's use this well — what's your top priority for today?",
      neutral: "Ready to make progress? What's the one thing, if done today, would make you feel accomplished?",
    },
  };

  const p = personality || 'emotional';
  const moodMap = responses[p] || responses['emotional'];
  let responseText = moodMap[mood] || moodMap['neutral'];

  // Therapy style adjuster (CBT / Mindfulness / Warm)
  // These add a consistent “interaction methodology” on top of the mood response.
  if (method === 'cbt') {
    responseText =
      responseText +
      "\n\n**CBT reframe (quick):**\n1) What is the *thought* your mind is telling you right now?\n2) What evidence supports it? What evidence challenges it?\n3) If a kind, rational version of you read this, what would you say?";
  } else if (method === 'mindfulness') {
    responseText =
      responseText +
      "\n\n**Mindfulness reset (60 seconds):**\nTake one slow breath in… and a longer breath out.\nNotice 3 sensations in your body without trying to change them.\nWhat do you feel most strongly right now—emotion, tension, or temperature?";
  } else {
    // warm
    responseText =
      responseText +
      "\n\n**Warm support:**\nThank you for sharing this. What you’re feeling makes sense, and you don’t have to carry it alone.";
  }


  // Append workplace-specific empathy
  if (workplace_flags.includes('deadline_pressure')) {
    responseText += " Deadlines are one of the biggest sources of professional anxiety — that's completely normal.";
  } else if (workplace_flags.includes('management_conflict')) {
    responseText += " Navigating difficult management relationships is genuinely hard. It's okay to acknowledge that.";
  } else if (workplace_flags.includes('job_insecurity')) {
    responseText += " Job uncertainty is one of the most stressful experiences — your feelings about it are entirely justified.";
  }

  if (loneliness_flag) {
    responseText += " And remember — you reaching out here is a sign of strength, not weakness. I'm always here.";
  }

  // Micro-win detection
  const microWinKeywords = ['finished', 'completed', 'done', 'achieved', 'submitted', 'solved', 'fixed', 'delivered', 'won', 'celebrated', 'proud'];
  const isMicroWin = microWinKeywords.some(kw => userText.toLowerCase().includes(kw)) && mlResult.compound > 0;
  const winIcons = ['🏆', '⭐', '🎯', '💪', '🌟', '✅', '🎉'];
  const winIcon = isMicroWin ? winIcons[Math.floor(Math.random() * winIcons.length)] : null;

  if (isMicroWin) {
    responseText = winIcon + ' **Micro-Win unlocked!** ' + responseText;
  }

  return { text: responseText, isMicroWin, winIcon };
}

// ════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required.' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    res.status(201).json({
      id: user.id, name: user.name, email: user.email,
      personality: user.personality, onboardingComplete: false,
    });
  } catch (err) {
    console.error('[Register Error Details]:', err);
    let errorMessage = 'Registration failed.';
    if (err.code === 'P2002') errorMessage = 'This email is already in use.';
    else if (err.message.includes('Prisma')) errorMessage = 'Database connection error.';
    
    res.status(500).json({ 
      error: errorMessage, 
      details: err.message.substring(0, 100) // Truncate long error messages
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res.status(404).json({ error: 'No account found with this email.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ error: 'Incorrect password.' });

    const onboardingComplete = !!(user.profession && user.primaryStressors);

    res.json({
      id: user.id, name: user.name, email: user.email,
      profession: user.profession, company: user.company,
      personality: user.personality,
      primaryStressors: user.primaryStressors ? JSON.parse(user.primaryStressors) : [],
      goals: user.goals ? JSON.parse(user.goals) : [],
      onboardingComplete,
    });
  } catch (err) {
    console.error('[Login]', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ════════════════════════════════════════════════════════════════
// USER / ONBOARDING ROUTES
// ════════════════════════════════════════════════════════════════

// Complete onboarding (updates existing user record)
app.put('/api/users/:id/onboarding', async (req, res) => {
  try {
    const { id } = req.params;
    const { profession, company, personality, primaryStressors, goals } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        profession,
        company,
        personality: personality || 'emotional',
        primaryStressors: JSON.stringify(primaryStressors || []),
        goals: JSON.stringify(goals || []),
      },
    });

    res.json({
      id: user.id, name: user.name, email: user.email,
      profession: user.profession, company: user.company,
      personality: user.personality,
      primaryStressors: JSON.parse(user.primaryStressors || '[]'),
      goals: JSON.parse(user.goals || '[]'),
      onboardingComplete: true,
    });
  } catch (err) {
    console.error('[Onboarding]', err);
    res.status(500).json({ error: 'Failed to save onboarding data.' });
  }
});

// Get user profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      id: user.id, name: user.name, email: user.email,
      profession: user.profession, company: user.company,
      personality: user.personality,
      primaryStressors: user.primaryStressors ? JSON.parse(user.primaryStressors) : [],
      goals: user.goals ? JSON.parse(user.goals) : [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ════════════════════════════════════════════════════════════════
// CHAT SESSION ROUTES
// ════════════════════════════════════════════════════════════════

// Start a session
app.post('/api/chat/session', async (req, res) => {
  try {
    let { userId, therapyMethod } = req.body;
    const method = therapyMethod || 'warm';

    // Chatbot Session Fix:
    // If the frontend sends a missing/invalid userId (e.g., cleared SQLite DB but local storage session remains),
    // create a fallback user profile and retry session creation.
    const isMissingUserId = userId === undefined || userId === null || userId === '';

    if (isMissingUserId) {
      const fallback = await prisma.user.create({
        data: {
          name: 'Local User',
          email: `local-user-${Date.now()}@mindwell.local`,
          passwordHash: '',
          personality: 'emotional',
          profession: '',
          company: '',
          primaryStressors: '[]',
          goals: '[]',
        },
      });
      userId = fallback.id;
    } else {
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        const fallback = await prisma.user.create({
          data: {
            name: 'Local User',
            email: `local-user-${Date.now()}@mindwell.local`,
            passwordHash: '',
            personality: 'emotional',
            profession: '',
            company: '',
            primaryStressors: '[]',
            goals: '[]',
          },
        });
        userId = fallback.id;
      }
    }

    const session = await prisma.chatSession.create({
      data: { userId, therapyMethod: method },
    });
    res.status(201).json(session);
  } catch (err) {
    console.error('[Chat Session Create Error]', err);
    res.status(500).json({
      error: 'Failed to create session.',
      details: err?.message ? String(err.message) : String(err),
      code: err?.code,
    });
  }
});


// Get all sessions for a user
app.get('/api/chat/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
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
    console.error('[Get Chat Sessions Error]', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});


// ★ SMART CHAT ENDPOINT — analyzes message, generates response, saves both ★
app.post('/api/chat/send', async (req, res) => {
  try {
    const { sessionId, text, personality, therapyMethod } = req.body;

    if (!sessionId || !text)
      return res.status(400).json({ error: 'sessionId and text are required.' });

    // 1. Run ML analysis on user's message
    const mlResult = await analyzeText(text);

    // 2. Save user message to DB
    const userMsg = await prisma.chatMessage.create({
      data: {
        sessionId, sender: 'user', text,
        emotionMetrics: {
          create: {
            speed: 0, backspaces: 0, pauses: 0, capsBursts: 0,
            currentMood: mlResult.mood,
            crisisScore:   Math.round(mlResult.crisis_risk),
            wellnessScore: Math.round(mlResult.wellness_score),
            stressScore:   Math.round(mlResult.stress_score),
            stressLevel:   mlResult.stress_level,
            sentiment:     mlResult.sentiment,
            compound:      mlResult.compound,
          },
        },
      },
      include: { emotionMetrics: true },
    });

    // 3. Generate contextual bot response (Gemini → Groq → smart fallback)
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      select: { sender: true, text: true },
      take: 20,
    });

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: { name: true, profession: true, personality: true } } },
    });
    const userContext = session?.user
      ? { name: session.user.name, profession: session.user.profession }
      : {};
    const effectivePersonality = personality || session?.user?.personality || 'emotional';

    const userId = session?.userId;
    let userMemory = null;
    if (userId) {
      userMemory = await getUserMemory(prisma, userId);
      await updateUserMemory(prisma, userId, {
        userText: text,
        mlResult,
        userName: session?.user?.name,
      }).catch(err => console.warn('[Memory]', err.message));
      userMemory = await getUserMemory(prisma, userId);
    }

    const llmResult = await generateChatResponse({
      userText: text,
      personality: effectivePersonality,
      therapyMethod,
      mlResult,
      contextMessages: history,
      userContext,
      userMemory,
    });

    const usedFallback = llmResult.usedFallback;
    const aiProvider = llmResult.provider;
    const botContent = { text: llmResult.text, isMicroWin: false, winIcon: null };

    if (therapyMethod) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { therapyMethod: therapyMethod || 'warm' },
      }).catch(() => {});
    }

    // 4. Save bot message
    const botMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender: 'bot',
        text: botContent.text,
        isMicroWin: botContent.isMicroWin,
        winIcon: botContent.winIcon,
      },
    });

    const correlationId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (usedFallback) {
      console.warn(`[Chat Send ${correlationId}] Gemini fallback used for session ${sessionId}`);
    }

    res.json({
      userMessage: userMsg,
      botMessage: botMsg,
      analysis: mlResult,
      usedFallback,
      aiProvider,
      correlationId,
      memory: userMemory,
    });
  } catch (err) {
    console.error('[Chat Send]', err);
    res.status(500).json({ error: 'Failed to process message.' });
  }
});

// Get session history
app.get('/api/chat/session/:sessionId', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: req.params.sessionId },
      orderBy: { timestamp: 'asc' },
      include: { emotionMetrics: true },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session history.' });
  }
});

// ════════════════════════════════════════════════════════════════
// ML PROXY — lets frontend call the Python service via Node
// ════════════════════════════════════════════════════════════════

app.post('/api/analyze', async (req, res) => {
  const result = await analyzeText(req.body?.text || '');
  res.json(result);
});

app.post('/api/analyze/voice', async (req, res) => {
  const { text, features } = req.body || {};
  const result = await analyzeVoiceInput(text || '', features || {});
  res.json(result);
});

// ── AI conversation memory ────────────────────────────────────────────────────
app.get('/api/memory/:userId', async (req, res) => {
  try {
    const memory = await getUserMemory(prisma, req.params.userId);
    res.json(memory);
  } catch (err) {
    console.error('[Memory GET]', err);
    res.status(500).json({ error: 'Failed to load memory.' });
  }
});

app.delete('/api/memory/:userId', async (req, res) => {
  try {
    await prisma.userMemory.deleteMany({ where: { userId: req.params.userId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear memory.' });
  }
});

app.post('/api/memory/:userId/refresh', async (req, res) => {
  try {
    const memory = await refreshMemoryWithLLM(prisma, req.params.userId);
    res.json(memory);
  } catch (err) {
    console.error('[Memory refresh]', err);
    res.status(500).json({
      error: err.message?.includes('GEMINI')
        ? 'Gemini API required for AI memory refresh. Set GEMINI_API_KEY in server/.env'
        : 'Failed to refresh memory with AI.',
    });
  }
});

// ── Export reports (JSON + printable HTML/PDF) ─────────────────────────────────
app.get('/api/export/:userId/json', async (req, res) => {
  try {
    const data = await gatherExportData(prisma, req.params.userId, predictBurnoutML);
    if (!data) return res.status(404).json({ error: 'User not found.' });
    res.setHeader('Content-Disposition', `attachment; filename="mindwell-report-${req.params.userId.slice(0, 8)}.json"`);
    res.json(data);
  } catch (err) {
    console.error('[Export JSON]', err);
    res.status(500).json({ error: 'Failed to export JSON.' });
  }
});

app.get('/api/export/:userId/report', async (req, res) => {
  try {
    const data = await gatherExportData(prisma, req.params.userId, predictBurnoutML);
    if (!data) return res.status(404).json({ error: 'User not found.' });
    const html = buildHtmlReport(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[Export report]', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// ════════════════════════════════════════════════════════════════
// ANALYTICS ROUTES
// ════════════════════════════════════════════════════════════════

app.get('/api/analytics/:userId', async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.params.userId },
      include: { messages: { include: { emotionMetrics: true }, orderBy: { timestamp: 'asc' } } },
      orderBy: { startTime: 'desc' },
      take: 15,
    });

    let totalMessages = 0, totalMicroWins = 0;
    let moodDistribution = {};
    let wellnessScores = [];
    let crisisScores = [];
    const stressTrend = [];
    const crisisHistory = [];

    sessions.forEach(session => {
      session.messages.forEach(msg => {
        totalMessages++;
        if (msg.isMicroWin) totalMicroWins++;
        if (msg.emotionMetrics) {
          const em = msg.emotionMetrics;
          const mood = em.currentMood;
          moodDistribution[mood] = (moodDistribution[mood] || 0) + 1;
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

    const goalCount = await prisma.userGoal.count({
      where: { userId: req.params.userId, completed: true },
    });

    const moodCheckIns = await prisma.moodCheckIn.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      take: 90,
    });

    const dayScores = {};
    const moodIndexToScore = [92, 78, 62, 42, 28];
    const moodIndexToLabel = ['happy', 'calm', 'neutral', 'anxious', 'overwhelmed'];

    moodCheckIns.forEach(c => {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      const idx = Math.min(4, Math.max(0, Number(c.moodIndex) || 0));
      dayScores[key] = {
        score: moodIndexToScore[idx],
        mood: moodIndexToLabel[idx],
        source: 'checkin',
      };
    });

    stressTrend.forEach(pt => {
      const key = new Date(pt.date).toISOString().slice(0, 10);
      const chatScore = Math.round(pt.wellnessScore ?? (100 - (pt.stressScore || 50)));
      if (!dayScores[key] || dayScores[key].source !== 'checkin') {
        dayScores[key] = {
          score: chatScore,
          mood: pt.stressLevel === 'high' || pt.stressLevel === 'critical' ? 'anxious' : 'neutral',
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
      moodHeatmap.push({
        date: key,
        score: entry?.score ?? null,
        mood: entry?.mood ?? null,
      });
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
    const overwhelmedRatio = userMsgCount
      ? overwhelmedCount / userMsgCount
      : 0;

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
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// ════════════════════════════════════════════════════════════════
// JOURNAL ROUTES
// ════════════════════════════════════════════════════════════════

app.get('/api/journal/:userId', async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(entries.map(e => ({
      ...e,
      tags: e.tags ? JSON.parse(e.tags) : [],
      analysis: e.analysis ? JSON.parse(e.analysis) : null,
    })));
  } catch (err) {
    console.error('[Journal list]', err);
    res.status(500).json({ error: 'Failed to fetch journal entries.' });
  }
});

app.post('/api/journal/:userId', async (req, res) => {
  try {
    const { text, mood, tags, analysis, copingTip } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Journal text is required.' });

    const entry = await prisma.journalEntry.create({
      data: {
        userId: req.params.userId,
        text: text.trim(),
        mood: mood || null,
        tags: JSON.stringify(tags || []),
        analysis: analysis ? JSON.stringify(analysis) : null,
        copingTip: copingTip || null,
      },
    });
    res.status(201).json({
      ...entry,
      tags: tags || [],
      analysis: analysis || null,
    });
  } catch (err) {
    console.error('[Journal create]', err);
    res.status(500).json({ error: 'Failed to save journal entry.' });
  }
});

// ════════════════════════════════════════════════════════════════
// WELLNESS — GOALS, MOOD, STREAK
// ════════════════════════════════════════════════════════════════

app.get('/api/wellness/goals/:userId', async (req, res) => {
  try {
    const goals = await prisma.userGoal.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch goals.' });
  }
});

app.post('/api/wellness/goals/:userId', async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Goal title is required.' });
    const goal = await prisma.userGoal.create({
      data: {
        userId: req.params.userId,
        title: title.trim(),
        category: category || 'wellness',
      },
    });
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create goal.' });
  }
});

app.patch('/api/wellness/goals/:goalId/toggle', async (req, res) => {
  try {
    const existing = await prisma.userGoal.findUnique({ where: { id: req.params.goalId } });
    if (!existing) return res.status(404).json({ error: 'Goal not found.' });
    const goal = await prisma.userGoal.update({
      where: { id: req.params.goalId },
      data: {
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      },
    });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal.' });
  }
});

app.post('/api/wellness/mood/:userId', async (req, res) => {
  try {
    const { moodIndex, moodLabel } = req.body;
    const checkIn = await prisma.moodCheckIn.create({
      data: {
        userId: req.params.userId,
        moodIndex: Number(moodIndex) || 0,
        moodLabel: moodLabel || null,
      },
    });
    res.status(201).json(checkIn);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save mood check-in.' });
  }
});

app.get('/api/wellness/streak/:userId', async (req, res) => {
  try {
    const checkIns = await prisma.moodCheckIn.findMany({
      where: { userId: req.params.userId },
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
    res.status(500).json({ error: 'Failed to compute streak.' });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[MindWell Server] Running on http://localhost:${PORT}`);
  console.log(`[MindWell Server] ML Engine expected at ${ML_URL}`);
});
