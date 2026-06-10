/**
 * History-aware conversational fallback when cloud LLMs are unavailable.
 * Much richer than static template pools — references user words and thread context.
 */

const THERAPY = {
  cbt: {
    open: (name) => `${name}, let's look at this together with a CBT lens — not to dismiss how you feel, but to see if your mind is telling a story that isn't fully accurate.`,
    reframe: 'What is the exact thought your mind is repeating right now? If a close friend said that about themselves, what would you tell them?',
    close: 'Which part of that thought feels most true, and which part might be stress talking?',
  },
  mindfulness: {
    open: (name) => `${name}, I'm here with you. Before we unpack everything, let's anchor in the present for a moment.`,
    reframe: 'Without trying to fix anything yet: what do you notice in your body right now — tension, heat, heaviness, or something else?',
    close: 'What is one sensation or breath you can focus on for the next 30 seconds?',
  },
  warm: {
    open: (name) => `${name}, thank you for sharing this — it sounds like a lot is sitting on you, and that matters.`,
    reframe: "What you're describing makes sense given what you're carrying. You don't have to minimize it to be strong.",
    close: 'What would feel most supportive right now — being heard, a practical step, or just space?',
  },
};

function pickUserThemes(text) {
  const t = text.toLowerCase();
  const themes = [];
  if (/deadline|due|deliver|submit/i.test(t)) themes.push('deadline pressure');
  if (/boss|manager|lead|supervisor/i.test(t)) themes.push('management dynamics');
  if (/team|colleague|coworker/i.test(t)) themes.push('team relationships');
  if (/burnout|exhaust|tired|drained/i.test(t)) themes.push('burnout and fatigue');
  if (/anxi|worry|nervous|panic/i.test(t)) themes.push('anxiety');
  if (/lonely|alone|isolated/i.test(t)) themes.push('loneliness');
  if (/family|home|partner|spouse/i.test(t)) themes.push('home life');
  if (/promot|career|growth|stuck/i.test(t)) themes.push('career uncertainty');
  if (/sleep|insomnia|night/i.test(t)) themes.push('sleep');
  if (/angry|frustrat|furious/i.test(t)) themes.push('frustration');
  return themes;
}

function mirrorPhrase(text) {
  const trimmed = text.trim();
  if (trimmed.length < 12) return null;
  const snippet = trimmed.length > 90 ? trimmed.slice(0, 90) + '…' : trimmed;
  return `When you mention "${snippet.replace(/"/g, "'")}"`;
}

function generateSmartResponse({
  userText,
  personality = 'emotional',
  therapyMethod = 'warm',
  mlResult = {},
  contextMessages = [],
  userContext = {},
  userMemory = null,
}) {
  const method = (therapyMethod || 'warm').toLowerCase();
  const guide = THERAPY[method] || THERAPY.warm;
  const name = userContext?.name?.split(' ')[0] || 'there';
  const themes = pickUserThemes(userText);
  const mirror = mirrorPhrase(userText);

  if (mlResult.needs_intervention) {
    return (
      `${name}, I'm really glad you're telling me this — what you shared is serious, and you deserve real support right now.\n\n` +
      `Please reach out immediately: **iCall 9152987821** · **Vandrevala 1860-2662-345** · **AASRA 9820466627**.\n\n` +
      `I'm staying with you in this chat. Are you safe right now, and is there someone nearby you can contact?`
    );
  }

  const history = (contextMessages || []).filter(m => m.text && m.sender);
  const priorUser = history.filter(m => m.sender === 'user').slice(-3);
  const isFollowUp = priorUser.length >= 2;
  const lastUser = priorUser[priorUser.length - 2]?.text;

  const parts = [];
  parts.push(guide.open(name));

  if (userMemory?.topics?.length) {
    parts.push(`I remember you've been working through **${userMemory.topics.slice(0, 2).join('** and **')}** — that context still matters.`);
  } else if (userMemory?.summary) {
    parts.push(userMemory.summary.slice(0, 200));
  }

  if (mirror) {
    parts.push(`${mirror}, I can hear how much that is affecting you.`);
  } else {
    parts.push(`I want to understand this in your words, not generic advice.`);
  }

  if (themes.length) {
    parts.push(`It sounds like **${themes.slice(0, 2).join('** and **')}** are central here — that's a lot for one person to hold.`);
  }

  if (mlResult.mood === 'overwhelmed' || mlResult.stress_level === 'high') {
    parts.push(`Your stress signals are elevated, which tells me your nervous system has been in overdrive — that's exhausting, not a personal failing.`);
  } else if (mlResult.mood === 'happy' || mlResult.compound > 0.3) {
    parts.push(`There's some positive energy in what you shared too — let's make sure we acknowledge that, not only the hard parts.`);
  }

  if (isFollowUp && lastUser) {
    parts.push(`Earlier you also mentioned things around "${lastUser.slice(0, 60).replace(/"/g, "'")}…" — is that still connected to what's happening now?`);
  }

  parts.push(guide.reframe);

  if (personality === 'analytical') {
    parts.push(`If it helps, we can break this into: (1) facts, (2) fears, and (3) one action in the next 24 hours.`);
  } else if (personality === 'focused') {
    parts.push(`What's the single outcome that would make today feel 10% lighter?`);
  }

  parts.push(guide.close);

  return parts.join('\n\n');
}

module.exports = { generateSmartResponse };
