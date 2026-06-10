export const API_BASE = 'http://localhost:5000/api';
const BASE = API_BASE;

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.details = data.details;
    throw err;
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (name, email, password) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

// ── User / Onboarding ────────────────────────────────────────────────────────
export const userAPI = {
  completeOnboarding: (id, data) =>
    req(`/users/${id}/onboarding`, { method: 'PUT', body: JSON.stringify(data) }),
  getProfile: (id) => req(`/users/${id}`),
};

// ── Chat ─────────────────────────────────────────────────────────────────────
export const chatAPI = {
  startSession: (userId, therapyMethod = 'warm') =>
    req('/chat/session', { method: 'POST', body: JSON.stringify({ userId, therapyMethod }) }),
  sendMessage: (sessionId, text, personality, therapyMethod = 'warm') =>
    req('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ sessionId, text, personality, therapyMethod }),
    }),
  getHistory: (sessionId) => req(`/chat/session/${sessionId}`),
  getSessions: (userId) => req(`/chat/sessions/${userId}`),
};

// ── Journal ──────────────────────────────────────────────────────────────────
export const journalAPI = {
  list: (userId) => req(`/journal/${userId}`),
  create: (userId, data) =>
    req(`/journal/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── Goals & mood check-ins ───────────────────────────────────────────────────
export const wellnessAPI = {
  getGoals: (userId) => req(`/wellness/goals/${userId}`),
  createGoal: (userId, data) =>
    req(`/wellness/goals/${userId}`, { method: 'POST', body: JSON.stringify(data) }),
  toggleGoal: (goalId) =>
    req(`/wellness/goals/${goalId}/toggle`, { method: 'PATCH' }),
  moodCheckIn: (userId, moodIndex, moodLabel) =>
    req(`/wellness/mood/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ moodIndex, moodLabel }),
    }),
  getStreak: (userId) => req(`/wellness/streak/${userId}`),
};

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  get: (userId) => req(`/analytics/${userId}`),
};

// ── AI memory ────────────────────────────────────────────────────────────────
export const memoryAPI = {
  get: (userId) => req(`/memory/${userId}`),
  clear: (userId) => req(`/memory/${userId}`, { method: 'DELETE' }),
  refreshWithAI: (userId) => req(`/memory/${userId}/refresh`, { method: 'POST' }),
};

export const mlAPI = {
  analyze: (text) =>
    req('/analyze', { method: 'POST', body: JSON.stringify({ text }) }),
  analyzeVoice: (text, features) =>
    req('/analyze/voice', {
      method: 'POST',
      body: JSON.stringify({ text, features }),
    }),
};

export async function checkServerHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
