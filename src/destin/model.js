// Shared by the browser, the API and the tests. No browser globals here.
export const DESTIN_TAGLINE = 'Tu ne regardes pas l’histoire. Tu la décides.';
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MEDIA_TYPES = Object.freeze({ 'video/mp4':'mp4', 'video/webm':'webm', 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'text/vtt':'vtt' });
export const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
export const STORAGE_SOURCE = /^storage:([0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:mp4|webm|jpg|jpeg|png|webp|vtt))$/;
export function mediaPath(source) { return STORAGE_SOURCE.exec(String(source || ''))?.[1] || null; }
export function safeMedia(source, optional = false) {
  if (!source) return optional;
  if (typeof source !== 'string' || source.length > 2048) return false;
  if (mediaPath(source)) return true;
  try { const u = new URL(source); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
export function newScene(id = 'scene-1') {
  return { id, title:'Nouvelle scène', src:'', start:0, end:30, question:'Quel chemin choisis-tu ?', timeout:0, defaultChoice:'', caption:'', choices:[], ending:null };
}
export function newManifest() {
  return { schema:1, title:'Mon premier destin', synopsis:'', cover:'', entry:'intro', nodes:[
    { ...newScene('intro'), title:'Le premier choix', timeout:5, defaultChoice:'a', choices:[
      {id:'a',label:'Ouvrir la porte',target:'fin-a',minLevel:1,requiresEnding:''},
      {id:'b',label:'Suivre la lumière',target:'fin-b',minLevel:1,requiresEnding:''}
    ] },
    { ...newScene('fin-a'), title:'La porte', end:20, question:'', ending:{id:'porte',title:'Une porte s’ouvre',fragment:'',rarity:'standard',reward:false} },
    { ...newScene('fin-b'), title:'La lumière', end:20, question:'', ending:{id:'lumiere',title:'Un autre horizon',fragment:'',rarity:'rare',reward:false} }
  ] };
}
export function validateManifest(m, { preview = false } = {}) {
  const errors = [], add = text => errors.push(text), text = (v,max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['Projet illisible.'];
  if (m.schema !== 1) add('Version de projet non prise en charge.');
  if (!text(m.title,100)) add('Le titre doit contenir de 1 à 100 caractères.');
  if (typeof m.synopsis !== 'string' || m.synopsis.length > 1200) add('La présentation est limitée à 1 200 caractères.');
  if (!safeMedia(m.cover,true)) add('L’affiche doit être un média importé ou une adresse HTTPS.');
  if (!Array.isArray(m.nodes) || m.nodes.length < 1 || m.nodes.length > 64) return [...errors,'Prévois entre 1 et 64 scènes.'];
  const map = new Map(), ends = new Set();
  for (const node of m.nodes) {
    if (!node || typeof node !== 'object') { add('Une scène est illisible.'); continue; }
    const name = node.title || node.id || 'Scène';
    if (!ID.test(node.id || '') || map.has(node.id)) add(`${name} : identifiant invalide ou en double.`);
    map.set(node.id,node);
    if (!text(node.title,100)) add(`${name} : donne un titre à la scène.`);
    if (!(preview && node.demo === true) && !safeMedia(node.src)) add(`${name} : ajoute une vidéo MP4 ou WebM.`);
    if (!safeMedia(node.caption,true)) add(`${name} : sous-titres invalides.`);
    if (!Number.isFinite(node.start) || !Number.isFinite(node.end) || node.start < 0 || node.end <= node.start || node.end > 14400 || node.end - node.start > 900) add(`${name} : vérifie les secondes de début et de fin (15 minutes maximum par scène).`);
    if (!Array.isArray(node.choices) || node.choices.length > 4) { add(`${name} : quatre réponses maximum.`); continue; }
    if (node.ending) {
      if (node.choices.length) add(`${name} : une fin ne peut pas contenir de choix.`);
      const e = node.ending;
      if (!ID.test(e.id || '') || ends.has(e.id)) add(`${name} : identifiant de fin invalide ou en double.`);
      ends.add(e.id);
      if (!text(e.title,120) || typeof e.fragment !== 'string' || e.fragment.length > 100 || !['standard','rare','secret'].includes(e.rarity) || typeof e.reward !== 'boolean') add(`${name} : complète les informations de la fin.`);
    } else {
      if (node.choices.length < 2) add(`${name} : ajoute deux à quatre réponses ou transforme cette scène en fin.`);
      if (!text(node.question,240)) add(`${name} : écris la question.`);
      const seen = new Set();
      for (const c of node.choices) {
        if (!c || !ID.test(c.id || '') || seen.has(c.id) || !text(c.label,100) || !ID.test(c.target || '')) { add(`${name} : une réponse est incomplète ou en double.`); continue; }
        seen.add(c.id);
        if (!Number.isInteger(c.minLevel) || c.minLevel < 1 || c.minLevel > 1000 || typeof c.requiresEnding !== 'string') add(`${name} : condition de déblocage invalide.`);
      }
      if (!node.choices.some(c => c && c.minLevel === 1 && !c.requiresEnding)) add(`${name} : conserve au moins une réponse accessible à tous.`);
      if (!Number.isInteger(node.timeout) || (node.timeout !== 0 && (node.timeout < 5 || node.timeout > 60))) add(`${name} : délai de 5 à 60 secondes, ou zéro sans limite.`);
      if (node.timeout > 0 && !node.choices.some(c => c.id === node.defaultChoice && c.minLevel === 1 && !c.requiresEnding)) add(`${name} : choisis une réponse automatique accessible à tous.`);
    }
  }
  if (!map.has(m.entry)) add('La scène de départ n’existe pas.');
  if (!ends.size) add('Ajoute au moins une fin.');
  for (const node of m.nodes) for (const c of node?.choices || []) {
    if (!map.has(c?.target)) add(`${node.title} : la scène liée à « ${c?.label || 'réponse'} » n’existe pas.`);
    if (c?.requiresEnding && !ends.has(c.requiresEnding)) add(`${node.title} : la fin requise n’existe pas.`);
  }
  // A finite graph prevents circular stories, soft locks and unbounded sessions.
  const visited = new Set(), visiting = new Set();
  function walk(id) {
    if (visiting.has(id)) { add('Une boucle relie plusieurs scènes. Chaque parcours doit conduire à une fin.'); return; }
    if (visited.has(id) || !map.has(id)) return;
    visiting.add(id);
    for (const c of map.get(id)?.choices || []) walk(c?.target);
    visiting.delete(id); visited.add(id);
  }
  walk(m.entry);
  if (visited.size < map.size) add('Certaines scènes sont isolées. Relie-les au parcours ou retire-les.');
  return [...new Set(errors)];
}
export function choiceLock(choice, { level = 1, unlocked = [] } = {}) {
  if (level < choice.minLevel) return `Niveau ${choice.minLevel} requis`;
  if (choice.requiresEnding && !unlocked.includes(choice.requiresEnding)) return 'Une autre fin doit d’abord être découverte';
  return '';
}
export function formatTime(seconds) {
  const s = Math.max(0,Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`;
}
export function collectMedia(manifest) {
  return [...new Set([manifest?.cover,...(manifest?.nodes || []).flatMap(n => [n.src,n.caption])].filter(Boolean))];
}
export function validatePoll(p) {
  if (!p || typeof p.question !== 'string' || !p.question.trim() || p.question.length > 240) return 'Écris une question de 240 caractères maximum.';
  if (!Array.isArray(p.options) || p.options.length < 2 || p.options.length > 4) return 'Prévois deux à quatre réponses.';
  const ids = new Set();
  for (const o of p.options) {
    if (!o || !ID.test(o.id || '') || ids.has(o.id) || typeof o.label !== 'string' || !o.label.trim() || o.label.length > 100) return 'Les réponses doivent être distinctes et complètes.';
    ids.add(o.id);
  }
  if (!Number.isFinite(Date.parse(p.closesAt))) return 'Choisis une date de clôture.';
  return '';
}
export function demoManifest() {
  const m = newManifest();
  m.title = 'Le premier seuil'; m.synopsis = 'Démonstration interactive — aucun film ni gain fictif.';
  m.nodes.forEach(n => { n.demo = true; n.end = 4; });
  m.nodes[0].title = 'Deux voies. Une décision.';
  m.nodes[0].question = 'La porte s’éveille. Que décides-tu ?';
  m.nodes[0].timeout = 0;
  return m;
}
