import React from 'react';
import { motion } from 'framer-motion';

const MOOD_PALETTE = {
  happy:        { core: '#00e5c3', glow: 'rgba(0,229,195,0.55)', ring: '#a78bfa' },
  calm:         { core: '#a78bfa', glow: 'rgba(167,139,250,0.5)', ring: '#6366f1' },
  neutral:      { core: '#6b7280', glow: 'rgba(107,114,128,0.35)', ring: '#00e5c3' },
  anxious:      { core: '#ffd166', glow: 'rgba(255,209,102,0.5)', ring: '#ff6b6b' },
  overwhelmed:  { core: '#ff6b6b', glow: 'rgba(255,107,107,0.55)', ring: '#ffd166' },
  distressed:   { core: '#ff4444', glow: 'rgba(255,68,68,0.5)', ring: '#c084fc' },
  crisis:       { core: '#b91c1c', glow: 'rgba(185,28,28,0.6)', ring: '#ff6b6b' },
};

function paletteFor(mood, wellness) {
  if (mood && MOOD_PALETTE[mood]) return MOOD_PALETTE[mood];
  if (wellness >= 70) return MOOD_PALETTE.happy;
  if (wellness >= 45) return MOOD_PALETTE.anxious;
  return MOOD_PALETTE.overwhelmed;
}

export default function EmotionalOrb({
  mood = 'neutral',
  wellness = 75,
  size = 52,
  pulse = true,
  label,
  className = '',
}) {
  const pal = paletteFor(mood, wellness);
  const intensity = Math.max(0.35, Math.min(1, wellness / 100));

  return (
    <div
      className={`emotional-orb-wrap ${className}`}
      style={{ width: size, height: size }}
      title={label || mood}
    >
      {pulse && (
        <>
          <motion.div
            className="orb-pulse-ring"
            style={{ borderColor: pal.core, boxShadow: `0 0 24px ${pal.glow}` }}
            animate={{ scale: [1, 1.45, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="orb-pulse-ring orb-pulse-delay"
            style={{ borderColor: pal.ring }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          />
        </>
      )}
      <motion.div
        className="emotional-orb-core"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          background: `radial-gradient(circle at 35% 30%, ${pal.core} 0%, ${pal.ring} 55%, transparent 100%)`,
          boxShadow: `0 0 ${20 + intensity * 28}px ${pal.glow}, inset 0 0 12px rgba(255,255,255,0.15)`,
        }}
        animate={{
          scale: pulse ? [1, 1.06, 1] : 1,
          rotate: pulse ? [0, 8, -8, 0] : 0,
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb-shine"
        animate={{ opacity: [0.4, 0.85, 0.4], x: [-2, 2, -2] }}
        transition={{ duration: 3.2, repeat: Infinity }}
      />
    </div>
  );
}
