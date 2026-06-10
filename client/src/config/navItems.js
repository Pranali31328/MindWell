import * as Lucide from 'lucide-react';

export const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Lucide.LayoutDashboard, desc: 'Overview & analytics' },
      { id: 'chat', label: 'AI Companion', icon: Lucide.MessageSquare, desc: 'Talk to MindWell AI' },
    ],
  },
  {
    label: 'Wellness',
    items: [
      { id: 'journal', label: 'Mood Journal', icon: Lucide.BookOpen, desc: 'Reflect & track' },
      { id: 'resources', label: 'Wellness Hub', icon: Lucide.Library, desc: 'Guides & exercises' },
      { id: 'breathing', label: 'Breathing Coach', icon: Lucide.Wind, desc: '4-7-8, box, equal' },
      { id: 'burnout', label: 'Burnout Test', icon: Lucide.Flame, desc: 'Risk assessment' },
      { id: 'timer', label: 'Focus Timer', icon: Lucide.Timer, desc: 'Pomodoro sessions' },
    ],
  },
  {
    label: 'Emergency',
    items: [
      { id: 'sanctuary', label: 'Calm Sanctuary', icon: Lucide.Sparkles, desc: '2-min calm mode', accent: true },
    ],
  },
];

export const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', subtitle: 'Your wellness command center' },
  chat: { title: 'AI Companion', subtitle: 'Private, judgment-free support' },
  journal: { title: 'Mood Journal', subtitle: 'Your private reflection space' },
  resources: { title: 'Wellness Hub', subtitle: 'Evidence-based guides for professionals' },
  breathing: { title: 'Breathing Coach', subtitle: 'Multi-mode guided breathing' },
  burnout: { title: 'Burnout Assessment', subtitle: 'Understand your risk level' },
  timer: { title: 'Focus Timer', subtitle: 'Pomodoro for deep work' },
};
