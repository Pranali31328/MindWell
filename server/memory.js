/**
 * Long-term conversation memory per user (rule-based + optional Gemini summary).
 */

const { generateMemorySummary } = require('./gemini');

const TOPIC_RULES = [
  { id: 'burnout', label: 'Burnout & fatigue', re: /\b(burnout|burnt out|exhaust|drained|no energy)\b/i },
  { id: 'deadlines', label: 'Deadlines & pressure', re: /\b(deadline|overdue|pressure|rush|crunch)\b/i },
  { id: 'management', label: 'Management stress', re: /\b(boss|manager|micromanage|conflict)\b/i },
  { id: 'anxiety', label: 'Anxiety', re: /\b(anxi|worried|panic|nervous)\b/i },
  { id: 'loneliness', label: 'Loneliness', re: /\b(lonely|isolated|alone|no one)\b/i },
  { id: 'sleep', label: 'Sleep issues', re: /\b(sleep|insomnia|tired|night)\b/i },
  { id: 'wins', label: 'Wins & progress', re: /\b(proud|achieved|finished|accomplished|progress)\b/i },
];

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str || '');
  } catch {
    return fallback;
  }
}

function extractTopics(text) {
  const found = [];
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(text)) found.push(rule.label);
  }
  return found;
}

function extractFact(userText, mlResult) {
  const t = userText.trim();
  if (t.length < 12) return null;
  const snippet = t.length > 120 ? `${t.slice(0, 117)}…` : t;
  const mood = mlResult?.mood || 'neutral';
  return { text: snippet, mood, at: new Date().toISOString() };
}

function mergeTopics(existing, incoming) {
  const set = new Set(existing);
  incoming.forEach(t => set.add(t));
  return [...set].slice(0, 8);
}

function mergeFacts(existing, fact) {
  if (!fact) return existing;
  const next = [fact, ...existing.filter(f => f.text !== fact.text)];
  return next.slice(0, 6);
}

function buildSummary({ name, topics, facts, mlResult }) {
  const parts = [];
  if (name) parts.push(`${name} has been checking in with MindWell.`);
  if (topics.length) parts.push(`Recurring themes: ${topics.slice(0, 4).join(', ')}.`);
  if (facts.length) parts.push(`Recent focus: "${facts[0].text}"`);
  if (mlResult?.mood) parts.push(`Latest emotional tone: ${mlResult.mood}.`);
  return parts.join(' ').slice(0, 480);
}

async function getUserMemory(prisma, userId) {
  let mem = await prisma.userMemory.findUnique({ where: { userId } });
  if (!mem) {
    mem = await prisma.userMemory.create({
      data: { userId, summary: '', topics: '[]', keyFacts: '[]' },
    });
  }
  return {
    summary: mem.summary,
    topics: safeJsonParse(mem.topics, []),
    keyFacts: safeJsonParse(mem.keyFacts, []),
    updatedAt: mem.updatedAt,
  };
}

async function updateUserMemory(prisma, userId, { userText, mlResult, userName }) {
  const mem = await prisma.userMemory.findUnique({ where: { userId } });
  const topics = safeJsonParse(mem?.topics, []);
  const keyFacts = safeJsonParse(mem?.keyFacts, []);

  const newTopics = extractTopics(userText);
  const mergedTopics = mergeTopics(topics, newTopics);
  const mergedFacts = mergeFacts(keyFacts, extractFact(userText, mlResult));
  const summary = buildSummary({
    name: userName,
    topics: mergedTopics,
    facts: mergedFacts,
    mlResult,
  });

  const data = {
    summary,
    topics: JSON.stringify(mergedTopics),
    keyFacts: JSON.stringify(mergedFacts),
  };

  if (mem) {
    await prisma.userMemory.update({ where: { userId }, data });
  } else {
    await prisma.userMemory.create({ data: { userId, ...data } });
  }

  return { summary, topics: mergedTopics, keyFacts: mergedFacts };
}

const { formatMemoryForPrompt } = require('./memoryFormat');

async function refreshMemoryWithLLM(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) throw new Error('User not found');

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    select: { id: true },
    take: 15,
  });
  const sessionIds = sessions.map(s => s.id);

  const messages = sessionIds.length
    ? await prisma.chatMessage.findMany({
        where: { sessionId: { in: sessionIds }, sender: 'user' },
        orderBy: { timestamp: 'desc' },
        take: 30,
        select: { text: true },
      })
    : [];

  const current = await getUserMemory(prisma, userId);
  const userMessages = messages.map(m => m.text).reverse();

  let llmResult;
  try {
    llmResult = await generateMemorySummary({
      userName: user.name,
      userMessages,
      existingTopics: current.topics,
      existingFacts: current.keyFacts,
    });
  } catch (err) {
    console.warn('[Memory LLM]', err.message?.slice(0, 120));
    return { ...current, llmEnhanced: false };
  }

  const mergedTopics = mergeTopics(current.topics, llmResult.topics || []);
  const data = {
    summary: llmResult.summary || current.summary,
    topics: JSON.stringify(mergedTopics),
    keyFacts: JSON.stringify(current.keyFacts),
  };

  await prisma.userMemory.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return {
    summary: data.summary,
    topics: mergedTopics,
    keyFacts: current.keyFacts,
    llmEnhanced: true,
    source: llmResult.source,
  };
}

module.exports = {
  getUserMemory,
  updateUserMemory,
  formatMemoryForPrompt,
  refreshMemoryWithLLM,
};
