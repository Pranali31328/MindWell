import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import { authAPI } from '../api.js';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || (!isLogin && !form.name)) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      let user;
      if (isLogin) {
        user = await authAPI.login(form.email, form.password);
      } else {
        user = await authAPI.register(form.name, form.email, form.password);
      }
      localStorage.setItem('mw_user', JSON.stringify(user));
      onAuthSuccess(user);
    } catch (err) {
      // If server provides details, show them
      const msg = err.details ? `${err.message} (${err.details})` : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (key, type, placeholder) => (
    <input
      id={`auth-${key}`}
      className="input-field"
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={e => setForm({ ...form, [key]: e.target.value })}
      autoComplete={type === 'password' ? 'current-password' : 'off'}
    />
  );

  return (
    <div className="onboarding-page">
      <div className="onboarding-step" style={{ maxWidth: 440, width: '100%' }}>
        <div className="onboarding-logo">
          <Lucide.BrainCircuit size={52} />
        </div>
        <h1 className="onboarding-title" style={{ fontSize: 30, textAlign: 'center' }}>
          {isLogin ? 'Welcome Back' : 'Join MindWell'}
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 28 }}>
          {isLogin
            ? 'Your mental well-being journey continues here.'
            : 'Start your journey to a balanced professional life.'}
        </p>

        <form id="auth-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          {!isLogin && field('name', 'text', 'Full Name')}
          {field('email', 'email', 'Email Address')}
          {field('password', 'password', 'Password')}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>
          )}

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 6 }}
          >
            {loading ? 'Please wait…' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            id="auth-toggle"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
