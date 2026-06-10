require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorMiddleware } = require('./middleware/errorMiddleware');
const { authMiddleware } = require('./middleware/authMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const journalRoutes = require('./routes/journalRoutes');
const wellnessRoutes = require('./routes/wellnessRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// ML proxy + memory + export helpers
const { PrismaClient } = require('@prisma/client');
const { getUserMemory, refreshMemoryWithLLM } = require('./memory');
const { gatherExportData, buildHtmlReport } = require('./export');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting — global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));

// Stricter rate limit on AI chat endpoint
const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Chat rate limit exceeded. Please slow down.' },
});

// Stricter rate limit on auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
});

// ── Logging & Parsing ──────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    llmPrimary: process.env.LLM_PRIMARY || 'groq',
  });
});

// ── API v1 Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRateLimit, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/chat', chatRateLimit, chatRoutes);
app.use('/api/v1/journal', journalRoutes);
app.use('/api/v1/wellness', wellnessRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// ── ML Proxy ───────────────────────────────────────────────────────────────────
const ML_URL = process.env.ML_URL || 'http://localhost:5001';

app.post('/api/v1/analyze', authMiddleware, async (req, res, next) => {
  try {
    const mlRes = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: req.body?.text || '' }),
    });
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── Memory Routes ──────────────────────────────────────────────────────────────
app.get('/api/v1/memory', authMiddleware, async (req, res, next) => {
  try {
    const memory = await getUserMemory(prisma, req.user.id);
    res.json(memory);
  } catch (err) { next(err); }
});

app.delete('/api/v1/memory', authMiddleware, async (req, res, next) => {
  try {
    await prisma.userMemory.deleteMany({ where: { userId: req.user.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.post('/api/v1/memory/refresh', authMiddleware, async (req, res, next) => {
  try {
    const memory = await refreshMemoryWithLLM(prisma, req.user.id);
    res.json(memory);
  } catch (err) {
    next(Object.assign(err, {
      message: err.message?.includes('GEMINI')
        ? 'Gemini API required for AI memory refresh. Set GEMINI_API_KEY in server/.env'
        : 'Failed to refresh memory with AI.',
    }));
  }
});

// ── Export Routes ──────────────────────────────────────────────────────────────
app.get('/api/v1/export/json', authMiddleware, async (req, res, next) => {
  try {
    const data = await gatherExportData(prisma, req.user.id, async (m) => m);
    if (!data) return res.status(404).json({ error: 'User not found.' });
    res.setHeader('Content-Disposition', `attachment; filename="mindwell-report-${req.user.id.slice(0, 8)}.json"`);
    res.json(data);
  } catch (err) { next(err); }
});

app.get('/api/v1/export/report', authMiddleware, async (req, res, next) => {
  try {
    const data = await gatherExportData(prisma, req.user.id, async (m) => m);
    if (!data) return res.status(404).json({ error: 'User not found.' });
    const html = buildHtmlReport(data);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) { next(err); }
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler (must be last) ────────────────────────────────────────
app.use(errorMiddleware);

// ── Start Server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[MindWell] Server running on http://localhost:${PORT}`);
  console.log(`[MindWell] DB: ${process.env.DATABASE_URL?.includes('supabase') ? 'Supabase PostgreSQL ✓' : 'LOCAL'}`);
  console.log(`[MindWell] Gemini: ${process.env.GEMINI_API_KEY ? '✓' : '✗'} | Groq: ${process.env.GROQ_API_KEY ? '✓' : '✗'} | LLM: ${process.env.LLM_PRIMARY}`);
});
