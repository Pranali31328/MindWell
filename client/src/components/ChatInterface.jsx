import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { chatAPI, checkServerHealth, memoryAPI } from '../api.js';
import { useVoice } from '../hooks/useVoice.js';
import { useTypingEmotion } from '../hooks/useTypingEmotion.js';
import { useVoiceEmotion } from '../hooks/useVoiceEmotion.js';
import { useAudioProsody } from '../hooks/useAudioProsody.js';
import EmotionalOrb from './EmotionalOrb.jsx';
import ConversationMemoryPanel from './ConversationMemoryPanel.jsx';

const MOOD_COLOR = {
  happy:'#00e5c3', calm:'#a78bfa', neutral:'#6b7280',
  anxious:'#ffd166', overwhelmed:'#ff6b6b', distressed:'#ff4444', crisis:'#b91c1c'
};
// ── Offline AI ────────────────────────────────────────────────────────────────
const PERSONA = {
  emotional: {
    overwhelmed: [
      "It sounds like you're carrying a really heavy load right now. That's completely valid — you don't have to have it all together. What feels most draining?",
      "You're doing more than you probably give yourself credit for. Overwhelm often comes from caring deeply. What's the one thing that feels most urgent right now?",
    ],
    anxious: [
      "Anxiety is your mind's way of trying to protect you — it just doesn't always get the timing right. Would a quick breathing exercise help before we talk through what's happening?",
      "That anxious feeling is real and it's valid. You don't have to push it away. Can you tell me more about what's triggering it today?",
    ],
    distressed: [
      "I hear you, and I want you to know your feelings are real and they matter. You don't have to go through this alone — I'm right here.",
      "What you're feeling makes complete sense. Sometimes naming it out loud helps. Can you tell me a bit more about what's going on?",
    ],
    happy: [
      "That warmth you're feeling? Hold onto it 💛 What's been the highlight of your day so far?",
      "Love that positive energy! What's contributing to you feeling this way today? Let's anchor it.",
    ],
    calm: [
      "There's something beautiful about a calm moment at work. What are you feeling grateful for today?",
      "A settled mind is such a gift — especially as a professional. Is there anything you'd like to explore or work through?",
    ],
    neutral: [
      "How are you really feeling beneath the surface? This is a safe space — no right or wrong answer.",
      "I'm here and fully present for you. What's been on your mind most today?",
    ],
  },
  analytical: {
    overwhelmed: ["Let's break this down systematically. Take a breath and identify the single most critical item on your plate right now — just one. What is it?"],
    anxious: ["Anxiety often comes from uncertainty. Let's map out what you know vs. what you don't, so we can create a clear action plan. What's the primary unknown?"],
    distressed: ["I can see you're under significant pressure. Can we identify the root cause together? Sometimes naming the exact problem reduces its power considerably."],
    happy: ["Great to hear you're doing well! Data shows positive emotional states are great for creative thinking. Would you like to set a goal to capitalize on this momentum?"],
    calm: ["You're in a good mental state — a great time to reflect or plan strategically. Is there anything you'd like to work through today?"],
    neutral: ["I'm here to listen and help you process. What's been occupying most of your cognitive bandwidth lately?"],
  },
  creative: {
    overwhelmed: ["When everything feels tangled, a creative reset can help untangle it. If your stress were a color right now, what would it be and why?"],
    anxious: ["Anxiety can sometimes be redirected into creative energy. What's one thing you've been putting off that you actually enjoy doing?"],
    distressed: ["Your feelings are valid. Sometimes writing them out — even just a few words — can create just enough distance to breathe. Want to try that together?"],
    happy: ["Love that energy! What creative project or idea has been quietly exciting you lately?"],
    calm: ["A calm mind is fertile creative ground. What idea or dream have you been gently nurturing?"],
    neutral: ["What's been stirring in your imagination lately — anything you've been curious or quietly excited about?"],
  },
  focused: {
    overwhelmed: ["Let's triage. What are the top 3 things you need to handle? We'll tackle them one at a time — no multitasking allowed."],
    anxious: ["Anxiety clouds focus. Let's do a 2-minute reset: 5 deep breaths, then we'll build your priority list for the day. Sound good?"],
    distressed: ["You're in a tough spot, but you've handled hard things before. What's the very first small step you can take right now?"],
    happy: ["Excellent! Momentum is powerful. What's the most important goal you're working towards this week?"],
    calm: ["Solid state of mind. Let's use this well — what's your top priority for today?"],
    neutral: ["Ready to make progress? What's the one thing that, if done today, would make you feel most accomplished?"],
  },
};

function getOfflineAI(text, personality = 'emotional') {
  const lower = text.toLowerCase();

  // Crisis detection
  if (/\b(suicide|kill myself|want to die|end it all|hurt myself|no point|hopeless|not worth living)\b/i.test(lower)) {
    return {
      text: "I'm very concerned about what you've shared, and I'm genuinely glad you're talking to me. Please reach out to a crisis helpline right now — iCall: 9152987821 | Vandrevala Foundation: 1860-2662-345. You are not alone, and support is available immediately. Can you tell me you're safe?",
      analysis: { mood:'crisis', stress_level:'critical', stress_score:90, wellness_score:15, crisis_risk:92, sentiment:'negative', compound:-0.95, workplace_flags:[], loneliness_flag:false, needs_intervention:true },
      isMicroWin: false,
    };
  }

  // Micro-win detection
  const microWinKw = ['finished','completed','done','achieved','submitted','solved','fixed','delivered','won','celebrated','proud','managed','accomplished','succeeded'];
  const posWords   = ['great','amazing','wonderful','excellent','fantastic','good','happy','excited','proud','relieved'];
  const isMicroWin = microWinKw.some(k => lower.includes(k));

  // Detect mood
  let mood = 'neutral', stressLevel = 'low', wellness = 75, crisisRisk = 12, compound = 0.0;

  if (/\b(overwhelm|too much|can't cope|drowning|burnout|can't handle|too many|overloaded)\b/.test(lower))
    { mood='overwhelmed'; stressLevel='high'; wellness=38; crisisRisk=18; compound=-0.6; }
  else if (/\b(stress|stressed|pressure|deadline|workload|behind|rush)\b/.test(lower))
    { mood='anxious'; stressLevel='high'; wellness=50; crisisRisk=14; compound=-0.45; }
  else if (/\b(anxi|nervous|worried|worry|scared|fear|panic)\b/.test(lower))
    { mood='anxious'; stressLevel='medium'; wellness=55; crisisRisk=16; compound=-0.4; }
  else if (/\b(sad|depress|down|low|empty|numb|worthless|hopeless)\b/.test(lower))
    { mood='distressed'; stressLevel='medium'; wellness=42; crisisRisk=22; compound=-0.55; }
  else if (/\b(angry|frustrat|furious|annoyed|irritat|rage)\b/.test(lower))
    { mood='distressed'; stressLevel='high'; wellness=48; crisisRisk=10; compound=-0.5; }
  else if (/\b(tired|exhaust|fatigue|drained|no energy|worn out)\b/.test(lower))
    { mood='overwhelmed'; stressLevel='medium'; wellness=52; crisisRisk=10; compound=-0.35; }
  else if (isMicroWin || posWords.some(p => lower.includes(p)))
    { mood='happy'; stressLevel='low'; wellness=88; crisisRisk=4; compound=0.75; }
  else if (/\b(calm|okay|fine|alright|okay|settled|peaceful)\b/.test(lower))
    { mood='calm'; stressLevel='low'; wellness=78; crisisRisk=5; compound=0.3; }

  const p = personality && PERSONA[personality] ? personality : 'emotional';
  const pool = PERSONA[p][mood] || PERSONA[p]['neutral'];
  let responseText = pool[Math.floor(Math.random() * pool.length)];

  // Workplace-specific empathy
  if (/deadline|due date|deliver/i.test(lower))
    responseText += " Deadlines are one of the biggest professional stressors — your feelings about it are completely understandable.";
  if (/boss|manager|management|leadership/i.test(lower))
    responseText += " Navigating difficult management dynamics is genuinely hard. You're not imagining it.";
  if (/lonely|isolated|alone|no one understands/i.test(lower))
    responseText += " Reaching out like this takes real courage. I'm always here.";

  if (isMicroWin && compound > 0) {
    const icons = ['🏆','⭐','🎯','💪','🌟','✅','🎉'];
    responseText = icons[Math.floor(Math.random()*icons.length)] + ' **Micro-Win unlocked!** ' + responseText;
  }

  const workplaceFlags = [];
  if (/deadline/i.test(lower)) workplaceFlags.push('deadline_pressure');
  if (/boss|manager/i.test(lower)) workplaceFlags.push('management_conflict');
  if (/job|fired|laid off|redundan/i.test(lower)) workplaceFlags.push('job_insecurity');

  return {
    text: responseText,
    analysis: { mood, stress_level:stressLevel, stress_score:Math.round((1-(wellness/100))*80+10), wellness_score:wellness, crisis_risk:crisisRisk, sentiment:compound>=0?'positive':'negative', compound, workplace_flags:workplaceFlags, loneliness_flag:/lonely|alone|isolated/i.test(lower), needs_intervention:false },
    isMicroWin,
  };
}

const QUICK_PROMPTS = [
  "I'm feeling overwhelmed at work",
  "Help me manage deadline anxiety",
  "I had a conflict with my manager",
  "I achieved something today 🎉",
  "I feel burnt out and exhausted",
  "I need a quick calming technique",
];

const greetingMsg = (user) => ({
  id: 'init', sender: 'bot',
  text: `Hello ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI mental health companion. I'm here to listen without judgment — how are you feeling today?`,
  timestamp: new Date().toISOString(),
});

export default function ChatInterface({ user, onNavigate, theme, toggleTheme }) {
  const [sessionId, setSessionId]     = useState(null);
  const [therapyMethod, setTherapyMethod] = useState('warm'); // cbt | mindfulness | warm

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [analysis, setAnalysis]       = useState(null);
  const [wellness, setWellness]       = useState(75);
  const [sessions, setSessions]       = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toasts, setToasts]           = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [showTherapyGear, setShowTherapyGear] = useState(false);
  const [autoReadAloud, setAutoReadAloud] = useState(() => localStorage.getItem('mw_voice_auto') === '1');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [showMemory, setShowMemory] = useState(false);
  const [userMemory, setUserMemory] = useState(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryRefreshing, setMemoryRefreshing] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const typingEmotion = useTypingEmotion(input);
  const {
    voiceEmotion,
    analyzing: voiceAnalyzing,
    onListenStart,
    onTranscriptUpdate,
    analyzeTranscript,
    clearVoiceEmotion,
  } = useVoiceEmotion();
  const { startCapture, stopCapture } = useAudioProsody();

  const loadMemory = useCallback(async () => {
    if (!user?.id) return;
    setMemoryLoading(true);
    try {
      const mem = await memoryAPI.get(user?.id);
      setUserMemory(mem);
    } catch { /* ignore */ }
    finally { setMemoryLoading(false); }
  }, [user]);

  useEffect(() => {
    const init = async () => { await loadMemory(); };
    init();
  }, [loadMemory]);

  const handleVoiceTranscript = useCallback(async (transcript, isFinal) => {
    onTranscriptUpdate(transcript);
    setInput(transcript);
    if (isFinal && transcript.trim()) {
      const prosody = stopCapture();
      await analyzeTranscript(transcript, prosody);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [onTranscriptUpdate, analyzeTranscript, stopCapture]);

  const {
    isListening,
    isSpeaking,
    voiceSupported,
    sttSupported,
    toggleListening,
    speak,
    stopSpeaking,
  } = useVoice({ onTranscript: handleVoiceTranscript });

  useEffect(() => {
    localStorage.setItem('mw_voice_auto', autoReadAloud ? '1' : '0');
  }, [autoReadAloud]);

  const addToast = (message, type = 'danger') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const loadSessionHistory = async (id) => {
    setSessionId(id);
    setSending(true);
    try {
      const history = await chatAPI.getHistory(id);
      if (history.length === 0) {
        setMessages([greetingMsg(user)]);
        setAnalysis(null); setWellness(75);
      } else {
        setMessages(history.map(m => ({ ...m, timestamp: m.timestamp || new Date().toISOString() })));
        const last = [...history].reverse().find(m => m.sender === 'user' && m.emotionMetrics);
        if (last?.emotionMetrics) {
          const em = last.emotionMetrics;
          setAnalysis({ mood:em.currentMood, stress_level:em.stressLevel, stress_score:em.stressScore, wellness_score:em.wellnessScore, crisis_risk:em.crisisScore, sentiment:em.sentiment, compound:em.compound, workplace_flags:[], loneliness_flag:false });
          setWellness(em.wellnessScore);
        }
      }
    } catch {
      setMessages([greetingMsg(user)]); setAnalysis(null); setWellness(75);
    } finally { setSending(false); }
  };

  const handleNewSession = async () => {
    setSending(true);
    try {
      const s = await chatAPI.startSession(user.id, therapyMethod);
      setSessionId(s.id);
      setMessages([greetingMsg(user)]);
      setAnalysis(null); setWellness(75);
      // We don't call loadSessions here directly to avoid cyclic dependencies
    } catch {
      // Offline new session
      setOfflineMode(true);
      setSessionId('offline-' + new Date().getTime());
      setMessages([greetingMsg(user)]);
      setAnalysis(null); setWellness(75);
    } finally { setSending(false); }
  };

  const ensureOnlineSession = useCallback(async () => {
    const health = await checkServerHealth();
    if (!health?.ok) return { ok: false };
    setOfflineMode(false);
    if (sessionId && !String(sessionId).startsWith('offline-')) {
      return { ok: true, sessionId };
    }
    try {
      const s = await chatAPI.startSession(user.id, therapyMethod);
      setSessionId(s.id);
      setMessages([greetingMsg(user)]);
      setAnalysis(null);
      setWellness(75);
      return { ok: true, sessionId: s.id };
    } catch {
      return { ok: false };
    }
  }, [user, therapyMethod, sessionId]);

  // Load sessions; only use offline mode if server is truly unreachable
  const loadSessions = useCallback(async (selectLatest = true) => {
    const health = await checkServerHealth();
    if (!health?.ok) {
      setOfflineMode(true);
      setMessages([greetingMsg(user)]);
      setSessionId('offline-' + new Date().getTime());
      addToast('Backend offline — start server on port 5000 for full AI chat.', 'danger');
      return;
    }
    setOfflineMode(false);
    if (health.groq) setAiProvider('groq');
    else if (health.gemini) setAiProvider('gemini');

    try {
      const data = await chatAPI.getSessions(user.id);
      setSessions(data);
      if (selectLatest && data.length > 0) {
        await loadSessionHistory(data[0].id);
      } else if (selectLatest) {
        await handleNewSession();
      }
    } catch (err) {
      addToast(err.message || 'Could not load chats. Retrying online session…', 'warning');
      const restored = await ensureOnlineSession();
      if (!restored.ok) {
        setOfflineMode(true);
        setSessionId('offline-' + new Date().getTime());
        setMessages([greetingMsg(user)]);
      }
    }
  }, [user, ensureOnlineSession, handleNewSession, loadSessionHistory]);



  useEffect(() => {
    const init = async () => { await loadSessions(true); };
    init();
  }, [loadSessions]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || !sessionId || sending) return;
    setInput('');
    setSending(true);
    setShowPrompts(false);

    const tmpId = `tmp-${new Date().getTime()}`;
    setMessages(prev => [...prev, { id:tmpId, sender:'user', text, timestamp:new Date().toISOString() }]);

    let activeSessionId = sessionId;
    if (offlineMode || String(sessionId).startsWith('offline-')) {
      const restored = await ensureOnlineSession();
      if (restored.ok) {
        setOfflineMode(false);
        activeSessionId = restored.sessionId;
      } else {
        await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
        const ai = getOfflineAI(text, user?.personality);
        setAnalysis(ai.analysis);
        setWellness(Math.round(ai.analysis.wellness_score));
        setMessages(prev => [
          ...prev.filter(m => m.id !== tmpId),
          { id:`u-${new Date().getTime()}`, sender:'user', text, timestamp:new Date().toISOString() },
          { id:`b-${new Date().getTime()}`, sender:'bot', text:ai.text, isMicroWin:ai.isMicroWin, timestamp:new Date().toISOString() },
        ]);
        setSending(false);
        return;
      }
    }

    try {
      const res = await chatAPI.sendMessage(activeSessionId, text, user?.personality, therapyMethod);

      setAnalysis(res.analysis);
      setWellness(Math.round(res.analysis.wellness_score));
      if (res.aiProvider) setAiProvider(res.aiProvider);
      if (res.usedFallback) {
        addToast(
          res.aiProvider === 'smart'
            ? 'Gemini quota unavailable — using enhanced conversational AI. Add GROQ_API_KEY in server/.env for full LLM chat.'
            : 'Using backup AI — cloud model temporarily unavailable.',
          'warning'
        );
      }
      const botText = res.botMessage?.text;
      setMessages(prev => [
        ...prev.filter(m => m.id !== tmpId),
        { ...res.userMessage, timestamp: res.userMessage.timestamp || new Date().toISOString() },
        { ...res.botMessage,  timestamp: res.botMessage.timestamp  || new Date().toISOString() },
      ]);
      if (autoReadAloud && botText && voiceSupported) speak(botText);
      if (res.memory) setUserMemory(res.memory);
      loadSessions(false);
    } catch (err) {
      addToast(err.message || 'Could not reach server. Is `node index.js` running in server/?', 'danger');
      setMessages(prev => prev.filter(m => m.id !== tmpId));
      setInput(text);
    } finally { setSending(false); }
  };

  const moodColor   = analysis ? (MOOD_COLOR[analysis.mood]   || '#6b7280') : '#6b7280';
  const displayMood = voiceEmotion?.mood || analysis?.mood || typingEmotion?.mood || 'neutral';

  const handleToggleListen = async () => {
    if (!isListening) {
      onListenStart();
      await startCapture();
    } else {
      stopCapture();
      clearVoiceEmotion();
    }
    toggleListening();
  };

  const handleRefreshMemoryAI = async () => {
    if (!user?.id) return;
    setMemoryRefreshing(true);
    try {
      const mem = await memoryAPI.refreshWithAI(user.id);
      setUserMemory(mem);
      addToast(mem.llmEnhanced ? 'Memory updated with Gemini' : 'Memory refreshed', 'success');
    } catch (e) {
      addToast(e.message || 'AI memory refresh failed', 'danger');
    } finally {
      setMemoryRefreshing(false);
    }
  };

  const handleClearMemory = async () => {
    if (!user?.id) return;
    try {
      await memoryAPI.clear(user.id);
      setUserMemory({ summary: '', topics: [], keyFacts: [] });
      addToast('Conversation memory cleared', 'success');
    } catch {
      addToast('Could not clear memory', 'danger');
    }
  };

  return (
    <div className="chat-page">

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <Lucide.AlertCircle size={17} style={{ color:`var(--${t.type === 'danger' ? 'danger' : 'success'})`, flexShrink:0 }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div className="nav-logo-wrap" style={{ width:32,height:32,borderRadius:9 }}>
              <Lucide.BrainCircuit size={16} />
            </div>
            <div style={{ fontSize:14,fontWeight:800,letterSpacing:-0.02 }}>MindWell AI</div>
          </div>
          <button className="btn btn-primary" onClick={handleNewSession}
            style={{ width:'100%',padding:'9px 14px',fontSize:12.5,gap:7 }}>
            <Lucide.Plus size={14} /> New Conversation
          </button>
        </div>
        <div className="sidebar-sessions">
          {sessions.map(s => {
            const preview = s.messages?.[0]?.text || 'Empty session';
            const date    = new Date(s.startTime).toLocaleDateString([],{ month:'short', day:'numeric' });
            return (
              <button key={s.id} className={`session-item ${sessionId === s.id ? 'active' : ''}`}
                onClick={() => loadSessionHistory(s.id)}>
                <span className="session-preview">{preview}</span>
                <span className="session-time">{date}</span>
              </button>
            );
          })}
          {sessions.length === 0 && (
            <div style={{ padding:16, color:'var(--text-muted)', fontSize:12.5, textAlign:'center', lineHeight:1.6 }}>
              {offlineMode ? '🔌 Offline mode — AI is still here!' : 'No previous chats'}
            </div>
          )}
        </div>
        {offlineMode && (
          <div style={{ padding:14,borderTop:'1px solid var(--border)',display:'flex',gap:8,alignItems:'center',fontSize:11.5,color:'var(--text-muted)' }}>
            <Lucide.WifiOff size={13} /> AI works offline
          </div>
        )}
      </aside>

      {/* Main */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',height:'100%',overflow:'hidden' }}>

        {/* Header */}
        <header className="chat-header">
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <button className="btn btn-ghost" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding:8,borderRadius:10 }} title="Sessions">
              <Lucide.Menu size={20} />
            </button>
            <div className="chat-header-orb">
              <EmotionalOrb
                mood={displayMood}
                wellness={wellness}
                size={44}
              />
              <div>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <h2 style={{ fontSize:16,fontWeight:800 }}>AI Wellness Companion</h2>
                  {offlineMode && <span className="badge badge-gold" style={{ fontSize:9.5 }}>OFFLINE AI</span>}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:11.5,color: offlineMode ? 'var(--warning)' : 'var(--success)',marginTop:2 }}>
                  <div style={{ width:6,height:6,background: offlineMode ? 'var(--warning)' : 'var(--success)',borderRadius:'50%',boxShadow:'0 0 6px var(--primary-glow)' }} />
                  {offlineMode ? 'Offline mode' : aiProvider === 'gemini' ? 'Gemini AI' : aiProvider === 'groq' ? 'Groq AI' : 'Enhanced AI'}
                </div>
              </div>
            </div>
          </div>

      <div style={{ display:'flex',gap:10,alignItems:'center' }}>

            {/* Wellness bar */}


            <div style={{ display:'flex',alignItems:'center',gap:9,padding:'6px 14px',background:'var(--primary-subtle)',border:'1px solid var(--border)',borderRadius:12 }}>
              <Lucide.Heart size={14} style={{ color:'var(--secondary)' }} />
              <div style={{ width:80,height:4,background:'var(--border)',borderRadius:3,overflow:'hidden' }}>
                <div style={{ width:`${wellness}%`,height:'100%',background:`linear-gradient(90deg,var(--primary-dark),var(--primary))`,borderRadius:3,transition:'width 0.8s ease' }} />
              </div>
              <span style={{ fontSize:12,fontWeight:700,color:'var(--primary)' }}>{wellness}%</span>
            </div>

            {analysis && (
              <div style={{ padding:'5px 12px',borderRadius:20,background:`${moodColor}14`,border:`1px solid ${moodColor}40`,color:moodColor,fontSize:11.5,fontWeight:700,textTransform:'capitalize' }}>
                {analysis.mood}
              </div>
            )}

            <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding:8,borderRadius:10 }}>
              {theme === 'light' ? <Lucide.Moon size={18} /> : <Lucide.Sun size={18} />}
            </button>

            <button
              className={`btn btn-ghost ${autoReadAloud ? 'voice-btn-active' : ''}`}
              onClick={() => {
                if (isSpeaking) { stopSpeaking(); return; }
                setAutoReadAloud(v => {
                  if (!v) addToast('Auto read-aloud enabled for AI replies', 'success');
                  return !v;
                });
              }}
              title={isSpeaking ? 'Stop speaking' : autoReadAloud ? 'Auto read-aloud on' : 'Auto read-aloud off'}
              style={{ padding:8,borderRadius:10 }}
              disabled={!voiceSupported}
            >
              {isSpeaking ? <Lucide.VolumeX size={18} /> : <Lucide.Volume2 size={18} />}
            </button>

            <button className="btn btn-ghost" onClick={() => onNavigate('breathing')} title="Quick Calm" style={{ padding:8,borderRadius:10 }}>
              <Lucide.Wind size={18} />
            </button>

            <button
              className={`btn btn-ghost ${showMemory ? 'voice-btn-active' : ''}`}
              onClick={() => setShowMemory(true)}
              title="AI conversation memory"
              style={{ padding:8, borderRadius:10 }}
            >
              <Lucide.Brain size={18} />
            </button>
          </div>
        </header>

        <ConversationMemoryPanel
          open={showMemory}
          onClose={() => setShowMemory(false)}
          memory={userMemory}
          loading={memoryLoading}
          onClear={handleClearMemory}
          onRefreshAI={handleRefreshMemoryAI}
          refreshing={memoryRefreshing}
        />

        {/* Crisis banner */}
        {analysis?.needs_intervention && (
          <div className="crisis-banner">
            <Lucide.AlertTriangle size={18} style={{ color:'var(--secondary)',flexShrink:0 }} />
            <div>
              <strong>Crisis support mode active.</strong>&nbsp;
              iCall: <strong>9152987821</strong> · Vandrevala: <strong>1860-2662-345</strong> · AASRA: <strong>9820466627</strong>
            </div>
          </div>
        )}

        {/* Messages */}
        <main className="chat-messages">
          <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div
              key={m.id}
              className={`msg-row ${m.sender}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {m.sender === 'bot' && (
                <EmotionalOrb
                  mood={m.analysis?.mood || analysis?.mood || 'neutral'}
                  wellness={m.analysis?.wellness_score ?? wellness}
                  size={40}
                  pulse={false}
                />
              )}
              <div className={`msg-bubble ${m.sender}`}>
                {m.isMicroWin && <div className="micro-win-badge">⭐ MICRO-WIN UNLOCKED</div>}
                <div style={{ whiteSpace:'pre-wrap' }}>{m.text}</div>
                <div className="msg-time" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                  <span>{new Date(m.timestamp).toLocaleTimeString([],{ hour:'2-digit', minute:'2-digit' })}</span>
                  {m.sender === 'bot' && voiceSupported && (
                    <button
                      type="button"
                      className="msg-speak-btn"
                      title="Listen to this message"
                      onClick={() => { stopSpeaking(); speak(m.text); }}
                    >
                      <Lucide.Volume2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>

          {sending && (
            <motion.div
              className="msg-row bot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <EmotionalOrb mood={analysis?.mood || 'neutral'} wellness={wellness} size={40} />
              <div className="msg-bubble bot" style={{ display:'flex',gap:5,alignItems:'center',padding:'14px 18px' }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </main>

        {/* Quick Prompts */}
        {showPrompts && messages.length <= 2 && (
          <div className="quick-prompts">
            {QUICK_PROMPTS.map(p => (
              <button key={p} className="quick-prompt-btn" onClick={() => handleSend(p)}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Analytics bar */}
        {analysis && (
          <div className="analytics-bar">
            <span>🧠 Sentiment: <strong style={{ color:'var(--text-primary)' }}>{analysis.sentiment}</strong></span>
            <span style={{ color: analysis.crisis_risk > 50 ? 'var(--danger)' : 'var(--text-muted)' }}>
              ⚠ Crisis Risk: <strong style={{ color: analysis.crisis_risk > 50 ? 'var(--danger)' : 'var(--text-primary)' }}>{Math.round(analysis.crisis_risk)}%</strong>
            </span>
            <span>💼 Stressors: <strong style={{ color:'var(--text-primary)' }}>{analysis.workplace_flags?.length ? analysis.workplace_flags.join(', ') : 'None detected'}</strong></span>
            {analysis.loneliness_flag && <span style={{ color:'var(--accent)' }}>💛 Loneliness signal</span>}
          </div>
        )}

        {/* Input footer */}
        <footer className="chat-footer">
          {(voiceEmotion || voiceAnalyzing) && (
            <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
              <span
                className="typing-emotion-chip"
                style={{
                  borderColor: `${MOOD_COLOR[voiceEmotion?.mood] || '#a78bfa'}44`,
                  color: MOOD_COLOR[voiceEmotion?.mood] || 'var(--violet)',
                }}
              >
                <Lucide.Mic size={12} />
                {voiceAnalyzing
                  ? 'Analyzing voice tone…'
                  : `Voice: ${voiceEmotion.label} · ${voiceEmotion.energy} energy · ${voiceEmotion.wpm} wpm${
                      voiceEmotion.prosody?.avg_pitch_hz
                        ? ` · ~${voiceEmotion.prosody.avg_pitch_hz}Hz`
                        : ''
                    }`}
              </span>
            </div>
          )}
          {typingEmotion && input.trim() && !sending && !isListening && (
            <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
              <span
                className="typing-emotion-chip"
                style={{
                  borderColor: `${MOOD_COLOR[typingEmotion.mood] || '#6b7280'}44`,
                  color: MOOD_COLOR[typingEmotion.mood] || 'var(--text-primary)',
                }}
              >
                <span
                  className="chip-dot"
                  style={{ background: MOOD_COLOR[typingEmotion.mood] || '#6b7280', color: MOOD_COLOR[typingEmotion.mood] }}
                />
                Live read: {typingEmotion.label} · {typingEmotion.score}% wellness signal
              </span>
            </div>
          )}
          <div className="chat-input-row">
            <div className="chat-input-wrap">
              <textarea
                ref={inputRef}
                id="chat-input"
                className="chat-textarea"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="How are you really feeling today?"
                rows={1}
                style={{ overflowY:'auto' }}
              />
              <button
                type="button"
                className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
                onClick={handleToggleListen}
                disabled={!sttSupported || sending}
                title={sttSupported ? (isListening ? 'Stop listening' : 'Voice input') : 'Voice not supported in this browser'}
              >
                {isListening ? <Lucide.MicOff size={18} /> : <Lucide.Mic size={18} />}
              </button>
            </div>
            <button
              id="chat-send"
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
            >
              <Lucide.Send size={17} />
            </button>
          </div>
          <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:8,textAlign:'center' }}>
            {isListening ? '🎤 Listening… speak now' : offlineMode ? '🔌 Offline AI • Not medical advice' : '🎤 Mic to speak · 🔊 Speaker on messages · Not medical advice'}
          </div>
        </footer>
      </div>

      {/* Floating therapy method gear */}
      <button
        type="button"
        className="therapy-gear-fab"
        onClick={() => setShowTherapyGear(v => !v)}
        title="AI therapy style"
        aria-label="Configure therapy method"
      >
        <Lucide.Settings size={22} />
      </button>
      {showTherapyGear && (
        <div className="therapy-gear-panel">
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:10 }}>
            Therapy Method
          </div>
          {[
            { id:'warm', label:'Warm Listener', desc:'Empathetic, validating support' },
            { id:'cbt', label:'CBT Coach', desc:'Thought reframes & evidence checks' },
            { id:'mindfulness', label:'Mindfulness', desc:'Grounding & present-moment focus' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              className={`therapy-method-btn ${therapyMethod === m.id ? 'active' : ''}`}
              onClick={() => { setTherapyMethod(m.id); setShowTherapyGear(false); }}
            >
              <strong>{m.label}</strong>
              <span>{m.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
