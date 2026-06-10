/**
 * Unified chat LLM: Gemini (multi-turn) → optional Groq → smart conversational fallback.
 */
const { generateGeminiResponse } = require('./gemini');
const { generateSmartResponse } = require('./smartChat');
const { formatMemoryForPrompt } = require('./memoryFormat');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function generateGroqResponse({ userText, personality, therapyMethod, mlResult, contextMessages, userContext, userMemory }) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const system = buildSystemPrompt({ personality, therapyMethod, mlResult, userContext, userMemory });
  const messages = [{ role: 'system', content: system }];

  for (const m of (contextMessages || []).slice(-14)) {
    if (m.sender === 'user') messages.push({ role: 'user', content: m.text });
    else if (m.sender === 'bot') messages.push({ role: 'assistant', content: m.text });
  }
  messages.push({ role: 'user', content: userText });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.75,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Groq API error (${res.status}): ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned empty response');
  return { text, provider: 'groq' };
}

function buildSystemPrompt({ personality, therapyMethod, mlResult, userContext, userMemory }) {
  const method = (therapyMethod || 'warm').toLowerCase();
  const therapyGuides = {
    cbt: 'Use Cognitive Behavioral Therapy: identify thoughts, examine evidence, offer gentle reframes. Be structured but warm.',
    mindfulness: 'Use mindfulness coaching: body awareness, breath, present-moment grounding. Calm, paced language.',
    warm: 'Use warm, validating listening: reflect feelings, normalize experience, avoid fixing too fast.',
  };
  const therapyGuide = therapyGuides[method] || therapyGuides.warm;

  const crisis = mlResult?.needs_intervention
    ? '\nCRISIS: User may be in distress. Prioritize safety, encourage immediate helplines (iCall 9152987821, Vandrevala 1860-2662-345).'
    : '';

  const profile = userContext
    ? `\nUser profile: ${userContext.name || 'Professional'}${userContext.profession ? `, ${userContext.profession}` : ''}. Personality preference: ${personality || 'emotional'}.`
    : '';

  const memoryBlock = formatMemoryForPrompt(userMemory);

  return `You are MindWell AI, an expert mental health companion for working professionals in India.
You are NOT a doctor. Do not diagnose. Be conversational, natural, and human — like a skilled therapist in chat.
${therapyGuide}
${profile}
${memoryBlock}
Current emotional signals (use subtly, do not list clinically): mood=${mlResult?.mood}, stress=${mlResult?.stress_level}, wellness=${mlResult?.wellness_score}/100.
${crisis}

Rules:
- Write 2–5 sentences unless crisis (then be concise and direct).
- Reference what the user actually said — never generic platitudes.
- Remember prior messages in this thread.
- End with ONE open question to continue dialogue.
- No bullet lists unless user asked for steps.
- Use occasional emoji sparingly (max 1).`;
}

/**
 * @returns {{ text: string, provider: string, usedFallback: boolean }}
 */
async function tryGroq(opts, errors) {
  if (!GROQ_API_KEY) return null;
  try {
    const groq = await generateGroqResponse(opts);
    return { ...groq, usedFallback: false };
  } catch (e) {
    errors.push(`groq: ${e.message}`);
    console.warn('[LLM] Groq failed:', e.message?.slice(0, 120));
    return null;
  }
}

async function tryGemini(opts, errors) {
  try {
    const text = await generateGeminiResponse(opts);
    return { text, provider: 'gemini', usedFallback: false };
  } catch (e) {
    errors.push(`gemini: ${e.message}`);
    console.warn('[LLM] Gemini failed:', e.message?.slice(0, 120));
    return null;
  }
}

async function generateChatResponse(opts) {
  const errors = [];
  const primary = (process.env.LLM_PRIMARY || 'groq').toLowerCase();

  const order =
    primary === 'gemini'
      ? [tryGemini, tryGroq]
      : primary === 'auto'
        ? [tryGemini, tryGroq]
        : [tryGroq, tryGemini]; // default: groq first (reliable for demos)

  for (const fn of order) {
    const result = await fn(opts, errors);
    if (result) return result;
  }

  // 3) History-aware smart fallback (always works)
  const text = generateSmartResponse(opts);
  console.warn('[LLM] Using smart fallback. Reasons:', errors.join(' | '));
  return { text, provider: 'smart', usedFallback: true };
}

module.exports = { generateChatResponse };
