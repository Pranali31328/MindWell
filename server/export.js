/**
 * Wellness report export — JSON payload + printable HTML.
 */

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function gatherExportData(prisma, userId, predictBurnoutML) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, profession: true, personality: true, createdAt: true },
  });
  if (!user) return null;

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { startTime: 'desc' },
    take: 20,
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
        include: { emotionMetrics: true },
        take: 80,
      },
    },
  });

  const journalEntries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const goals = await prisma.userGoal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const moodCheckIns = await prisma.moodCheckIn.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  let memory = await prisma.userMemory.findUnique({ where: { userId } });
  if (memory) {
    memory = {
      summary: memory.summary,
      topics: JSON.parse(memory.topics || '[]'),
      keyFacts: JSON.parse(memory.keyFacts || '[]'),
      updatedAt: memory.updatedAt,
    };
  }

  let totalMessages = 0;
  let moodDistribution = {};
  let wellnessScores = [];
  let crisisScores = [];
  const stressTrend = [];
  const recentTexts = [];

  sessions.forEach(session => {
    session.messages.forEach(msg => {
      totalMessages++;
      if (msg.sender === 'user') {
        recentTexts.push(msg.text);
        if (msg.emotionMetrics) {
          const em = msg.emotionMetrics;
          moodDistribution[em.currentMood] = (moodDistribution[em.currentMood] || 0) + 1;
          wellnessScores.push(em.wellnessScore);
          crisisScores.push(em.crisisScore);
          stressTrend.push({
            date: msg.timestamp,
            stressScore: em.stressScore,
            wellnessScore: em.wellnessScore,
            mood: em.currentMood,
          });
        }
      }
    });
  });

  const avgWellness = wellnessScores.length
    ? Math.round(wellnessScores.reduce((a, b) => a + b, 0) / wellnessScores.length)
    : null;
  const avgCrisis = crisisScores.length
    ? Math.round(crisisScores.reduce((a, b) => a + b, 0) / crisisScores.length)
    : null;
  const avgStress = stressTrend.length
    ? Math.round(stressTrend.reduce((a, b) => a + b.stressScore, 0) / stressTrend.length)
    : 30;

  const compounds = sessions.flatMap(s =>
    s.messages.filter(m => m.sender === 'user' && m.emotionMetrics?.compound != null)
      .map(m => m.emotionMetrics.compound)
  );
  const avgCompound = compounds.length
    ? compounds.reduce((a, b) => a + b, 0) / compounds.length
    : 0;

  const burnout = predictBurnoutML
    ? await predictBurnoutML({
        avg_stress_score: avgStress,
        avg_crisis_risk: avgCrisis || 20,
        avg_wellness_score: avgWellness || 70,
        avg_compound: avgCompound,
        message_count: recentTexts.length,
        overwhelmed_ratio: 0,
        recent_texts: recentTexts.slice(-12),
      })
    : null;

  const chatHighlights = sessions.slice(0, 5).map(s => ({
    id: s.id,
    startTime: s.startTime,
    therapyMethod: s.therapyMethod,
    messageCount: s.messages.length,
    preview: s.messages.find(m => m.sender === 'user')?.text?.slice(0, 120) || '',
  }));

  return {
    exportedAt: new Date().toISOString(),
    app: 'MindWell AI',
    user: {
      name: user.name,
      profession: user.profession,
      personality: user.personality,
      memberSince: user.createdAt,
    },
    analytics: {
      totalSessions: sessions.length,
      totalMessages,
      avgWellness,
      avgCrisis,
      moodDistribution,
      stressTrend: stressTrend.slice(-15),
      burnout,
    },
    memory,
    journal: journalEntries.map(e => ({
      createdAt: e.createdAt,
      mood: e.mood,
      text: e.text,
      copingTip: e.copingTip,
      tags: e.tags ? JSON.parse(e.tags) : [],
    })),
    goals: goals.map(g => ({
      title: g.title,
      category: g.category,
      completed: g.completed,
      completedAt: g.completedAt,
    })),
    moodCheckIns: moodCheckIns.map(c => ({
      moodIndex: c.moodIndex,
      moodLabel: c.moodLabel,
      createdAt: c.createdAt,
    })),
    chatHighlights,
  };
}

function buildHtmlReport(data) {
  const b = data.analytics?.burnout || {};
  const moods = Object.entries(data.analytics?.moodDistribution || {})
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`)
    .join('');

  const journalRows = (data.journal || []).slice(0, 10).map(e => `
    <div class="entry">
      <div class="meta">${new Date(e.createdAt).toLocaleDateString()} · ${escapeHtml(e.mood || '—')}</div>
      <p>${escapeHtml(e.text)}</p>
      ${e.copingTip ? `<p class="tip">💡 ${escapeHtml(e.copingTip)}</p>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>MindWell Report — ${escapeHtml(data.user?.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #062822; background: #fafafd; margin: 0; padding: 40px; }
    .header { background: linear-gradient(135deg, #02040a, #007a67); color: #fff; padding: 32px 40px; border-radius: 16px; margin-bottom: 28px; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; opacity: 0.85; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .card { background: #fff; border: 1px solid #d8f0ec; border-radius: 12px; padding: 20px; }
    .card h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #6aada0; }
    .card .val { font-size: 32px; font-weight: 800; color: #007a67; }
    section { background: #fff; border: 1px solid #d8f0ec; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    section h2 { margin: 0 0 16px; font-size: 18px; color: #007a67; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; }
    .entry { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
    .entry .meta { font-size: 11px; color: #6aada0; margin-bottom: 6px; }
    .entry p { margin: 0; font-size: 13px; line-height: 1.6; }
    .tip { color: #5548c4; font-style: italic; margin-top: 8px !important; }
    .memory { font-size: 14px; line-height: 1.7; }
    .tag { display: inline-block; background: #e8f8f5; padding: 4px 10px; border-radius: 20px; font-size: 11px; margin: 4px 4px 0 0; }
    .footer { text-align: center; font-size: 11px; color: #6aada0; margin-top: 32px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>MindWell Wellness Report</h1>
    <p>${escapeHtml(data.user?.name)}${data.user?.profession ? ` · ${escapeHtml(data.user.profession)}` : ''} · Generated ${new Date(data.exportedAt).toLocaleString()}</p>
  </div>

  <div class="grid">
    <div class="card"><h3>Wellness Score</h3><div class="val">${data.analytics?.avgWellness ?? '—'}${data.analytics?.avgWellness != null ? '%' : ''}</div></div>
    <div class="card"><h3>Burnout Risk</h3><div class="val" style="color:${b.burnout_risk >= 70 ? '#ff6b6b' : '#007a67'}">${b.burnout_risk ?? '—'}${b.burnout_risk != null ? '%' : ''}</div></div>
    <div class="card"><h3>Sessions</h3><div class="val">${data.analytics?.totalSessions ?? 0}</div></div>
  </div>

  ${b.recommendation ? `<section><h2>Burnout Insight</h2><p>${escapeHtml(b.recommendation)}</p></section>` : ''}

  ${data.memory?.summary ? `<section><h2>AI Memory Summary</h2><p class="memory">${escapeHtml(data.memory.summary)}</p>
    ${(data.memory.topics || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
  </section>` : ''}

  <section><h2>Mood Distribution</h2>
    <table><thead><tr><th>Mood</th><th>Count</th></tr></thead><tbody>${moods || '<tr><td colspan="2">No data yet</td></tr>'}</tbody></table>
  </section>

  <section><h2>Journal Highlights</h2>${journalRows || '<p>No journal entries.</p>'}</section>

  <section><h2>Goals</h2>
    <ul>${(data.goals || []).map(g => `<li>${g.completed ? '✅' : '○'} ${escapeHtml(g.title)}</li>`).join('') || '<li>No goals set</li>'}</ul>
  </section>

  <p class="footer">MindWell AI — For wellness awareness only. Not medical advice.</p>
  <p class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:12px 28px;background:#007a67;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Save as PDF (Print)</button>
  </p>
</body>
</html>`;
}

module.exports = { gatherExportData, buildHtmlReport, escapeHtml };
