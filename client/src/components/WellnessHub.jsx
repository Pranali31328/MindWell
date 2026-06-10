import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import PageHeader from './PageHeader.jsx';
import { PAGE_TITLES } from '../config/navItems.js';

const CATEGORIES = [
  { id: 'all',        label: 'All',              icon: Lucide.LayoutGrid },
  { id: 'burnout',   label: 'Burnout Recovery', icon: Lucide.Flame },
  { id: 'anxiety',   label: 'Anxiety Relief',   icon: Lucide.Wind },
  { id: 'focus',     label: 'Deep Focus',       icon: Lucide.Target },
  { id: 'leadership',label: 'Leadership',       icon: Lucide.Users },
  { id: 'sleep',     label: 'Sleep & Rest',     icon: Lucide.Moon },
  { id: 'mindful',   label: 'Mindfulness',      icon: Lucide.Leaf },
];

const ARTICLES = [
  {
    id: 1, category: 'burnout',
    icon: '🔥', color: '#ff6b6b',
    title: 'The 5-Minute Meeting Reset',
    desc: 'Science-backed techniques to decompress between back-to-back meetings and restore your mental clarity.',
    readTime: '3 min', views: '12.4k',
    tags: ['Burnout', 'Quick Win'],
    content: `Back-to-back meetings drain your cognitive reserves. Here's your reset protocol:

1. **Box Breathing (90 seconds)** — Inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 3 times.
2. **Physical Reset** — Stand up, shake your hands, roll your shoulders 5 times.
3. **Mental Decoupling** — Write down 1 unfinished thought from the last meeting, then close the tab in your mind.
4. **Intention Setting** — State your one goal for the next meeting out loud.

Doing this between meetings reduces cortisol levels by up to 23% (Stanford 2023) and improves decision quality.`
  },
  {
    id: 2, category: 'anxiety',
    icon: '🌬️', color: '#00e5c3',
    title: 'How to Say No Without Guilt',
    desc: 'A practical 3-step framework for setting boundaries at work without damaging relationships.',
    readTime: '5 min', views: '18.7k',
    tags: ['Anxiety', 'Boundaries'],
    content: `Saying no is a skill, not a personality trait. The 3-step Boundary Blueprint:

1. **Acknowledge** — "I appreciate you thinking of me for this."
2. **Decline clearly** — "I'm not able to take this on right now given my current commitments."
3. **Offer an alternative (optional)** — "Would [alternative person/timeline] work instead?"

Avoid: over-explaining, apologizing excessively, or saying "maybe later" when you mean no. Your time and energy are finite resources. Protecting them is professional, not selfish.`
  },
  {
    id: 3, category: 'focus',
    icon: '🎯', color: '#ffd166',
    title: 'The Deep Work Blueprint for Professionals',
    desc: "Cal Newport's deep work principles adapted for the modern remote/hybrid professional.",
    readTime: '7 min', views: '22.1k',
    tags: ['Focus', 'Productivity'],
    content: `Deep Work = Professional output × Intensity of focus × Time spent.

**The 4 Rules:**
1. **Schedule deep work blocks** — Book 90-minute calendar slots labeled as "Focus Block" (others can't book over them).
2. **Digital minimalism** — Phone in another room, browser tabs closed except what's needed.
3. **Cognitive warm-up** — Start each session with a 5-min review of your goal.
4. **Rest is part of the system** — Diffuse thinking during walks solves problems your conscious mind can't.

Start with one 90-minute deep work block per day. Build from there.`
  },

  {
    id: 4, category: 'leadership',
    icon: '🤝', color: '#a78bfa',
    title: 'Empathetic Leadership Under Pressure',
    desc: 'How high-performing leaders maintain team morale and psychological safety during crunch periods.',
    readTime: '8 min', views: '9.3k',
    tags: ['Leadership', 'Team'],
    content: `Empathetic leadership isn't soft — it's the highest-ROI management skill.

**Under pressure, your team is watching:**
- **Your tone** — Anxiety is contagious. Calm is also contagious.
- **Your transparency** — Share what you can. Uncertainty without information breeds fear.
- **Your acknowledgment** — "I know this is hard. I see your effort." These 10 words increase discretionary effort by 40%.

**3 habits of pressure-proof leaders:**
1. Weekly 1:1s that start with "How are you really doing?"
2. Celebrate small wins publicly, even in crunch time.
3. Absorb external pressure rather than passing it down.`
  },
  {
    id: 5, category: 'sleep',
    icon: '🌙', color: '#818cf8',
    title: 'Sleep Optimization for High Performers',
    desc: 'Why sleep is your highest-leverage performance tool, and how to fix yours in 7 days.',
    readTime: '6 min', views: '31.5k',
    tags: ['Sleep', 'Recovery'],
    content: `Sleep deprivation costs the US economy $411 billion annually. It costs you your best thinking.

**The Sleep Foundation for Professionals:**
1. **Consistent bedtime** — Your body clock loves routine. Aim for the same ±30 min every night.
2. **The 3-2-1 Rule** — No food 3 hrs before bed, no alcohol 2 hrs, no screens 1 hr.
3. **Cool room** — 65-68°F (18-20°C) is optimal for deep sleep stages.
4. **Pre-sleep decompression** — Write tomorrow's top 3 tasks (offloads "open loops" from working memory).

Even one week of 7-8 hrs significantly improves executive function, emotional regulation, and creativity.`
  },
  {
    id: 6, category: 'mindful',
    icon: '🧘', color: '#00e5c3',
    title: 'Micro-Mindfulness: 60-Second Resets',
    desc: 'Five evidence-based mindfulness techniques that work even on your most chaotic work days.',
    readTime: '4 min', views: '15.2k',
    tags: ['Mindfulness', 'Quick Win'],
    content: `You don't need 20 minutes of meditation. You need 60 seconds, done consistently.

**5 Micro-Mindfulness Techniques:**
1. **STOP** — Stop, Take a breath, Observe (body/thoughts/feelings), Proceed.
2. **5-4-3-2-1 Grounding** — Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste.
3. **Mindful Coffee** — One sip. Full attention. No phone.
4. **Body Scan (60s)** — Start at your feet, scan upward, notice tension and release it.
5. **Loving-Kindness Flash** — Silently wish 3 people well in 20 seconds each.

Doing any one of these 5x/day restructures your stress response over 4 weeks.`
  },
  {
    id: 7, category: 'burnout',
    icon: '⚡', color: '#ffd166',
    title: 'Recognizing Early Burnout Signals',
    desc: 'The 12 warning signs your body sends before burnout becomes debilitating — and what to do.',
    readTime: '5 min', views: '28.6k',
    tags: ['Burnout', 'Prevention'],
    content: `Burnout doesn't happen overnight. It builds over months through ignored signals.

**Early Warning Signs (act now):**
- Dread on Sunday evenings
- Cynicism about work that didn't bother you before  
- Physical symptoms: headaches, gut issues, frequent illness
- Emotional numbness or irritability
- Declining satisfaction from things you used to enjoy

**Immediate Recovery Steps:**
1. Communicate bandwidth honestly with your manager
2. Remove one commitment from your schedule this week
3. Reconnect with ONE thing you used to love outside work
4. Book a doctor's appointment — burnout has physical components

Burnout is not a personal failure. It is a systemic response to unsustainable conditions.`
  },
  {
    id: 8, category: 'anxiety',
    icon: '🫁', color: '#00e5c3',
    title: 'The Physiological Sigh: Instant Calm',
    desc: "Stanford's latest discovery — the fastest way to reduce physiological arousal in real-time.",
    readTime: '2 min', views: '41.2k',
    tags: ['Anxiety', 'Science'],
    content: `The physiological sigh is the single most efficient method to calm your nervous system, proven by Stanford Neuroscience.

**How to do it:**
1. Take a normal inhale through your nose.
2. At the top, take a SECOND short inhale (to fully inflate the lungs).
3. Exhale slowly and completely through your mouth (twice as long as the inhale).

**Why it works:** The double inhale re-inflates deflated air sacs (alveoli) in the lungs, and the extended exhale activates the parasympathetic nervous system.

**When to use it:** Before a presentation, after a difficult conversation, when anxiety spikes in a meeting.

One to two cycles are enough. This is not meditation — it's physiology.`
  },
];

const EXERCISES = [
  { id: 'breathing', icon: '🌊', label: '4-7-8 Breathing', desc: '5 min', color: '#00e5c3' },
  { id: 'body-scan', icon: '🧘', label: 'Body Scan',       desc: '10 min', color: '#a78bfa' },
  { id: 'grounding', icon: '🌿', label: '5-4-3-2-1 Ground',desc: '3 min', color: '#ffd166' },
  { id: 'journaling',icon: '✍️', label: 'Gratitude Write', desc: '5 min', color: '#ff6b6b' },
];

const EMERGENCY = [
  { name: 'iCall (TISS)',           number: '9152987821',   desc: 'Mon–Sat, 8am–10pm' },
  { name: 'Vandrevala Foundation',  number: '1860-2662-345',desc: '24/7 — Free & confidential' },
  { name: 'AASRA',                  number: '9820466627',   desc: '24/7 helpline' },
  { name: 'iMind',                  number: '080-46110007', desc: 'Mon–Sat, 8am–8pm' },
];

const ARTICLE_ACTIONS = {
  burnout:    { insight: 'Take a 5-minute reset between meetings to lower cortisol.', exercise: 'breathing', label: 'Start 4-7-8 breathing' },
  anxiety:    { insight: 'Name the uncertainty, then pick one 10-minute action.', exercise: 'breathing', label: 'Try calming breath' },
  focus:      { insight: 'Block one 90-minute deep work slot on your calendar today.', exercise: 'timer', label: 'Open focus timer' },
  leadership: { insight: 'Open your next 1:1 with “How are you really doing?”', exercise: 'chat', label: 'Practice with AI' },
  sleep:      { insight: 'Wind down screens 30 minutes before bed for better recovery.', exercise: 'sanctuary', label: 'Emergency calm mode' },
  mindful:    { insight: 'Do a 60-second body scan before your next task.', exercise: 'breathing', label: 'Start box breathing' },
};

function ArticleModal({ article, onClose, onNavigate }) {
  const [saved, setSaved] = useState(false);
  const action = ARTICLE_ACTIONS[article.category] || { insight: 'Small consistent steps beat perfect plans.', exercise: 'journal', label: 'Write a reflection' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box article-modal-enhanced" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:52,height:52,borderRadius:14,background:`${article.color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26 }}>
              {article.icon}
            </div>
            <div>
              <div style={{ display:'flex',gap:8,marginBottom:6 }}>
                {article.tags.map(t => <span key={t} className="badge">{t}</span>)}
              </div>
              <div style={{ fontSize:12,color:'var(--text-muted)' }}>⏱ {article.readTime} read · 👁 {article.views} views</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding:8,borderRadius:10 }}>
            <Lucide.X size={20} />
          </button>
        </div>
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:18,color:'var(--text-primary)',lineHeight:1.3 }}>{article.title}</h2>
        <div className="glass-card" style={{ padding:16, marginBottom:18, background:'rgba(0,229,195,0.06)', borderColor:'rgba(0,229,195,0.2)' }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--primary)', marginBottom:6 }}>
            Actionable insight
          </div>
          <p style={{ fontSize:13.5, color:'var(--text-secondary)', lineHeight:1.65 }}>{action.insight}</p>
        </div>
        <div style={{ color:'var(--text-secondary)',lineHeight:1.85,fontSize:14,whiteSpace:'pre-line' }}>
          {article.content}
        </div>
        <div style={{ marginTop:28,display:'flex',gap:12,flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={() => { onClose(); onNavigate(action.exercise); }}>
            <Lucide.Play size={16} /> {action.label}
          </button>
          <button className="btn btn-secondary" onClick={() => setSaved(true)}>
            <Lucide.Bookmark size={16} /> {saved ? 'Saved ✓' : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function WellnessHub({ onNavigate }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);

  const filtered = activeCategory === 'all'
    ? ARTICLES
    : ARTICLES.filter(a => a.category === activeCategory);

  const meta = PAGE_TITLES.resources;

  return (
    <div className="hub-page">
      <div className="page-content">
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          actions={
            <button
              className="btn btn-danger"
              onClick={() => setShowEmergency(true)}
              style={{ fontSize:13, padding:'10px 18px' }}
            >
              <Lucide.Phone size={16} /> Crisis Help
            </button>
          }
        />

      <main className="hub-main" style={{ padding: 0, maxWidth: 'none' }}>
        {/* Quick Exercises */}
        <div className="glass-card" style={{ padding:28,marginBottom:32 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
            <h3 style={{ fontSize:18,fontWeight:800 }}>Quick Exercises</h3>
            <span className="badge">Start Instantly</span>
          </div>
          <div className="exercise-grid">
            {EXERCISES.map(ex => (
              <div
                key={ex.id}
                className="exercise-card"
                onClick={() => ex.id === 'breathing' ? onNavigate('breathing') : ex.id === 'journaling' ? onNavigate('journal') : null}
              >
                <div style={{ fontSize:32 }}>{ex.icon}</div>
                <div style={{ fontWeight:700,fontSize:14,color:'var(--text-primary)' }}>{ex.label}</div>
                <span className="badge" style={{ fontSize:10.5 }}>{ex.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Affirmation */}
        <div style={{
          padding:'22px 28px',
          background:'linear-gradient(135deg,rgba(0,229,195,0.1),rgba(167,139,250,0.06))',
          border:'1px solid rgba(0,229,195,0.2)',
          borderRadius:20,
          marginBottom:32,
          display:'flex',gap:16,alignItems:'center'
        }}>
          <div style={{ fontSize:32 }}>✨</div>
          <div>
            <div style={{ fontSize:11,color:'var(--primary)',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6 }}>Today's Affirmation</div>
            <p style={{ fontSize:16,fontWeight:600,color:'var(--text-primary)',fontStyle:'italic' }}>
              "I am doing meaningful work, and it's okay to need support along the way."
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:18,fontWeight:800,marginBottom:16 }}>Articles & Guides</h3>
          <div className="hub-categories">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <Icon size={15} /> {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="articles-grid">
          {filtered.map((a, i) => (
            <div
              key={a.id}
              className="article-card"
              style={{ animationDelay: `${i * 0.06}s` }}
              onClick={() => setSelectedArticle(a)}
            >
              <div className="article-top">
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div className="article-icon" style={{ background:`${a.color}15`, color:a.color, fontSize:20 }}>
                    {a.icon}
                  </div>
                  <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                    {a.tags.map(t => <span key={t} className="badge" style={{ fontSize:10 }}>{t}</span>)}
                  </div>
                </div>
                <Lucide.ArrowUpRight size={16} style={{ color:'var(--text-muted)',flexShrink:0 }} />
              </div>
              <h4 className="article-title">{a.title}</h4>
              <p className="article-desc">{a.desc}</p>
              <div className="article-meta">
                <span>⏱ {a.readTime} read</span>
                <span>👁 {a.views}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Workplace Wellness Tips */}
        <div className="glass-card" style={{ padding:28,marginTop:36 }}>
          <h3 style={{ fontSize:18,fontWeight:800,marginBottom:20 }}>💼 Workplace Wellness Essentials</h3>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16 }}>
            {[
              { icon:'🧠', title:'Cognitive Load Management', tip:'Never schedule more than 3 cognitively heavy tasks in one day.' },
              { icon:'🚶', title:'Movement Breaks',           tip:'A 5-min walk every 90 min improves creativity by 60% (Stanford).' },
              { icon:'📵', title:'Digital Detox Hours',       tip:'Block 2 hours each day with zero notifications. Your focus will thank you.' },
              { icon:'🌿', title:'Nature Micro-Doses',        tip:'Even a photo of nature reduces cortisol. Keep one on your desk.' },
            ].map(item => (
              <div key={item.title} style={{ padding:'18px 20px',background:'var(--primary-subtle)',border:'1px solid var(--border)',borderRadius:16 }}>
                <div style={{ fontSize:22,marginBottom:10 }}>{item.icon}</div>
                <div style={{ fontWeight:700,fontSize:13.5,color:'var(--text-primary)',marginBottom:6 }}>{item.title}</div>
                <div style={{ fontSize:12.5,color:'var(--text-secondary)',lineHeight:1.55 }}>{item.tip}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} onNavigate={onNavigate} />
      )}

      {/* Emergency Resources Modal */}
      {showEmergency && (
        <div className="modal-overlay" onClick={() => setShowEmergency(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
              <div>
                <h3 style={{ fontSize:22,fontWeight:800,color:'var(--secondary)' }}>🆘 Crisis Support Resources</h3>
                <p style={{ fontSize:13,color:'var(--text-secondary)',marginTop:4 }}>You are not alone. Help is available right now.</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowEmergency(false)} style={{ padding:8 }}>
                <Lucide.X size={20} />
              </button>
            </div>
            <div style={{ display:'grid',gap:14 }}>
              {EMERGENCY.map(e => (
                <div key={e.name} style={{ padding:'18px 22px',background:'rgba(255,107,107,0.06)',border:'1px solid rgba(255,107,107,0.2)',borderRadius:16,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15,color:'var(--text-primary)',marginBottom:4 }}>{e.name}</div>
                    <div style={{ fontSize:12,color:'var(--text-muted)' }}>{e.desc}</div>
                  </div>
                  <div style={{ fontSize:18,fontWeight:800,color:'var(--secondary)',fontVariantNumeric:'tabular-nums' }}>{e.number}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:22,padding:'16px 20px',background:'var(--primary-subtle)',border:'1px solid var(--border)',borderRadius:14,fontSize:13,color:'var(--text-secondary)',lineHeight:1.6 }}>
              💛 If you or someone you know is in immediate danger, please call <strong style={{color:'var(--text-primary)'}}>112</strong> (emergency services) immediately.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
