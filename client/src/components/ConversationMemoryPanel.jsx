import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';

export default function ConversationMemoryPanel({
  open,
  onClose,
  memory,
  loading,
  onClear,
  onRefreshAI,
  refreshing,
}) {
  const topics = memory?.topics || [];
  const facts = memory?.keyFacts || [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="memory-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="memory-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="memory-panel-header">
              <div>
                <h3>AI Memory</h3>
                <p>What your companion remembers across sessions</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
                <Lucide.X size={20} />
              </button>
            </div>

            {loading ? (
              <div className="memory-panel-loading">Loading memory…</div>
            ) : (
              <div className="memory-panel-body">
                <section className="memory-block">
                  <div className="memory-block-label">
                    <Lucide.Brain size={14} /> Summary
                  </div>
                  <p>{memory?.summary || 'No memory yet — chat a few times and themes will appear here.'}</p>
                </section>

                {topics.length > 0 && (
                  <section className="memory-block">
                    <div className="memory-block-label">
                      <Lucide.Tags size={14} /> Recurring topics
                    </div>
                    <div className="memory-tags">
                      {topics.map(t => (
                        <span key={t} className="memory-tag">{t}</span>
                      ))}
                    </div>
                  </section>
                )}

                {facts.length > 0 && (
                  <section className="memory-block">
                    <div className="memory-block-label">
                      <Lucide.MessageSquare size={14} /> Recent statements
                    </div>
                    <ul className="memory-facts">
                      {facts.map((f, i) => (
                        <li key={i}>
                          <span className="memory-fact-mood">{f.mood}</span>
                          {f.text}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {memory?.updatedAt && (
                  <p className="memory-updated">
                    Updated {new Date(memory.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="memory-panel-footer" style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={onRefreshAI}
                disabled={refreshing}
              >
                <Lucide.Sparkles size={16} />
                {refreshing ? 'Summarizing with Gemini…' : 'Refresh with AI'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onClear}>
                <Lucide.Trash2 size={16} /> Clear memory
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
