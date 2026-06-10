import { useState } from 'react';
import * as Lucide from 'lucide-react';
import { userAPI } from '../api.js';

const PERSONALITIES = [
  { id: 'analytical', icon: 'Microscope', title: 'Analytical', desc: 'Logical, data-driven, and focused on practical solutions.' },
  { id: 'emotional',  icon: 'Heart',      title: 'Empathetic', desc: 'Expressive, values connection and emotional understanding.' },
  { id: 'creative',  icon: 'Palette',    title: 'Creative',   desc: 'Intuitive, enjoys variety and outside-the-box thinking.' },
  { id: 'focused',   icon: 'Target',     title: 'Focused',    desc: 'Goal-oriented, disciplined, and results-driven.' },
];

const STRESSORS = ['Tight Deadlines','Meeting Fatigue','Work-Life Balance','Public Speaking','Complex Decisions','Team Management','Career Transitions','Technical Challenges'];
const GOALS     = ['Reduce Anxiety','Better Sleep','Higher Productivity','Confident Communication','Stress Resilience','Mental Clarity','Work-Life Harmony','Emotional Stability'];

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [data, setData] = useState({
    profession: '', company: '', personality: 'analytical',
    primaryStressors: [], goals: [],
  });

  const toggle = (key, val) =>
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(x => x !== val) : [...prev[key], val],
    }));

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await userAPI.completeOnboarding(user.id, data);
      localStorage.setItem('mw_user', JSON.stringify({ ...user, ...updated }));
      onComplete({ ...user, ...updated });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const IconComp = (name) => {
    const C = Lucide[name] || Lucide.HelpCircle;
    return <C size={32} />;
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <div className="onboarding-logo"><Lucide.BrainCircuit size={60} /></div>
          <h1 className="onboarding-title">Let's Personalise Your MindWell</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Step {step} of 3</p>
        </div>

        <div className="onboarding-step">
          {/* Step 1 – Professional Context */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Professional Context</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Helps us tailor suggestions to your workplace.</p>
              </div>
              <div className="input-grid">
                <input className="input-field" placeholder="Professional Title" value={data.profession}
                  onChange={e => setData({ ...data, profession: e.target.value })} />
                <input className="input-field" placeholder="Company (optional)" value={data.company}
                  onChange={e => setData({ ...data, company: e.target.value })} />
              </div>
            </div>
          )}

          {/* Step 2 – Interaction Style */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Your Interaction Style</h2>
                <p style={{ color: 'var(--text-secondary)' }}>How should your AI companion communicate?</p>
              </div>
              <div className="personality-cards">
                {PERSONALITIES.map(p => (
                  <div key={p.id}
                    className={`personality-card ${data.personality === p.id ? 'selected' : ''}`}
                    onClick={() => setData({ ...data, personality: p.id })}>
                    <div style={{ color: data.personality === p.id ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 12 }}>
                      {IconComp(p.icon.charAt(0).toUpperCase() + p.icon.slice(1))}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{p.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 – Focus Areas */}
          {step === 3 && (
            <div style={{ display: 'grid', gap: 28 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Focus Areas</h2>
                <p style={{ color: 'var(--text-secondary)' }}>What challenges are you facing and what are your goals?</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <h4 style={{ marginBottom: 12 }}>Top Stressors</h4>
                  <div className="checkbox-group">
                    {STRESSORS.map(o => (
                      <div key={o} className={`checkbox-item ${data.primaryStressors.includes(o) ? 'selected' : ''}`}
                        onClick={() => toggle('primaryStressors', o)}>
                        <div style={{ width: 16, height: 16, border: '2px solid var(--primary)', borderRadius: 4,
                          background: data.primaryStressors.includes(o) ? 'var(--primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {data.primaryStressors.includes(o) && <Lucide.Check size={11} color="white" />}
                        </div>
                        <span style={{ fontSize: 13 }}>{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ marginBottom: 12 }}>Well-being Goals</h4>
                  <div className="checkbox-group">
                    {GOALS.map(o => (
                      <div key={o} className={`checkbox-item ${data.goals.includes(o) ? 'selected' : ''}`}
                        onClick={() => toggle('goals', o)}>
                        <div style={{ width: 16, height: 16, border: '2px solid var(--secondary)', borderRadius: 4,
                          background: data.goals.includes(o) ? 'var(--secondary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {data.goals.includes(o) && <Lucide.Check size={11} color="white" />}
                        </div>
                        <span style={{ fontSize: 13 }}>{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ color: 'var(--danger)', textAlign: 'center', fontSize: 13 }}>{error}</p>}

          <div className="step-navigation">
            <button className="btn btn-secondary" disabled={step === 1} onClick={() => setStep(s => s - 1)}>
              <Lucide.ArrowLeft size={16} /> Previous
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%',
                  background: step === i ? 'var(--primary)' : 'var(--border)' }} />
              ))}
            </div>
            <button className="btn btn-primary" disabled={saving}
              onClick={step < 3 ? () => setStep(s => s + 1) : handleFinish}>
              {step === 3 ? (saving ? 'Saving…' : 'Finish Setup') : 'Continue'} <Lucide.ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
