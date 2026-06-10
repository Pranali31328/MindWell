import { useState, useEffect, useMemo } from 'react';

const MOOD_RULES = [
  { mood: 'crisis',       label: 'High concern',   score: 15, re: /\b(suicide|kill myself|want to die|hurt myself|hopeless)\b/i },
  { mood: 'overwhelmed',  label: 'Overwhelmed',    score: 35, re: /\b(overwhelm|burnout|can't cope|too much|drowning|exhausted)\b/i },
  { mood: 'anxious',      label: 'Anxious',        score: 48, re: /\b(anxi|stress|worried|panic|deadline|nervous)\b/i },
  { mood: 'distressed',   label: 'Low mood',       score: 40, re: /\b(sad|depress|down|empty|worthless|angry|frustrat)\b/i },
  { mood: 'happy',        label: 'Positive',       score: 88, re: /\b(great|happy|excited|proud|achieved|wonderful|grateful|amazing)\b/i },
  { mood: 'calm',         label: 'Calm',           score: 78, re: /\b(calm|peaceful|okay|fine|relaxed|settled)\b/i },
];

function analyzeText(text) {
  const t = (text || '').trim();
  if (!t) return null;

  let pauseSignal = 0;
  if (t.length > 80 && (t.match(/\.\.\./g) || []).length >= 1) pauseSignal = 8;
  if (t.split(/\s+/).length > 40) pauseSignal += 5;

  for (const rule of MOOD_RULES) {
    if (rule.re.test(t)) {
      return {
        mood: rule.mood,
        label: rule.label,
        score: Math.max(10, Math.min(95, rule.score - pauseSignal)),
        confidence: Math.min(0.95, 0.45 + t.length / 120),
      };
    }
  }

  const neg = (t.match(/\b(not|never|hate|bad|hard|difficult|struggle)\b/gi) || []).length;
  const pos = (t.match(/\b(good|well|better|thanks|love|enjoy)\b/gi) || []).length;
  if (neg > pos + 1) {
    return { mood: 'anxious', label: 'Processing…', score: 52, confidence: 0.35 };
  }
  if (pos > neg) {
    return { mood: 'neutral', label: 'Reflective', score: 68, confidence: 0.3 };
  }
  return { mood: 'neutral', label: 'Listening…', score: 65, confidence: 0.25 };
}

export function useTypingEmotion(text, debounceMs = 280) {
  const [live, setLive] = useState(null);

  const trimmed = useMemo(() => (text || '').trim(), [text]);

  useEffect(() => {
    // Always use setTimeout so setState is never called synchronously in the effect body,
    // preventing cascading re-renders. A 0ms delay still clears the value immediately after paint.
    const delay = trimmed ? debounceMs : 0;
    const id = setTimeout(() => setLive(trimmed ? analyzeText(trimmed) : null), delay);
    return () => clearTimeout(id);
  }, [trimmed, debounceMs]);

  return live;
}
