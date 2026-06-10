import { useState, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

/**
 * Tracks speech timing during STT and calls ML voice analysis on final transcript.
 */
export function useVoiceEmotion() {
  const [voiceEmotion, setVoiceEmotion] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const listenStartRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const pauseCountRef = useRef(0);

  const onListenStart = useCallback(() => {
    listenStartRef.current = Date.now();
    lastTranscriptRef.current = '';
    pauseCountRef.current = 0;
    setVoiceEmotion(null);
  }, []);

  const onTranscriptUpdate = useCallback((transcript) => {
    const prev = lastTranscriptRef.current;
    if (transcript.length > prev.length + 8) {
      pauseCountRef.current += 1;
    }
    lastTranscriptRef.current = transcript;
  }, []);

  const analyzeTranscript = useCallback(async (transcript, prosodyFeatures = {}) => {
    const text = (transcript || '').trim();
    if (!text) {
      setVoiceEmotion(null);
      return null;
    }

    const elapsedSec = listenStartRef.current
      ? (Date.now() - listenStartRef.current) / 1000
      : 1;
    const words = text.split(/\s+/).filter(Boolean).length;
    const wpm = Math.round((words / Math.max(elapsedSec, 0.5)) * 60);
    const pauseRatio = Math.min(1, pauseCountRef.current / Math.max(words / 4, 1));

    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/analyze/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          features: {
            words_per_minute: wpm,
            pause_ratio: pauseRatio,
            avg_confidence: 0.82,
            avg_volume: prosodyFeatures.avg_volume ?? 0,
            pitch_variance: prosodyFeatures.pitch_variance ?? 0,
            avg_pitch_hz: prosodyFeatures.avg_pitch_hz ?? 0,
          },
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (data) {
        const payload = {
          mood: data.voice_mood || data.mood,
          label: data.voice_mood || data.mood,
          energy: data.voice_energy || 'medium',
          wpm,
          stressScore: data.stress_score,
          prosody: data.voice_prosody || prosodyFeatures,
        };
        setVoiceEmotion(payload);
        return payload;
      }
    } catch {
      /* ignore */
    } finally {
      setAnalyzing(false);
    }
    return null;
  }, []);

  const clearVoiceEmotion = useCallback(() => setVoiceEmotion(null), []);

  return {
    voiceEmotion,
    analyzing,
    onListenStart,
    onTranscriptUpdate,
    analyzeTranscript,
    clearVoiceEmotion,
  };
}
