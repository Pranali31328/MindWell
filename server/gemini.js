const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const { formatMemoryForPrompt } = require('./memoryFormat');

const MODEL_CANDIDATES = (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-flash-latest,gemini-2.0-flash,gemini-2.0-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

function mapTherapyMethod(therapyMethod) {
  if (!therapyMethod) return 'warm';
  const m = therapyMethod.toLowerCase();
  if (m === 'cbt') return 'cbt';
  if (m === 'mindfulness') return 'mindfulness';
  return 'warm';
}

function buildSystemInstruction({ personality, therapyMethod, mlResult, userContext, userMemory }) {
  const method = mapTherapyMethod(therapyMethod);
  const therapyGuide = {
    cbt: 'Apply CBT: explore thoughts, evidence, and balanced reframes.',
    mindfulness: 'Apply mindfulness: grounding, breath, body awareness, present moment.',
    warm: 'Apply warm listening: validate, reflect, normalize without rushing to fix.',
  }[method];

  const profile = userContext?.name
    ? `User: ${userContext.name}${userContext.profession ? ` (${userContext.profession})` : ''}.`
    : '';

  const memoryBlock = formatMemoryForPrompt(userMemory);

  return `You are MindWell AI — a skilled, conversational mental health companion for working professionals.
${therapyGuide}
Personality preference: ${personality || 'emotional'}.
${profile}
${memoryBlock}
Emotional context (subtle use only): mood=${mlResult?.mood}, stress=${mlResult?.stress_level}.
${mlResult?.needs_intervention ? 'CRISIS MODE: prioritize safety and helplines (iCall 9152987821).' : ''}
Be natural, human, and specific. Reference the user's actual words. 2–5 sentences. End with one question. Not a doctor.`;
}

function buildContents({ userText, contextMessages }) {
  const contents = [];
  const history = (contextMessages || []).slice(-14);

  for (const m of history) {
    const role = m.sender === 'user' ? 'user' : 'model';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += '\n' + m.text;
    } else {
      contents.push({ role, parts: [{ text: m.text }] });
    }
  }

  const last = contents[contents.length - 1];
  if (!last || last.role !== 'user' || last.parts[0].text !== userText) {
    contents.push({ role: 'user', parts: [{ text: userText }] });
  }

  return contents.length ? contents : [{ role: 'user', parts: [{ text: userText }] }];
}

async function callGeminiModel(model, body) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    encodeURIComponent(GEMINI_API_KEY);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const err = new Error(`Gemini ${model} (${res.status}): ${txt.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('') ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';

  if (!text) throw new Error(`Gemini ${model} returned empty response`);
  return text;
}

async function generateGeminiResponse({
  userText,
  personality,
  therapyMethod,
  mlResult,
  contextMessages = [],
  userContext = {},
  userMemory = null,
}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY in server environment');
  }

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction({ personality, therapyMethod, mlResult, userContext, userMemory }) }],
    },
    contents: buildContents({ userText, contextMessages }),
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 720,
      topP: 0.92,
    },
  };

  let lastError;
  for (const model of MODEL_CANDIDATES) {
    try {
      if (lastError?.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      return await callGeminiModel(model, body);
    } catch (e) {
      lastError = e;
      console.warn(`[Gemini] ${model} failed:`, e.message?.slice(0, 100));
      if (e.status === 404) continue;
      if (e.status === 429) continue;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

async function generateMemorySummary({ userName, userMessages, existingTopics, existingFacts }) {
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

  const snippets = (userMessages || []).slice(-20).map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `You are building a private memory profile for a mental health app (MindWell).
User: ${userName || 'User'}
Existing topics: ${(existingTopics || []).join(', ') || 'none'}

Recent things they said:
${snippets || 'No messages yet.'}

Existing facts:
${(existingFacts || []).map(f => `- ${f.text}`).join('\n') || 'none'}

Respond with ONLY valid JSON (no markdown):
{"summary":"2-3 sentence compassionate summary of their emotional journey","topics":["up to 6 short topic labels"]}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 420 },
  };

  let lastError;
  for (const model of MODEL_CANDIDATES) {
    try {
      const raw = await callGeminiModel(model, body);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: String(parsed.summary || '').slice(0, 500),
          topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 8) : [],
          source: 'gemini',
        };
      }
      return { summary: raw.slice(0, 500), topics: existingTopics || [], source: 'gemini-text' };
    } catch (e) {
      lastError = e;
      if (e.status === 429) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastError || new Error('Memory summary failed');
}

module.exports = { generateGeminiResponse, generateMemorySummary };
