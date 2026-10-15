/** Pure documentary helpers. Never mutate the preserved source corpus. */
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function splitSpeech(text, limit = 240) {
  if (!Number.isInteger(limit) || limit < 32) throw new RangeError('Speech chunk limit must be at least 32.');
  const words = String(text ?? '').trim().split(/\s+/u).filter(Boolean), chunks = [];
  let chunk = '';
  for (let word of words) {
    if (word.length > limit) {
      if (chunk) { chunks.push(chunk); chunk = ''; }
      while (word.length > limit) { chunks.push(word.slice(0, limit)); word = word.slice(limit); }
    }
    if (!word) continue;
    if (chunk && chunk.length + word.length + 1 > limit) { chunks.push(chunk); chunk = ''; }
    chunk += (chunk ? ' ' : '') + word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
export function spokenBiography(node) {
  return [node?.name, node?.bio, ...(node?.sections || []).flatMap(s => [s.title, s.text]), node?.note].filter(Boolean).join('. ');
}
/** Each result retains its actual edge trail. A shortest graph path is NOT a historical proof. */
export function traceRelations(corpus, selected, direction = 'ancestors', includeLiterary = false) {
  if (!['ancestors', 'descendants'].includes(direction)) throw new RangeError('Unknown direction');
  const nodes = new Map((corpus.nodes || []).map(n => [n.id, n]));
  if (!nodes.has(selected)) return [];
  const adjacency = new Map();
  for (const edge of corpus.edges || []) {
    if (edge.kind !== 'parent' && !(includeLiterary && edge.kind === 'lineage')) continue;
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    const from = direction === 'ancestors' ? edge.target : edge.source;
    const to = direction === 'ancestors' ? edge.source : edge.target;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({id:to, edge});
  }
  const seen = new Set([selected]), queue = [{id:selected, trail:[]}], results = [];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const next of adjacency.get(current.id) || []) {
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      const trail = [...current.trail, next.edge];
      results.push({node:nodes.get(next.id), steps:trail.length, literary:trail.some(e => e.kind === 'lineage'), trail});
      queue.push({id:next.id, trail});
    }
  }
  return results;
}
export function exportRecord(corpus, id) {
  const person = corpus.nodes.find(n => n.id === id);
  if (!person) return null;
  const relationships = corpus.edges.filter(e => e.source === id || e.target === id);
  return JSON.parse(JSON.stringify({schema:'3b-religion-documentary/1', scope:'Notice et liens du corpus. Ni généalogie exhaustive ni preuve biologique.', person, relationships}));
}
export function availableStops(corpus, ids) {
  const present = new Set(corpus.nodes.map(n => n.id));
  return [...new Set(ids)].filter(id => present.has(id));
}
/** One cancellable queue prevents long mobile utterances and stale onend callbacks. */
export function createNarrator(synthesis, Utterance, onState = () => {}) {
  let generation = 0, chunks = [], index = 0, active = null, state = 'idle', rate = 1;
  const notify = next => { state = next; onState({state, index, total:chunks.length}); };
  function stop() { generation++; active = null; synthesis?.cancel(); chunks = []; index = 0; notify('idle'); }
  function speakNext(token) {
    if (token !== generation) return;
    if (index >= chunks.length) { active = null; notify('ended'); return; }
    active = new Utterance(chunks[index]); active.lang = 'fr-FR'; active.rate = rate;
    const voice = synthesis.getVoices?.().find(v => /^fr(?:[-_]|$)/i.test(v.lang));
    if (voice) active.voice = voice;
    active.onend = () => { if (token === generation) { index++; speakNext(token); } };
    active.onerror = () => { if (token === generation) { generation++; active = null; notify('error'); } };
    notify('reading'); synthesis.speak(active);
  }
  return {
    start(text, speed = 1) {
      stop(); if (!synthesis || !Utterance) { notify('unavailable'); return; }
      chunks = splitSpeech(text); rate = Math.min(1.3, Math.max(.75, Number(speed) || 1));
      speakNext(generation);
    },
    togglePause() {
      if (state === 'reading') { synthesis.pause(); notify('paused'); }
      else if (state === 'paused') { synthesis.resume(); notify('reading'); }
    },
    stop,
  };
}
