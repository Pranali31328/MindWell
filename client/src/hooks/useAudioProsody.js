import { useRef, useCallback } from 'react';

/**
 * Web Audio analyser — volume + pitch samples while the mic is active.
 */
export function useAudioProsody() {
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const volumesRef = useRef([]);
  const pitchesRef = useRef([]);

  const sampleLoop = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !ctx) return;

    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);

    let sum = 0;
    let peak = 0;
    let peakIdx = 0;
    const start = 4;
    const end = Math.floor(bins.length * 0.45);
    for (let i = start; i < end; i++) {
      sum += bins[i];
      if (bins[i] > peak) {
        peak = bins[i];
        peakIdx = i;
      }
    }
    const avg = sum / Math.max(end - start, 1);
    volumesRef.current.push(avg);

    const hz = (peakIdx * ctx.sampleRate) / analyser.fftSize;
    if (hz > 75 && hz < 450 && peak > 30) {
      pitchesRef.current.push(hz);
    }

    rafRef.current = requestAnimationFrame(sampleLoop);
  }, []);

  const startCapture = useCallback(async () => {
    volumesRef.current = [];
    pitchesRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      await ctx.resume();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      analyserRef.current = analyser;
      sampleLoop();
      return true;
    } catch {
      return false;
    }
  }, [sampleLoop]);

  const stopCapture = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    if (ctxRef.current?.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    analyserRef.current = null;

    const volumes = volumesRef.current;
    const pitches = pitchesRef.current;
    const avgVolume = volumes.length
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length
      : 0;
    const avgPitch = pitches.length
      ? pitches.reduce((a, b) => a + b, 0) / pitches.length
      : 0;
    let pitchVariance = 0;
    if (pitches.length > 2) {
      const mean = avgPitch;
      pitchVariance = Math.sqrt(
        pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length
      );
    }

    return {
      avg_volume: Math.round(avgVolume * 10) / 10,
      avg_pitch_hz: Math.round(avgPitch),
      pitch_variance: Math.round(pitchVariance * 10) / 10,
    };
  }, []);

  return { startCapture, stopCapture };
}
