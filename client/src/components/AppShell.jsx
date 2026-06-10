import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { NAV_SECTIONS } from '../config/navItems.js';
import EmotionalOrb from './EmotionalOrb.jsx';

export default function AppShell({
  page,
  user,
  theme,
  toggleTheme,
  onNavigate,
  onLogout,
  variant = 'default',
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <div className={`app-shell app-shell--${variant}`}>
      {mobileOpen && (
        <button
          type="button"
          className="app-shell-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="app-sidebar-brand">
          <div className="app-sidebar-logo">
            <Lucide.BrainCircuit size={22} />
          </div>
          <div>
            <div className="app-sidebar-name">MindWell</div>
            <div className="app-sidebar-tag">AI Mental Health</div>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="app-nav-section">
              <div className="app-nav-section-label">{section.label}</div>
              {section.items.map(item => {
                const Icon = item.icon;
                const active = page === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`app-nav-item ${active ? 'active' : ''} ${item.accent ? 'accent' : ''}`}
                    onClick={() => handleNav(item.id)}
                  >
                    <span className="app-nav-icon">
                      <Icon size={18} />
                    </span>
                    <span className="app-nav-copy">
                      <span className="app-nav-label">{item.label}</span>
                      <span className="app-nav-desc">{item.desc}</span>
                    </span>
                    {active && <motion.span layoutId="nav-glow" className="app-nav-active-glow" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="app-sidebar-user">
          <div className="app-sidebar-user-card">
            <EmotionalOrb mood="calm" wellness={78} size={40} pulse={false} />
            <div className="app-sidebar-user-info">
              <div className="app-sidebar-user-name">{user?.name?.split(' ')[0] || 'User'}</div>
              <div className="app-sidebar-user-role">{user?.profession || 'Professional'}</div>
            </div>
          </div>
          <div className="app-sidebar-actions">
            <button type="button" className="app-sidebar-action-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Lucide.Moon size={16} /> : <Lucide.Sun size={16} />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <button type="button" className="app-sidebar-action-btn danger" onClick={onLogout}>
              <Lucide.LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="app-shell-body">
        <header className="app-topbar">
          <button
            type="button"
            className="app-menu-toggle"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            <Lucide.Menu size={22} />
          </button>
          <div className="app-topbar-title">
            {NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === page)?.label || 'MindWell'}
          </div>
          <div className="app-topbar-actions">
            <button type="button" className="btn btn-ghost app-topbar-icon" onClick={toggleTheme}>
              {theme === 'light' ? <Lucide.Moon size={18} /> : <Lucide.Sun size={18} />}
            </button>
          </div>
        </header>

        <main className="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="app-page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
