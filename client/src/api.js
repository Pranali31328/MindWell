// Base URL from environment variable — set VITE_API_URL in client/.env
// Falls back to localhost for local development
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/v1';

/**
 * Core fetch wrapper.
 * Automatically attaches the JWT token from localStorage and handles errors.
 */
async function req(path, options = {}) {
  const token = localStorage.getItem('mw_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (name, email, password) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

// ── User / Onboarding ─────────────────────────────────────────────────────────
// NOTE: No more /users/:id — user ID comes from the JWT server-side
export const userAPI = {
  getMe: () => req('/users/me'),
  completeOnboarding: (data) =>
    req('/users/onboarding', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  startSession: (therapyMethod = 'warm') =>
    req('/chat/session', { method: 'POST', body: JSON.stringify({ therapyMethod }) }),
  sendMessage: (sessionId, text, personality, therapyMethod = 'warm') =>
    req('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ sessionId, text, personality, therapyMethod }),
    }),
  getHistory: (sessionId) => req(`/chat/session/${sessionId}`),
  getSessions: () => req('/chat/sessions'),
};

// ── Journal ───────────────────────────────────────────────────────────────────
export const journalAPI = {
  list: () => req('/journal'),
  create: (data) => req('/journal', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Goals & mood check-ins ────────────────────────────────────────────────────
export const wellnessAPI = {
  getGoals: () => req('/wellness/goals'),
  createGoal: (data) => req('/wellness/goals', { method: 'POST', body: JSON.stringify(data) }),
  toggleGoal: (goalId) => req(`/wellness/goals/${goalId}/toggle`, { method: 'PATCH' }),
  moodCheckIn: (moodIndex, moodLabel) =>
    req('/wellness/mood', { method: 'POST', body: JSON.stringify({ moodIndex, moodLabel }) }),
  getStreak: () => req('/wellness/streak'),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  get: () => req('/analytics'),
};

// ── AI memory ─────────────────────────────────────────────────────────────────
export const memoryAPI = {
  get: () => req('/memory'),
  clear: () => req('/memory', { method: 'DELETE' }),
  refreshWithAI: () => req('/memory/refresh', { method: 'POST' }),
};

// ── ML Analysis proxy ─────────────────────────────────────────────────────────
export const mlAPI = {
  analyze: (text) => req('/analyze', { method: 'POST', body: JSON.stringify({ text }) }),
  analyzeVoice: (text, features) =>
    req('/analyze/voice', { method: 'POST', body: JSON.stringify({ text, features }) }),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportAPI = {
  downloadJson: () => req('/export/json'),
  getReport: () => `${BASE}/export/report?token=${localStorage.getItem('mw_token')}`,
};

// ── Health check ──────────────────────────────────────────────────────────────
export async function checkServerHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
