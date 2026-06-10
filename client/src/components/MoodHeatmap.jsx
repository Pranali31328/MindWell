import { useMemo } from 'react';
import { motion } from 'framer-motion';

const LEVEL_COLORS = [
  'var(--heatmap-empty)',
  '#ff6b6b',
  '#ffd166',
  '#a78bfa',
  '#00e5c3',
];

function scoreToLevel(score) {
  if (score == null) return 0;
  if (score < 35) return 1;
  if (score < 55) return 2;
  if (score < 75) return 3;
  return 4;
}

export default function MoodHeatmap({ days = [], title = 'Emotional Heatmap' }) {
  const cells = useMemo(() => {
    const map = {};
    (days || []).forEach(d => {
      if (d?.date) map[d.date.slice(0, 10)] = d;
    });
    const out = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = map[key];
      out.push({
        date: key,
        day: d.getDate(),
        weekday: d.toLocaleDateString([], { weekday: 'narrow' }),
        score: entry?.score ?? null,
        mood: entry?.mood ?? null,
        level: scoreToLevel(entry?.score),
      });
    }
    return out;
  }, [days]);

  const activeDays = cells.filter(c => c.score != null).length;

  return (
    <div className="mood-heatmap glass-card-premium">
      <div className="mood-heatmap-header">
        <div>
          <h3>{title}</h3>
          <p>Last 4 weeks · {activeDays} days with data</p>
        </div>
        <div className="heatmap-legend">
          {['Low', 'Mid', 'Good', 'Great'].map((l, i) => (
            <span key={l} className="legend-item">
              <i style={{ background: LEVEL_COLORS[i + 1] }} /> {l}
            </span>
          ))}
        </div>
      </div>
      <div className="heatmap-grid">
        {cells.map((cell, i) => (
          <motion.div
            key={cell.date}
            className={`heatmap-cell level-${cell.level}`}
            style={{ background: LEVEL_COLORS[cell.level] }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.015, duration: 0.25 }}
            title={cell.score != null
              ? `${cell.date}: ${cell.mood || 'tracked'} (${cell.score}%)`
              : `${cell.date}: no data`}
          >
            <span className="heatmap-day">{cell.day}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
