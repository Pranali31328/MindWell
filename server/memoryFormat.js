/** Prompt formatting for user memory (no imports from gemini/memory). */

function formatMemoryForPrompt(memory) {
  if (!memory?.summary && !(memory?.topics?.length)) return '';
  const facts = (memory.keyFacts || [])
    .slice(0, 3)
    .map(f => `- ${f.text}`)
    .join('\n');
  return `
Long-term memory (use naturally, do not say "I remember from database"):
Summary: ${memory.summary || 'No prior summary yet.'}
Topics: ${(memory.topics || []).join(', ') || 'none yet'}
${facts ? `Recent statements:\n${facts}` : ''}`.trim();
}

module.exports = { formatMemoryForPrompt };
