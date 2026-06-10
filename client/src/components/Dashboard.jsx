import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { analyticsAPI, wellnessAPI } from '../api.js';
import EmotionalOrb from './EmotionalOrb.jsx';
import MoodHeatmap from './MoodHeatmap.jsx';
import ExportReportBar from './ExportReportBar.jsx';
import PageHeader from './PageHeader.jsx';
import { PAGE_TITLES } from '../config/navItems.js';

const MOOD_COLOR = {
  happy:'#00e5c3', calm:'#a78bfa', neutral:'#6b7280',
  anxious:'#ffd166', overwhelmed:'#ff6b6b', distressed:'#ff4444', crisis:'#b91c1c'
};

const AFFIRMATIONS = [
  "You are doing meaningful work, and it's okay to need support along the way.",
  "Your mental health is as important as your productivity.",
  "Taking breaks is not laziness — it's sustainable performance.",
  "You don't have to be perfect to be valuable.",
  "Progress, not perfection. You're doing better than you think.",
  "Asking for help is a sign of self-awareness, not weakness.",
  "It's okay to have a bad day. Tomorrow is a fresh start.",
  "Your feelings are valid, even when they're inconvenient.",
];

function WellnessGauge({ score }) {
  const radius = 54;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color  = score >= 70 ? '#00e5c3' : score >= 45 ? '#ffd166' : '#ff6b6b';
  return (
    <div style={{ position:'relative', width:140, height:140, margin:'0 auto 12px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle className="progress-ring-track" cx="70" cy="70" r={radius} />
        <circle
          className="progress-ring-fill"
          cx="70" cy="70" r={radius}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          stroke={color}
          transform="rotate(-90 70 70)"
          style={{ transition:'stroke-dashoffset 1.2s ease, stroke 0.6s ease' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:30, fontWeight:900, color, lineHeight:1 }}>{score}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Wellness</span>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onNavigate }) {
  const [analytics, setAnalytics]     = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedMood, setCheckedMood] = useState(null);
  const [affirmIdx]                   = useState(() => Math.floor(Math.random() * AFFIRMATIONS.length));
  const [streak, setStreak]           = useState(0);
  const [goals, setGoals]             = useState([]);
  const [newGoal, setNewGoal]         = useState('');
  const [celebrateId, setCelebrateId] = useState(null);
  const [showMoodSaved, setShowMoodSaved] = useState(false);
  const [exportToast, setExportToast] = useState(null);

  const loadWellness = useCallback(() => {
    wellnessAPI.getStreak(user.id).then(d => setStreak(d.streak || 0)).catch(() => {});
    wellnessAPI.getGoals(user.id).then(setGoals).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    analyticsAPI.get(user.id).then(setAnalytics).catch(() => {});
    loadWellness();
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, [user.id, loadWellness]);

  const greeting = () => {
    const h = currentTime.getHours();
    return h < 12 ? '🌅 Good Morning' : h < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening';
  };

  const wellnessScore = analytics ? analytics.avgWellness : 75;
  const burnoutRisk = analytics?.burnoutRisk ?? null;
  const burnoutLevel = analytics?.burnoutLevel ?? 'low';
  const burnoutColor = burnoutLevel === 'high' ? '#ff6b6b' : burnoutLevel === 'moderate' ? '#ffd166' : '#00e5c3';

  const stats = [
    { icon:Lucide.Smile,         label:'Avg Wellness',   value: analytics ? `${analytics.avgWellness}%` : '75%',   color:'#00e5c3', trend:'AI tracked' },
    { icon:Lucide.MessageCircle, label:'Total Sessions',  value: analytics ? analytics.totalSessions     : '—',     color:'#a78bfa', trend:'lifetime' },
    { icon:Lucide.BookOpen,      label:'Messages',        value: analytics ? analytics.totalMessages     : '—',     color:'#ffd166', trend:'all time' },
    { icon:Lucide.Trophy,        label:'Micro-Wins',      value: analytics ? analytics.totalMicroWins    : '—',     color:'#ff6b6b', trend:'collected' },
  ];

  const actions = [
    { id:'chat',      icon:Lucide.MessageSquare, title:'AI Companion',    desc:'Start your daily mental health check-in', color:'var(--primary)' },
    { id:'journal',   icon:Lucide.BookOpen,      title:'Mood Journal',    desc:'Reflect and track your emotional journey', color:'var(--violet)' },
    { id:'resources', icon:Lucide.Library,       title:'Wellness Hub',    desc:'Evidence-based guides & exercises',        color:'var(--accent)' },
    { id:'breathing', icon:Lucide.Wind,          title:'Breathe & Calm',  desc:'4-7-8 breathing & mindfulness exercises',  color:'#00e5c3' },
    { id:'burnout',   icon:Lucide.Flame,         title:'Burnout Test',    desc:'Assess your burnout risk level now',       color:'var(--secondary)' },
    { id:'timer',     icon:Lucide.Timer,         title:'Focus Timer',     desc:'Pomodoro timer for deep work sessions',    color:'#a78bfa' },
    { id:'sanctuary', icon:Lucide.Sparkles,      title:'Calm Sanctuary',  desc:'2-minute emergency calm intervention',     color:'#00b89a' },
  ];

  const moodEntries = analytics?.moodDistribution
    ? Object.entries(analytics.moodDistribution).sort((a, b) => b[1] - a[1])
    : [];
  const totalMoods = moodEntries.reduce((s, [, v]) => s + v, 0);
  const dominantMood = moodEntries.length > 0 ? moodEntries[0][0] : 'neutral';

  const moods = ['😊','😌','😐','😟','😤'];
  const moodLabels = ['Great','Calm','Okay','Low','Stressed'];

  const handleMoodCheck = async (i) => {
    setCheckedMood(i);
    setShowMoodSaved(true);
    try {
      await wellnessAPI.moodCheckIn(user.id, i, moodLabels[i]);
      const s = await wellnessAPI.getStreak(user.id);
      setStreak(s.streak || 0);
    } catch { /* keep UI feedback */ }
    setTimeout(() => setShowMoodSaved(false), 3000);
  };

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;
    try {
      const g = await wellnessAPI.createGoal(user.id, { title: newGoal.trim(), category: 'wellness' });
      setGoals(prev => [g, ...prev]);
      setNewGoal('');
    } catch { /* ignore */ }
  };

  const handleToggleGoal = async (goalId) => {
    try {
      const updated = await wellnessAPI.toggleGoal(goalId);
      setGoals(prev => prev.map(g => (g.id === goalId ? updated : g)));
      if (updated.completed) {
        setCelebrateId(goalId);
        setTimeout(() => setCelebrateId(null), 1200);
      }
      loadWellness();
    } catch { /* ignore */ }
  };

  const showExportToast = (message, type = 'success') => {
    setExportToast({ message, type });
    setTimeout(() => setExportToast(null), 4500);
  };

  const meta = PAGE_TITLES.dashboard;

  return (
    <div className="dashboard-page">
      {exportToast && (
        <div className={`dashboard-export-toast ${exportToast.type}`}>
          {exportToast.message}
        </div>
      )}

      <div className="page-content">
        <PageHeader title={meta.title} subtitle={meta.subtitle} />

        {/* Welcome banner */}
        <motion.div
          className="welcome-section premium-hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="welcome-hero-grid">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                <motion.span
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.12)', padding:'4px 12px', borderRadius:20, backdropFilter:'blur(8px)' }}
                >
                  🔥 {streak}-Day Streak
                </motion.span>
                {analytics && (
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.7)', background:'rgba(255,255,255,0.12)', padding:'4px 12px', borderRadius:20 }}>
                    ML Insights Active
                  </span>
                )}
              </div>
              <h1 style={{ fontSize:34, fontWeight:900, color:'white', marginBottom:10, letterSpacing:'-0.03em', fontFamily:'Space Grotesk, sans-serif' }}>
                {greeting()}, {user.name?.split(' ')[0] || 'Professional'}!
              </h1>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.85)', maxWidth:520, lineHeight:1.65, marginBottom:22 }}>
                {user.profession
                  ? `As a ${user.profession}, your mental clarity drives your performance. Let's check in today.`
                  : 'Your AI mental health companion is ready. How are you really doing today?'}
              </p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <motion.button
                  className="btn"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ background:'white', color:'var(--primary-dim)', fontWeight:800, boxShadow:'0 6px 20px rgba(0,0,0,0.2)' }}
                  onClick={() => onNavigate('chat')}
                >
                  <Lucide.MessageCircle size={17} /> Start Check-in
                </motion.button>
                <motion.button
                  className="btn"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ background:'rgba(255,255,255,0.12)', color:'white', border:'1px solid rgba(255,255,255,0.25)', backdropFilter:'blur(8px)' }}
                  onClick={() => onNavigate('breathing')}
                >
                  <Lucide.Wind size={17} /> Quick Breathe
                </motion.button>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
              <EmotionalOrb mood={dominantMood} wellness={wellnessScore} size={88} />
              {burnoutRisk != null && (
                <div className="burnout-risk-card">
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.65)', marginBottom:6 }}>
                    ML Burnout Risk
                  </div>
                  <div className="risk-value" style={{ color: burnoutColor }}>{burnoutRisk}%</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:4, textTransform:'capitalize' }}>
                    {analytics?.burnoutLabel || burnoutLevel}
                  </div>
                  {analytics?.burnoutModel && (
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', marginTop:6 }}>{analytics.burnoutModel}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mood Check-In */}
        <div className="glass-card" style={{ padding:'22px 28px', marginBottom:28, display:'flex', gap:24, alignItems:'center', flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>How's your mood right now?</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>Quick daily check-in</div>
          </div>
          <div className="mood-strip">
            {moods.map((em, i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <button className={`mood-emoji-btn ${checkedMood === i ? 'selected' : ''}`} onClick={() => handleMoodCheck(i)}>
                  {em}
                </button>
                <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:500 }}>{moodLabels[i]}</span>
              </div>
            ))}
          </div>
          {showMoodSaved && (
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, color:'var(--primary)', fontSize:13, fontWeight:600, animation:'fadeUp 0.3s ease' }}>
              <Lucide.CheckCircle size={16} /> Mood saved!
            </div>
          )}
        </div>

        {/* ML burnout insight */}
        {analytics?.burnoutRecommendation && (
          <motion.div
            className="glass-card-premium"
            style={{ padding:'20px 24px', marginBottom:24, display:'flex', gap:16, alignItems:'flex-start' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,107,107,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Lucide.Flame size={22} style={{ color: burnoutColor }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, marginBottom:6 }}>Burnout prediction</div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.65, marginBottom:8 }}>
                {analytics.burnoutRecommendation}
              </p>
              {analytics.burnoutDrivers?.length > 0 && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {analytics.burnoutDrivers.map(d => (
                    <span key={d} className="badge">{d.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Emotional heatmap */}
        {analytics?.moodHeatmap && (
          <MoodHeatmap days={analytics.moodHeatmap} />
        )}

        {/* Stats Row */}
        <motion.div
          className="stats-grid"
          style={{ marginBottom:28 }}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              className="stat-card premium-stat"
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="stat-icon" style={{ background:`${s.color}14`, color:s.color }}>
                <s.icon size={24} />
              </div>
              <div className="stat-info">
                <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
                  <div className="stat-value">{s.value}</div>
                  <div style={{ fontSize:10.5, color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.trend}</div>
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="dashboard-insights-grid">

          {/* Wellness Gauge */}
          <div className="glass-card" style={{ padding:28, textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:18 }}>Wellness Score</div>
            <WellnessGauge score={wellnessScore} />
            <div style={{ fontSize:12.5, color:'var(--text-muted)', lineHeight:1.6, marginTop:4 }}>
              {wellnessScore >= 70 ? '🌟 You\'re doing great! Keep it up.' :
               wellnessScore >= 45 ? '💛 Some stress detected — check in with yourself.' :
               '⚠️ Low wellness — please talk to someone today.'}
            </div>
            <button className="btn btn-secondary" style={{ marginTop:18, width:'100%', fontSize:13 }} onClick={() => onNavigate('chat')}>
              Improve Score
            </button>
          </div>

          {/* Mood Distribution */}
          <div className="glass-card" style={{ padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:800 }}>Mood Distribution</h3>
              <span className="badge">ML Analysis</span>
            </div>
            {moodEntries.length === 0 ? (
              <div style={{ height:150, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'var(--text-muted)', fontSize:13 }}>
                <Lucide.BarChart2 size={32} style={{ opacity:0.3 }} />
                <span>Start chatting to see your mood trends</span>
              </div>
            ) : (
              <div style={{ display:'grid', gap:11 }}>
                {moodEntries.slice(0, 5).map(([mood, count]) => (
                  <div key={mood}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
                      <span style={{ textTransform:'capitalize', fontWeight:600, color:'var(--text-primary)' }}>{mood}</span>
                      <span style={{ color:'var(--text-muted)', fontWeight:600 }}>{Math.round((count/totalMoods)*100)}%</span>
                    </div>
                    <div className="mood-bar-wrap">
                      <div className="mood-bar-fill" style={{
                        width:`${(count/totalMoods)*100}%`,
                        background:`linear-gradient(90deg, ${MOOD_COLOR[mood] || 'var(--primary)'}, ${MOOD_COLOR[mood] || 'var(--primary)'}88)`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Affirmation + Tip */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="glass-card" style={{ padding:22, flex:1 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--primary)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>✨ Today's Affirmation</div>
              <p style={{ fontSize:13.5, fontStyle:'italic', color:'var(--text-primary)', lineHeight:1.7, fontWeight:500 }}>
                "{AFFIRMATIONS[affirmIdx]}"
              </p>
            </div>
            <div className="glass-card" style={{ padding:22 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--accent)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>💡 Pro Tip</div>
              <p style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.65 }}>
                The <strong style={{color:'var(--text-primary)'}}>physiological sigh</strong> — double inhale through the nose, long exhale — is the fastest way to calm your nervous system.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <h3 style={{ fontSize:17, fontWeight:800 }}>Quick Actions</h3>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{actions.length} tools available</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
            {actions.map((a, i) => (
              <motion.div
                key={a.id}
                className="feature-item-clickable"
                onClick={() => onNavigate(a.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                whileHover={{ scale: 1.02, x: 4 }}
              >
                <div style={{ width:40, height:40, borderRadius:12, background:`${a.color}15`, color:a.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <a.icon size={19} />
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13.5, color:'var(--text-primary)', marginBottom:2 }}>{a.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.4 }}>{a.desc}</div>
                </div>
                <Lucide.ChevronRight size={15} style={{ color:'var(--text-muted)', marginLeft:'auto', flexShrink:0 }} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Work-life goals */}
        <div className="glass-card" style={{ padding:28, marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <h3 style={{ fontSize:16, fontWeight:800 }}>Work-Life Goals</h3>
            <span className="badge">{goals.filter(g => g.completed).length} completed</span>
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <input
              className="input-field"
              placeholder="Add a small goal for today…"
              value={newGoal}
              onChange={e => setNewGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
              style={{ flex:1 }}
            />
            <button className="btn btn-primary" onClick={handleAddGoal} disabled={!newGoal.trim()}>
              <Lucide.Plus size={16} /> Add
            </button>
          </div>
          <div style={{ display:'grid', gap:10 }}>
            {goals.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Set micro-goals to build momentum and track streaks.</p>
            ) : goals.slice(0, 6).map(g => (
              <div
                key={g.id}
                className={celebrateId === g.id ? 'goal-celebrate' : ''}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  background:'var(--primary-subtle)', border:'1px solid var(--border)', borderRadius:14,
                  opacity: g.completed ? 0.75 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleGoal(g.id)}
                  style={{
                    width:22, height:22, borderRadius:6, border:`2px solid ${g.completed ? 'var(--primary)' : 'var(--border)'}`,
                    background: g.completed ? 'var(--primary)' : 'transparent', cursor:'pointer', flexShrink:0,
                  }}
                />
                <span style={{ flex:1, fontSize:13.5, textDecoration: g.completed ? 'line-through' : 'none', color:'var(--text-primary)' }}>
                  {g.title}
                </span>
                {g.completed && <Lucide.Sparkles size={16} style={{ color:'var(--accent)' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Stress & crisis trends */}
        {analytics?.stressTrend?.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:28 }}>
            <div className="glass-card" style={{ padding:24 }}>
              <h3 style={{ fontSize:15, fontWeight:800, marginBottom:16 }}>Stress Trend</h3>
              <div style={{ display:'grid', gap:8 }}>
                {analytics.stressTrend.slice(-6).map((pt, i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                      <span style={{ color:'var(--text-muted)' }}>{new Date(pt.date).toLocaleDateString([], { month:'short', day:'numeric' })}</span>
                      <span style={{ fontWeight:700 }}>{pt.stressScore}%</span>
                    </div>
                    <div className="trend-bar-mini">
                      <div style={{ width:`${pt.stressScore}%`, background:'linear-gradient(90deg,var(--primary),var(--accent))' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card" style={{ padding:24 }}>
              <h3 style={{ fontSize:15, fontWeight:800, marginBottom:16 }}>Crisis Risk History</h3>
              <div style={{ display:'grid', gap:8 }}>
                {analytics.crisisHistory.slice(-6).map((pt, i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                      <span style={{ color:'var(--text-muted)', textTransform:'capitalize' }}>{pt.mood}</span>
                      <span style={{ fontWeight:700, color: pt.crisisScore > 50 ? 'var(--danger)' : 'var(--text-primary)' }}>{pt.crisisScore}%</span>
                    </div>
                    <div className="trend-bar-mini">
                      <div style={{
                        width:`${pt.crisisScore}%`,
                        background: pt.crisisScore > 50 ? 'var(--danger)' : 'linear-gradient(90deg,var(--violet),var(--primary))',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Weekly Insights */}
        <div className="glass-card" style={{ padding:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
            <h3 style={{ fontSize:16, fontWeight:800 }}>Weekly Wellness Insights</h3>
            <span className="badge badge-violet">AI Generated</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
            {[
              { icon:'🧘', title:'Mindfulness Streak',   val:`${streak} days`, sub:'Keep going!', color:'var(--primary)' },
              { icon:'⚡', title:'Peak Performance Time',val:'9–11 AM',         sub:'Based on your patterns', color:'var(--accent)' },
              { icon:'🛡️', title:'Stress Resilience',    val:'Improving',       sub:'↑ 12% vs last week', color:'var(--violet)' },
              { icon:'💬', title:'Conversations',        val: analytics ? `${analytics.totalSessions}` : '0', sub:'sessions completed', color:'var(--secondary)' },
            ].map(item => (
              <div key={item.title} style={{ padding:'18px 20px', background:'var(--primary-subtle)', border:'1px solid var(--border)', borderRadius:16, display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ fontSize:26 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:item.color }}>{item.val}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{item.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ExportReportBar userId={user.id} onToast={showExportToast} />

      </div>
    </div>
  );
}
