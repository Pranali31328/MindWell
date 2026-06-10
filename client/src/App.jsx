import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import Auth from './components/Auth.jsx';
import Onboarding from './components/Onboarding.jsx';
import Dashboard from './components/Dashboard.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import WellnessHub from './components/WellnessHub.jsx';
import AppShell from './components/AppShell.jsx';
import PageHeader from './components/PageHeader.jsx';
import { PAGE_TITLES } from './config/navItems.js';
import { journalAPI, mlAPI } from './api.js';

const SHELL_PAGES = new Set(['dashboard', 'chat', 'resources', 'journal', 'breathing', 'burnout', 'timer']);


// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const features = [
    { icon: Lucide.BrainCircuit,   text: 'Python ML Sentiment Engine' },
    { icon: Lucide.Keyboard,       text: 'Real-time Typing Behaviour Analysis' },
    { icon: Lucide.AlertTriangle,  text: 'Proactive Crisis Risk Prediction' },
    { icon: Lucide.Smile,          text: 'Personalised Therapy Styles' },
    { icon: Lucide.Moon,           text: 'Intelligent Loneliness Detection' },
    { icon: Lucide.BarChart2,      text: 'Visual Emotional Analytics' },
    { icon: Lucide.Users,          text: 'Conflict Resolution Assistant' },
    { icon: Lucide.Target,         text: 'Micro-Wins Motivation System' },
    { icon: Lucide.ShieldCheck,    text: 'Trauma-Safe Content Filtering' },
    { icon: Lucide.Wind,           text: 'Emergency Calm Interventions' },
  ];
  useEffect(() => {
    const t = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(t); return 100; } return p + 1; }), 26);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-logo"><Lucide.BrainCircuit size={52} /></div>
        <h1 className="loading-title">MindWell AI</h1>
        <p className="loading-subtitle">
          AI-Powered Mental Health Companion for Working Professionals<br />
          <span style={{ fontSize:12, opacity:0.65 }}>Revolutionising Workplace Well-being through Emotion-Aware AI</span>
        </p>
        <div className="feature-grid">
          {features.map(({ icon: Icon, text }, i) => (
            <div key={i} className="feature-item" style={{ animationDelay:`${i*0.07}s` }}>
              <div className="feature-icon"><Icon size={16} /></div>
              <div className="feature-text">{text}</div>
            </div>
          ))}
        </div>
        <div className="loading-progress">
          <div className="progress-bar" style={{ width:`${progress}%` }} />
        </div>
        <div style={{ marginTop:20, opacity:0.55, fontSize:12, lineHeight:1.9 }}>
          <div>Team: Sneha Dhole · Pranali Pawar · Sanika More · Samruddhi Patil</div>
          <div>Guide: Mr. Sandeep Pande · Academic Year 2025–26</div>
        </div>
      </div>
    </div>
  );
}

// ── Journal ───────────────────────────────────────────────────────────────────
function Journal({ user, onNavigate }) {
  const [entry, setEntry] = useState('');
  const [mood, setMood]   = useState(null);
  const [tags, setTags]   = useState([]);
  const [saved, setSaved] = useState([]);
  const TAG_OPTIONS = ['Work','Personal','Grateful','Anxious','Proud','Tired','Hopeful','Frustrated'];
  const MOODS = ['😊','😌','😐','😟','😤','😔'];
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [copingTip, setCopingTip] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    journalAPI.list(user.id).then(rows => {
      setSaved(rows.map(r => ({
        id: r.id,
        date: new Date(r.createdAt).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }),
        mood: r.mood || '😐',
        tag: (r.tags && r.tags[0]) || 'Reflection',
        text: r.text,
        analysis: r.analysis,
        copingTip: r.copingTip,
      })));
    }).catch(() => {});
  }, [user?.id]);

  const handleSave = async () => {
    if (!entry.trim() || !user?.id) return;
    const payload = {
      text: entry,
      mood: mood || '😐',
      tags,
      analysis: analysis || null,
      copingTip: copingTip || null,
    };
    try {
      const row = await journalAPI.create(user.id, payload);
      setSaved([{
        id: row.id,
        date: new Date(row.createdAt).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }),
        mood: row.mood || '😐',
        tag: tags[0] || 'Reflection',
        text: row.text,
        analysis: row.analysis,
        copingTip: row.copingTip,
      }, ...saved]);
    } catch {
      setSaved([{
        date: new Date().toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }),
        mood: mood || '😐',
        tag: tags[0] || 'Reflection',
        text: entry,
        analysis,
        copingTip,
      }, ...saved]);
    }
    setEntry(''); setMood(null); setTags([]);
    setAnalysis(null);
    setCopingTip('');
  };

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t]);

  const handleAnalyze = async () => {
    if (!entry.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    setCopingTip('');
    try {
      const data = await mlAPI.analyze(entry);
      // Best-effort shaping: the Python ML result may differ.
      const stressLevel = data?.stress_level || data?.stressLevel;
      const mood = data?.mood || data?.currentMood;
      setAnalysis({ mood, stressLevel, sentiment: data?.sentiment, crisisRisk: data?.crisis_risk ?? data?.crisisRisk, stressScore: data?.stress_score ?? data?.stressScore, wellnessScore: data?.wellness_score ?? data?.wellnessScore, compound: data?.compound });
      // Generate a simple coping tip from available signals.
      const tip = data?.needs_intervention
        ? 'You deserve immediate support. If you feel unsafe, contact a crisis helpline right now and reach out to someone you trust.'
        : stressLevel === 'high' || (data?.crisis_risk ?? 0) > 50
          ? 'Try a 60-second physiological reset: inhale normally, take a short second inhale at the top, then exhale slowly for longer. Repeat once.'
          : stressLevel === 'medium'
            ? 'Pick one small next step you can complete in 10 minutes, then start a short timer. Momentum reduces uncertainty.'
            : 'Reinforce what is going well: write one sentence about a strength you used today and how you can reuse it tomorrow.';
      setCopingTip(tip);
    } catch {
      setAnalysis({ mood: 'neutral', stressLevel: 'low', sentiment: 'neutral', crisisRisk: 20, stressScore: 20, wellnessScore: 75, compound: 0 });
      setCopingTip('Start with one gentle action: take 3 slow breaths and write one sentence about what you need most right now.');
    } finally {
      setAnalyzing(false);
    }
  };

  const meta = PAGE_TITLES.journal;

  return (
    <div className="journal-page">
      <div className="page-content page-content--narrow">
        <PageHeader title={meta.title} subtitle={meta.subtitle} />
        <div className="journal-layout">
        {/* Write */}
        <div className="glass-card" style={{ padding:28 }}>
          <h3 style={{ fontSize:16, fontWeight:800, marginBottom:18 }}>What's on your mind?</h3>

          {/* Mood */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>How are you feeling?</div>
            <div className="mood-picker">
              {MOODS.map(m => (
                <button key={m} className={`mood-pick-btn ${mood===m?'selected':''}`} onClick={() => setMood(m)}>{m}</button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Tags</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {TAG_OPTIONS.map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                  style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s',
                    background: tags.includes(t) ? 'rgba(0,229,195,0.15)' : 'var(--primary-subtle)',
                    border: tags.includes(t) ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    color: tags.includes(t) ? 'var(--primary)' : 'var(--text-muted)',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <textarea
            className="input-field"
            value={entry}
            onChange={e => setEntry(e.target.value)}
            placeholder="Write freely… This space is entirely yours. No judgment, no limits."
            style={{ minHeight:200, resize:'none', marginBottom:18, lineHeight:1.7 }}
          />

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>{entry.length} characters</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={handleAnalyze}
                disabled={!entry.trim() || analyzing}
                style={{ fontWeight:800 }}
              >
                <Lucide.Search size={15} /> {analyzing ? 'Analyzing…' : 'Analyze reflection'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!entry.trim()}>
                <Lucide.Save size={15} /> Save Reflection
              </button>
            </div>
          </div>

          {analysis && (
            <div style={{ marginTop:18, display:'grid', gap:12 }}>
              <div className="glass-card" style={{ padding:18, background:'rgba(0,229,195,0.06)', borderColor:'rgba(0,229,195,0.22)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--primary)', marginBottom:6 }}>
                      Emotion Breakdown
                    </div>
                    <div style={{ fontSize:18, fontWeight:900, color:'var(--text-primary)', textTransform:'capitalize' }}>
                      {analysis.mood || 'Neutral'}
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:6, lineHeight:1.6 }}>
                      Stress: <strong style={{ color:'var(--text-primary)' }}>{analysis.stressLevel || 'low'}</strong>
                      {' '}· Sentiment: <strong style={{ color:'var(--text-primary)' }}>{analysis.sentiment || 'neutral'}</strong>
                      {' '}· Crisis Risk: <strong style={{ color:'var(--text-primary)' }}>{Math.round(analysis.crisisRisk ?? 20)}%</strong>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span className="badge" style={{ fontSize:10.5 }}>
                      Wellness {Math.round(analysis.wellnessScore ?? 75)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding:18, background:'rgba(167,139,250,0.06)', borderColor:'rgba(167,139,250,0.22)' }}>
                <div style={{ fontSize:12, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--violet)', marginBottom:6 }}>
                  Daily Coping Tip
                </div>
                <div style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75 }}>
                  {copingTip}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* History */}
        <div>
          <h3 style={{ fontSize:16, fontWeight:800, marginBottom:16 }}>Previous Reflections</h3>
          <div style={{ display:'grid', gap:14 }}>
            {saved.map((e, i) => (
              <div key={e.id || `j-${i}`} className="glass-card" style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <span style={{ fontSize:22 }}>{e.mood}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{e.date}</div>
                      <span className="badge" style={{ fontSize:10, marginTop:3 }}>{e.tag}</span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, overflow:'hidden', display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2 }}>{e.text}</p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ── Breathing Exercise ────────────────────────────────────────────────────────
const BREATH_MODES = {
  '478': {
    label: '4-7-8 Calm',
    desc: 'Clinically used to reduce anxiety quickly',
    phases: [
      { key:'inhale', label:'Inhale', duration:4, target:1.35, color:'#00e5c3', sub:'Breathe in slowly through your nose' },
      { key:'hold1',  label:'Hold',   duration:7, target:1.35, color:'#a78bfa', sub:'Hold gently — no tension' },
      { key:'exhale', label:'Exhale', duration:8, target:0.85, color:'#ffd166', sub:'Exhale fully through your mouth' },
    ],
  },
  box: {
    label: 'Box Breathing',
    desc: 'Navy SEAL technique for focus under pressure',
    phases: [
      { key:'inhale', label:'Inhale', duration:4, target:1.35, color:'#00e5c3', sub:'Inhale 4 counts' },
      { key:'hold1',  label:'Hold',   duration:4, target:1.35, color:'#a78bfa', sub:'Hold 4 counts' },
      { key:'exhale', label:'Exhale', duration:4, target:0.85, color:'#ffd166', sub:'Exhale 4 counts' },
      { key:'hold2',  label:'Hold',   duration:4, target:0.85, color:'#ff6b6b', sub:'Hold empty 4 counts' },
    ],
  },
  equal: {
    label: 'Equal Breathing',
    desc: 'Balanced inhale/exhale for steady calm',
    phases: [
      { key:'inhale', label:'Inhale', duration:5, target:1.3, color:'#00e5c3', sub:'Smooth steady inhale' },
      { key:'exhale', label:'Exhale', duration:5, target:0.88, color:'#ffd166', sub:'Smooth steady exhale' },
    ],
  },
};

function BreathingExercise({ onNavigate }) {
  const [modeKey, setModeKey]   = useState('478');
  const [phase, setPhase]       = useState('ready');
  const [count, setCount]       = useState(0);
  const [cycles, setCycles]     = useState(0);
  const [scale, setScale]       = useState(1);
  const [running, setRunning]   = useState(false);
  const timerRef = useRef(null);

  const mode = BREATH_MODES[modeKey];
  const PHASES = mode.phases;

  const start = () => {
    setRunning(true);
    setPhase('inhale');
    setCount(4);
    setCycles(0);
    setScale(PHASES[0].target);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    setRunning(false); setPhase('ready'); setCount(0); setScale(1);
  };

  const switchMode = (key) => {
    stop();
    setModeKey(key);
    setCycles(0);
  };

  useEffect(() => {
    if (!running) return;
    const idx = PHASES.findIndex(p => p.key === phase);
    if (idx === -1) return;
    const dur = PHASES[idx].duration;
    setCount(dur);
    setScale(PHASES[idx].target);
    timerRef.current = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          const nextIdx = (idx + 1) % PHASES.length;
          const next = PHASES[nextIdx];
          if (nextIdx === 0) setCycles(cy => cy + 1);
          setPhase(next.key);
          setCount(next.duration);
          setScale(next.target);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, running, modeKey]);

  const current = PHASES.find(p => p.key === phase) || PHASES[0];

  const meta = PAGE_TITLES.breathing;

  return (
    <div className="breathing-page">
      <div className="page-content">
        <PageHeader title={meta.title} subtitle={meta.subtitle} />
      <div style={{ textAlign:'center', padding:'8px 24px 32px' }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-primary)', marginBottom:6 }}>{mode.label}</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>{mode.desc}</p>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
            {Object.entries(BREATH_MODES).map(([k, m]) => (
              <button key={k} onClick={() => switchMode(k)} className="btn"
                style={{
                  padding:'8px 16px', fontSize:12, fontWeight:700,
                  background: modeKey === k ? 'rgba(0,229,195,0.15)' : 'var(--primary-subtle)',
                  border: modeKey === k ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: modeKey === k ? 'var(--primary)' : 'var(--text-muted)',
                }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Breathing circle */}
        <div className="breathing-ring-outer" style={{ width:280, height:280, margin:'0 auto 32px' }}>
          {/* Outer rings */}
          {[260, 240, 220].map((s, i) => (
            <div key={i} className="breathing-ring"
              style={{ width:s, height:s, opacity:0.08 - i*0.02, transform:`scale(${scale})`, transition:`transform ${phase==='inhale'?4:phase==='exhale'?8:0.5}s ease-in-out` }} />
          ))}
          {/* Main circle */}
          <div className="breathing-circle" style={{
            transform:`scale(${scale})`,
            transition:`transform ${phase==='inhale'?4:phase==='exhale'?8:0.5}s ease-in-out`,
            borderColor: running ? current.color : 'var(--primary)',
            boxShadow:`0 0 80px ${running ? current.color : 'var(--primary)'}40, inset 0 0 40px ${running ? current.color : 'var(--primary)'}10`,
          }}>
            {phase === 'ready' ? (
              <>
                <Lucide.Wind size={36} color="var(--primary)" />
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>Press Start</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:48, fontWeight:900, color:current.color, lineHeight:1, fontFamily:'Space Grotesk' }}>{count}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:4 }}>{current.label}</div>
              </>
            )}
          </div>
        </div>

        {running && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, color:'var(--text-secondary)', fontStyle:'italic', marginBottom:8 }}>{current.sub}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>Cycle {cycles + 1}</div>
          </div>
        )}

        <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
          {!running ? (
            <button className="btn btn-primary" onClick={start} style={{ fontSize:16, padding:'14px 36px' }}>
              <Lucide.Play size={18} /> Start Breathing
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stop} style={{ fontSize:16, padding:'14px 36px' }}>
              <Lucide.Square size={18} /> Stop
            </button>
          )}
        </div>

        <div style={{ marginTop:36, display:'grid', gridTemplateColumns:`repeat(${Math.min(PHASES.length, 4)},1fr)`, gap:12, maxWidth:520, margin:'36px auto 0' }}>
          {PHASES.map(p => (
            <div key={p.key} style={{ padding:'12px 16px', background:'var(--primary-subtle)', border:`1px solid ${p.color}30`, borderRadius:14, textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:p.color }}>{p.duration}s</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Burnout Assessment ────────────────────────────────────────────────────────
const BURNOUT_QUESTIONS = [
  { q:'How often do you feel emotionally exhausted from your work?',           opts:['Never','Rarely','Sometimes','Often','Always'], w:[0,1,2,3,4] },
  { q:'Do you feel detached or cynical about your job?',                       opts:['Not at all','Slightly','Moderately','Quite a bit','Extremely'], w:[0,1,2,3,4] },
  { q:'How often do you struggle to concentrate at work?',                     opts:['Never','Rarely','Sometimes','Often','Always'], w:[0,1,2,3,4] },
  { q:'Do you feel your work achievements are valued?',                        opts:['Always','Often','Sometimes','Rarely','Never'], w:[0,1,2,3,4] },
  { q:'How often do you feel physically drained after a workday?',             opts:['Never','Rarely','Sometimes','Often','Always'], w:[0,1,2,3,4] },
  { q:'Do you find it hard to switch off from work during evenings/weekends?', opts:['Never','Rarely','Sometimes','Often','Always'], w:[0,1,2,3,4] },
  { q:'How often do you experience Sunday evening dread?',                     opts:['Never','Rarely','Sometimes','Often','Every week'], w:[0,1,2,3,4] },
  { q:'Do you feel your skills and efforts are under-utilised?',               opts:['Never','Rarely','Sometimes','Often','Always'], w:[0,1,2,3,4] },
];

function BurnoutTest({ onNavigate }) {
  const [answers, setAnswers]   = useState({});
  const [submitted, setSubmit]  = useState(false);

  const answer = (qi, oi) => setAnswers(prev => ({ ...prev, [qi]: oi }));
  const score = Object.entries(answers).reduce((s, [qi, oi]) => s + BURNOUT_QUESTIONS[qi].w[oi], 0);
  const maxScore = BURNOUT_QUESTIONS.length * 4;
  const pct = Math.round((score / maxScore) * 100);

  const risk = pct < 25 ? { label:'Low Risk',      color:'#00e5c3', emoji:'🌿', desc:'You appear to be managing well. Keep up your healthy habits and continue checking in regularly.' }
             : pct < 50 ? { label:'Moderate Risk',  color:'#ffd166', emoji:'⚡', desc:'Some burnout indicators are present. Consider reviewing your workload and making time for recovery.' }
             : pct < 75 ? { label:'High Risk',       color:'#ff8c42', emoji:'🔥', desc:'Significant burnout signals detected. Please talk to someone — a manager, counsellor, or trusted colleague.' }
             :             { label:'Critical Risk',   color:'#ff6b6b', emoji:'🆘', desc:'Severe burnout indicators. Please seek professional support immediately. You deserve help right now.' };

  const allAnswered = Object.keys(answers).length === BURNOUT_QUESTIONS.length;

  const meta = PAGE_TITLES.burnout;

  return (
    <div className="burnout-page">
      <div className="page-content page-content--narrow">
        <PageHeader title={meta.title} subtitle="Based on the Maslach Burnout Inventory framework" />
        <div style={{ maxWidth:800, margin:'0 auto' }}>
        {!submitted ? (
          <>
            <div style={{ marginBottom:28, padding:'18px 22px', background:'var(--primary-subtle)', border:'1px solid var(--border)', borderRadius:16, fontSize:13.5, color:'var(--text-secondary)', lineHeight:1.65 }}>
              📋 Answer {BURNOUT_QUESTIONS.length} questions honestly. Your responses are private and only used to generate your personal risk assessment.
            </div>
            {BURNOUT_QUESTIONS.map((item, qi) => (
              <div key={qi} className="burnout-question" style={{ animationDelay:`${qi*0.06}s` }}>
                <h4>{qi + 1}. {item.q}</h4>
                <div className="burnout-options">
                  {item.opts.map((opt, oi) => (
                    <button key={oi} className={`burnout-option ${answers[qi] === oi ? 'selected' : ''}`} onClick={() => answer(qi, oi)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ marginTop:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>{Object.keys(answers).length} / {BURNOUT_QUESTIONS.length} answered</div>
              <button className="btn btn-primary" onClick={() => setSubmit(true)} disabled={!allAnswered}>
                <Lucide.BarChart2 size={16} /> View My Results
              </button>
            </div>
          </>
        ) : (
          <div style={{ animation:'scaleIn 0.4s ease both' }}>
            <div className="glass-card" style={{ padding:40, textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:56, marginBottom:16 }}>{risk.emoji}</div>
              <h2 style={{ fontSize:28, fontWeight:900, color:risk.color, marginBottom:8 }}>{risk.label}</h2>
              <div style={{ fontSize:48, fontWeight:900, color:risk.color, marginBottom:12, fontFamily:'Space Grotesk' }}>{pct}%</div>
              <div style={{ width:200, height:8, background:'var(--border)', borderRadius:6, margin:'0 auto 20px', overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,#00e5c3,${risk.color})`, borderRadius:6, transition:'width 1.2s ease' }} />
              </div>
              <p style={{ fontSize:15, color:'var(--text-secondary)', maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>{risk.desc}</p>
            </div>
            <div style={{ display:'grid', gap:14, marginBottom:24 }}>
              {[
                { icon:'💬', title:'Talk to AI Companion', desc:'Process your feelings in a safe, private conversation', action:'chat' },
                { icon:'🌊', title:'Breathing Exercise',   desc:'Immediate physiological relief from stress & anxiety', action:'breathing' },
                { icon:'📚', title:'Burnout Recovery Guide',desc:'Evidence-based strategies to rebuild your well-being', action:'resources' },
              ].map(item => (
                <div key={item.title} className="feature-item-clickable" onClick={() => onNavigate(item.action)}>
                  <div style={{ fontSize:26 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{item.title}</div>
                    <div style={{ fontSize:12.5, color:'var(--text-secondary)', marginTop:2 }}>{item.desc}</div>
                  </div>
                  <Lucide.ArrowRight size={16} style={{ color:'var(--text-muted)', marginLeft:'auto' }} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('chat')}><Lucide.MessageCircle size={16} /> Talk to AI Now</button>
              <button className="btn btn-secondary" onClick={() => { setAnswers({}); setSubmit(false); }}>Retake Assessment</button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ── Focus Timer (Pomodoro) ────────────────────────────────────────────────────
function FocusTimer({ onNavigate }) {
  const [mode, setMode]         = useState('focus'); // focus | short | long
  const [running, setRunning]   = useState(false);
  const [seconds, setSeconds]   = useState(25 * 60);
  const [sessions, setSessions] = useState(0);
  const timerRef = useRef(null);

  const MODES = {
    focus: { label:'Focus',       secs:25*60, color:'var(--primary)' },
    short: { label:'Short Break', secs:5*60,  color:'var(--accent)' },
    long:  { label:'Long Break',  secs:15*60, color:'var(--violet)' },
  };

  const toggleRun = () => {
    if (running) { clearInterval(timerRef.current); setRunning(false); }
    else {
      setRunning(true);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            setRunning(false);
            if (mode === 'focus') setSessions(n => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
  };

  const reset = () => { clearInterval(timerRef.current); setRunning(false); setSeconds(MODES[mode].secs); };
  const switchMode = (m) => { clearInterval(timerRef.current); setRunning(false); setMode(m); setSeconds(MODES[m].secs); };

  useEffect(() => { setSeconds(MODES[mode].secs); }, []);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const total = MODES[mode].secs;
  const pct = ((total - seconds) / total) * 100;
  const c   = 2 * Math.PI * 100;

  const breathPhase = running ? (seconds % 8 < 4 ? 'inhale' : 'exhale') : 'idle';

  const meta = PAGE_TITLES.timer;

  return (
    <div className="focus-mode-page">
      <div className="page-content">
        <PageHeader
          title={meta.title}
          subtitle={meta.subtitle}
          actions={
            <span className="badge" style={{ padding:'8px 14px', fontSize:13 }}>
              <Lucide.Trophy size={14} style={{ marginRight:6, verticalAlign:'middle' }} />
              {sessions} sessions today
            </span>
          }
        />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 32px 48px' }}>
        <div style={{ textAlign:'center', maxWidth:480 }}>
          {/* Mode switcher */}
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:48 }}>
            {Object.entries(MODES).map(([k, v]) => (
              <button key={k} onClick={() => switchMode(k)}
                style={{ padding:'9px 22px', borderRadius:30, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s',
                  background: mode===k ? 'rgba(0,229,195,0.15)' : 'var(--primary-subtle)',
                  border: mode===k ? '2px solid var(--primary)' : '2px solid var(--border)',
                  color: mode===k ? 'var(--primary)' : 'var(--text-muted)',
                }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Ring + breathing halo */}
          <div style={{ position:'relative', width:250, height:250, margin:'0 auto 40px' }}>
            {(running || mode !== 'focus') && (
              <div
                className="focus-breath-ring"
                style={{
                  animationDuration: mode === 'focus' ? '6s' : '4s',
                  borderColor: mode === 'focus' ? 'rgba(0,229,195,0.25)' : 'rgba(255,209,102,0.3)',
                }}
              />
            )}
            {running && (
              <div style={{
                position:'absolute', bottom:-36, left:'50%', transform:'translateX(-50%)',
                fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
                color:'var(--text-muted)',
              }}>
                {breathPhase === 'inhale' ? 'Breathe in…' : 'Breathe out…'}
              </div>
            )}
            <svg width="250" height="250" viewBox="0 0 250 250">
              <circle cx="125" cy="125" r="100" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="125" cy="125" r="100" fill="none"
                stroke={MODES[mode].color} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - (pct/100)*c}
                transform="rotate(-90 125 125)"
                style={{ transition:'stroke-dashoffset 0.9s ease' }}
              />
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div className="timer-display" style={{ color:MODES[mode].color }}>{mins}:{secs}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>{MODES[mode].label}</div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
            <button className="btn btn-secondary" onClick={reset} style={{ padding:'13px 24px' }}>
              <Lucide.RotateCcw size={17} /> Reset
            </button>
            <button className="btn btn-primary" onClick={toggleRun} style={{ padding:'13px 36px', fontSize:16 }}>
              {running ? <><Lucide.Pause size={18} /> Pause</> : <><Lucide.Play size={18} /> {seconds===MODES[mode].secs?'Start':'Resume'}</>}
            </button>
          </div>

          <div style={{ marginTop:36, padding:'18px 24px', background:'var(--primary-subtle)', border:'1px solid var(--border)', borderRadius:16, fontSize:13.5, color:'var(--text-secondary)', lineHeight:1.6 }}>
            💡 Work for 25 min, take a 5 min break. After 4 sessions, take a 15 min long break. This is the Pomodoro Technique.
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Sanctuary ─────────────────────────────────────────────────────────────────
function Sanctuary({ onClose }) {
  const [phase, setPhase] = useState(0);
  const PHASES = ['Inhale…', 'Hold…', 'Exhale…', 'Hold…'];
  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 4), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="sanctuary-overlay">
      <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--primary)', marginBottom:8 }}>Emergency Calm Mode</div>
      <div style={{ width:220, height:220, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(0,229,195,0.2) 0%, rgba(0,229,195,0.05) 50%, transparent 100%)',
        border:'2px solid rgba(0,229,195,0.4)',
        boxShadow:'0 0 80px rgba(0,229,195,0.2)',
        animation:'deepBreathe 8s ease-in-out infinite',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Lucide.Wind size={52} color="var(--primary)" />
      </div>
      <div style={{ color:'var(--text-primary)', textAlign:'center', fontSize:26, fontWeight:800, maxWidth:520, lineHeight:1.4, fontFamily:'Space Grotesk' }}>
        {PHASES[phase]}
      </div>
      <p style={{ color:'var(--text-secondary)', fontSize:16, textAlign:'center', maxWidth:440, lineHeight:1.7 }}>
        Inhale peace. Exhale pressure. You are enough exactly as you are right now.
      </p>
      <button className="btn" style={{ background:'rgba(0,229,195,0.12)', color:'var(--primary)', border:'1px solid rgba(0,229,195,0.3)', fontSize:15 }} onClick={onClose}>
        <Lucide.ArrowLeft size={17} /> Return to Dashboard
      </button>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]     = useState('loading');
  const [loaded, setLoaded] = useState(false);
  const [user, setUser]     = useState(null);
  const [theme, setTheme]   = useState(() => localStorage.getItem('mw_theme') || 'dark');

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('mw_theme', theme);
  }, [theme]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoaded(true);
      const saved = localStorage.getItem('mw_user');
      if (saved) {
        const u = JSON.parse(saved);
        setUser(u);
        setPage(u.onboardingComplete ? 'dashboard' : 'onboarding');
      } else {
        setPage('auth');
      }
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  const handleAuthSuccess    = u => { setUser(u); setPage(u.onboardingComplete ? 'dashboard' : 'onboarding'); };
  const handleOnboardingDone = u => { setUser(u); setPage('dashboard'); };
  const handleLogout         = () => { localStorage.removeItem('mw_user'); setUser(null); setPage('auth'); };
  const toggleTheme          = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  if (!loaded) return <LoadingScreen />;

  const backgroundOrbs = (
    <>
      <div style={{ position:'fixed', top:'-8%', left:'-6%', width:'36%', height:'36%', background:'radial-gradient(circle, rgba(0,229,195,0.06) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'10%', right:'-4%', width:'30%', height:'30%', background:'radial-gradient(circle, rgba(255,107,107,0.04) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'50%', height:'50%', background:'radial-gradient(circle, rgba(167,139,250,0.02) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />
    </>
  );

  const renderPage = () => {
    switch (page) {
      case 'auth':       return <Auth onAuthSuccess={handleAuthSuccess} />;
      case 'onboarding': return <Onboarding user={user} onComplete={handleOnboardingDone} />;
      case 'dashboard':  return <Dashboard user={user} onNavigate={setPage} />;
      case 'chat':       return <ChatInterface user={user} onNavigate={setPage} theme={theme} toggleTheme={toggleTheme} />;
      case 'resources':  return <WellnessHub onNavigate={setPage} />;
      case 'journal':    return <Journal user={user} onNavigate={setPage} />;
      case 'breathing':  return <BreathingExercise onNavigate={setPage} />;
      case 'burnout':    return <BurnoutTest onNavigate={setPage} />;
      case 'timer':      return <FocusTimer onNavigate={setPage} />;
      case 'sanctuary':  return <Sanctuary onClose={() => setPage('dashboard')} />;
      default:           return <Dashboard user={user} onNavigate={setPage} />;
    }
  };

  if (page === 'auth' || page === 'onboarding') {
    return (
      <div style={{ position:'relative', minHeight:'100vh', zIndex:1 }}>
        {backgroundOrbs}
        {renderPage()}
      </div>
    );
  }

  if (page === 'sanctuary') {
    return (
      <div style={{ position:'relative', minHeight:'100vh', zIndex:1 }}>
        {renderPage()}
      </div>
    );
  }

  if (SHELL_PAGES.has(page)) {
    return (
      <div style={{ position:'relative', minHeight:'100vh', zIndex:1 }}>
        {backgroundOrbs}
        <AppShell
          page={page}
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          onNavigate={setPage}
          onLogout={handleLogout}
          variant={page === 'chat' ? 'chat' : 'default'}
        >
          {renderPage()}
        </AppShell>
      </div>
    );
  }

  return (
    <div style={{ position:'relative', minHeight:'100vh', zIndex:1 }}>
      {backgroundOrbs}
      {renderPage()}
    </div>
  );
}
