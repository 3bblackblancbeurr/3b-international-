import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_HTML_BYTES = 1_500_000;
const MAX_MANIFEST_BYTES = 250_000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12_000;

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./,
  /^198\.(18|19)\./,
  /^0\./,
  /^224\./,
  /^240\./,
];

function isPrivateAddress(address) {
  if (!address) return true;
  if (net.isIPv4(address)) return PRIVATE_V4.some(rx => rx.test(address));
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    return a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80:') || a.startsWith('::ffff:127.') || a.startsWith('::ffff:10.') || a.startsWith('::ffff:192.168.');
  }
  return true;
}

async function assertPublicHost(url) {
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Adresse locale ou privée refusée.');
  }
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error('Adresse IP privée refusée.');
    return;
  }
  const answers = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!answers.length || answers.some(a => isPrivateAddress(a.address))) {
    throw new Error('Le domaine pointe vers une adresse privée ou non autorisée.');
  }
}

export function normalizeAuditUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Entre une adresse de site.');
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  const url = new URL(candidate);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Seuls HTTP et HTTPS sont acceptés.');
  url.username = '';
  url.password = '';
  url.hash = '';
  return url;
}

async function safeFetch(url, { maxBytes = MAX_HTML_BYTES } = {}) {
  let current = new URL(url);
  const started = Date.now();
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicHost(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'PWAQuickKit/1.0 (+https://3b-international.vercel.app/pwa-quickkit/)',
          accept: 'text/html,application/manifest+json,application/json;q=0.9,*/*;q=0.1',
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirection invalide.');
      current = new URL(location, current);
      continue;
    }
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxBytes) throw new Error('Réponse trop volumineuse pour être auditée en sécurité.');
    const buf = await response.arrayBuffer();
    if (buf.byteLength > maxBytes) throw new Error('Réponse trop volumineuse pour être auditée en sécurité.');
    return {
      response,
      body: new TextDecoder().decode(buf),
      finalUrl: current,
      ttfbMs: Date.now() - started,
      bytes: buf.byteLength,
    };
  }
  throw new Error('Trop de redirections.');
}

function attr(tag, name) {
  const rx = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  const m = tag.match(rx);
  return m ? m[2].trim() : '';
}

function relTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
}

function metaTags(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
}

function findLink(html, wanted) {
  for (const tag of relTags(html)) {
    const rel = attr(tag, 'rel').toLowerCase().split(/\s+/);
    if (rel.includes(wanted)) return attr(tag, 'href');
  }
  return '';
}

function findMeta(html, name) {
  const target = name.toLowerCase();
  for (const tag of metaTags(html)) {
    const n = (attr(tag, 'name') || attr(tag, 'property')).toLowerCase();
    if (n === target) return attr(tag, 'content');
  }
  return '';
}

function hasHtmlLang(html) {
  const m = html.match(/<html\b[^>]*>/i);
  return Boolean(m && attr(m[0], 'lang'));
}

function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function canonicalOf(html) {
  return findLink(html, 'canonical');
}

function detectServiceWorker(html) {
  const register = html.match(/serviceWorker\s*\.\s*register\s*\(\s*(["'`])([^"'`]+)\1/i);
  return {
    detected: /navigator\s*\.\s*serviceWorker|serviceWorker\s*\.\s*register/i.test(html),
    path: register ? register[2] : '',
  };
}

function parseSizes(value) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .map(v => v.match(/^(\d+)x(\d+)$/))
    .filter(Boolean)
    .map(m => [Number(m[1]), Number(m[2])]);
}

function evaluateManifest(manifest) {
  const icons = Array.isArray(manifest?.icons) ? manifest.icons : [];
  const allSizes = icons.flatMap(icon => parseSizes(icon.sizes));
  const has192 = allSizes.some(([w, h]) => w >= 192 && h >= 192);
  const has512 = allSizes.some(([w, h]) => w >= 512 && h >= 512);
  return {
    valid: Boolean(manifest && typeof manifest === 'object' && !Array.isArray(manifest)),
    hasName: Boolean(manifest?.name || manifest?.short_name),
    hasStartUrl: Boolean(manifest?.start_url),
    standalone: ['standalone', 'fullscreen', 'minimal-ui'].includes(String(manifest?.display || '').toLowerCase()),
    has192,
    has512,
    themeColor: Boolean(manifest?.theme_color),
  };
}

function addCheck(list, id, label, pass, weight, category, detail, fix, priority = 'medium') {
  list.push({ id, label, pass: Boolean(pass), weight, category, detail, fix, priority });
}

function computeCategoryScores(checks) {
  const categories = {};
  for (const check of checks) {
    categories[check.category] ||= { earned: 0, total: 0 };
    categories[check.category].total += check.weight;
    if (check.pass) categories[check.category].earned += check.weight;
  }
  return Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, Math.round((value.earned / value.total) * 100)]));
}

function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

export async function auditPwa(input) {
  const requestedUrl = normalizeAuditUrl(input);
  const page = await safeFetch(requestedUrl);
  const html = page.body;
  const headers = page.response.headers;
  const finalUrl = page.finalUrl;
  const manifestHref = findLink(html, 'manifest');
  const sw = detectServiceWorker(html);
  let manifest = null;
  let manifestError = '';
  let manifestUrl = '';

  if (manifestHref) {
    try {
      manifestUrl = new URL(manifestHref, finalUrl).toString();
      const mf = await safeFetch(manifestUrl, { maxBytes: MAX_MANIFEST_BYTES });
      if (!mf.response.ok) throw new Error(`HTTP ${mf.response.status}`);
      manifest = JSON.parse(mf.body.replace(/^\uFEFF/, ''));
    } catch (error) {
      manifestError = error?.message || 'Manifest illisible';
    }
  }

  const me = evaluateManifest(manifest);
  const checks = [];
  const https = finalUrl.protocol === 'https:';
  const viewport = findMeta(html, 'viewport');
  const themeMeta = findMeta(html, 'theme-color');
  const appleIcon = findLink(html, 'apple-touch-icon');
  const description = findMeta(html, 'description');
  const title = titleOf(html);
  const canonical = canonicalOf(html);
  const hsts = headers.get('strict-transport-security');
  const csp = headers.get('content-security-policy');
  const xcto = headers.get('x-content-type-options');
  const referrer = headers.get('referrer-policy');
  const permissions = headers.get('permissions-policy');
  const encoding = headers.get('content-encoding');
  const mixedContent = /(?:src|href)\s*=\s*["']http:\/\//i.test(html);

  addCheck(checks, 'https', 'HTTPS actif', https, 8, 'Installabilité', https ? 'La page finale est servie en HTTPS.' : 'La page finale reste en HTTP.', 'Activer HTTPS et forcer les redirections HTTP → HTTPS.', 'high');
  addCheck(checks, 'manifest', 'Manifest relié', Boolean(manifestHref), 8, 'Installabilité', manifestHref ? manifestUrl || manifestHref : 'Aucun <link rel="manifest"> détecté.', 'Ajouter <link rel="manifest" href="/manifest.webmanifest">.', 'high');
  addCheck(checks, 'manifest-valid', 'Manifest valide', me.valid, 6, 'Installabilité', me.valid ? 'Le manifest est lisible en JSON.' : manifestError || 'Manifest absent.', 'Servir un manifest JSON valide avec le bon Content-Type.', 'high');
  addCheck(checks, 'manifest-core', 'Nom + start_url', me.hasName && me.hasStartUrl, 5, 'Installabilité', me.hasName && me.hasStartUrl ? 'Nom et start_url présents.' : 'Nom/short_name ou start_url manquant.', 'Ajouter name/short_name et start_url au manifest.', 'high');
  addCheck(checks, 'display', 'Mode application', me.standalone, 4, 'Installabilité', me.standalone ? 'display permet un rendu app.' : 'display standalone/fullscreen/minimal-ui non détecté.', 'Utiliser "display": "standalone" dans le manifest.');
  addCheck(checks, 'icons', 'Icônes 192 + 512', me.has192 && me.has512, 6, 'Installabilité', me.has192 && me.has512 ? 'Tailles principales présentes.' : 'Il faut au minimum des icônes 192x192 et 512x512.', 'Ajouter des icônes PNG 192x192 et 512x512 dans manifest.icons.', 'high');
  addCheck(checks, 'service-worker', 'Service worker détecté', sw.detected, 8, 'Installabilité', sw.detected ? (sw.path ? `Enregistrement détecté : ${sw.path}` : 'API service worker détectée dans le HTML.') : 'Aucun enregistrement détecté dans le HTML initial.', 'Enregistrer un service worker pour le cache/offline. Si l’enregistrement est chargé dans un bundle externe, ce contrôle peut nécessiter une vérification manuelle.', 'high');

  addCheck(checks, 'viewport', 'Viewport mobile', Boolean(viewport), 6, 'Mobile & UX', viewport || 'Meta viewport absente.', 'Ajouter <meta name="viewport" content="width=device-width,initial-scale=1">.', 'high');
  addCheck(checks, 'theme', 'Couleur de thème', Boolean(themeMeta || me.themeColor), 4, 'Mobile & UX', themeMeta || (me.themeColor ? 'Définie dans le manifest.' : 'Non définie.'), 'Ajouter theme-color dans le HTML et le manifest.');
  addCheck(checks, 'apple-icon', 'Icône iPhone/iPad', Boolean(appleIcon), 4, 'Mobile & UX', appleIcon || 'apple-touch-icon absent.', 'Ajouter <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">.');
  addCheck(checks, 'lang', 'Langue du document', hasHtmlLang(html), 3, 'Mobile & UX', hasHtmlLang(html) ? 'Attribut lang présent.' : 'Attribut lang absent sur <html>.', 'Ajouter lang="fr" ou la langue réelle de la page.');
  addCheck(checks, 'description', 'Meta description', Boolean(description), 3, 'Mobile & UX', description || 'Meta description absente.', 'Ajouter une description claire de 120–160 caractères.');

  addCheck(checks, 'hsts', 'HSTS', Boolean(hsts), 4, 'Sécurité', hsts || 'HSTS absent.', 'Ajouter Strict-Transport-Security sur HTTPS.');
  addCheck(checks, 'csp', 'Content-Security-Policy', Boolean(csp), 4, 'Sécurité', csp ? 'CSP présente.' : 'CSP absente.', 'Définir une CSP restrictive et adaptée aux ressources du site.');
  addCheck(checks, 'nosniff', 'X-Content-Type-Options', /nosniff/i.test(xcto || ''), 3, 'Sécurité', xcto || 'En-tête absent.', 'Ajouter X-Content-Type-Options: nosniff.');
  addCheck(checks, 'referrer', 'Referrer-Policy', Boolean(referrer), 2, 'Sécurité', referrer || 'En-tête absent.', 'Ajouter Referrer-Policy: strict-origin-when-cross-origin.');
  addCheck(checks, 'permissions', 'Permissions-Policy', Boolean(permissions), 2, 'Sécurité', permissions ? 'Permissions-Policy présente.' : 'En-tête absent.', 'Limiter caméra, micro et géolocalisation selon les besoins.');

  addCheck(checks, 'html-size', 'HTML léger', page.bytes <= 220_000, 4, 'Performance', `${Math.round(page.bytes / 1024)} Ko HTML`, 'Réduire le HTML initial, différer les blocs lourds et compresser les assets.');
  addCheck(checks, 'ttfb', 'Réponse rapide', page.ttfbMs <= 1200, 4, 'Performance', `${page.ttfbMs} ms jusqu’à la réponse auditée`, 'Optimiser CDN, cache, serveur et appels bloquants.');
  addCheck(checks, 'compression', 'Compression HTTP', Boolean(encoding) || page.bytes < 50_000, 2, 'Performance', encoding ? `Compression: ${encoding}` : 'Aucun Content-Encoding visible.', 'Activer Brotli/gzip pour HTML, JS et CSS lorsque pertinent.');

  addCheck(checks, 'status', 'Page accessible', page.response.ok, 4, 'Qualité', `HTTP ${page.response.status}`, 'Corriger les erreurs HTTP ou redirections cassées.', 'high');
  addCheck(checks, 'title', 'Titre de page', Boolean(title), 2, 'Qualité', title || 'Titre absent.', 'Ajouter un <title> descriptif.');
  addCheck(checks, 'canonical', 'URL canonique', Boolean(canonical), 2, 'Qualité', canonical || 'Lien canonical absent.', 'Ajouter <link rel="canonical" href="https://…">.');
  addCheck(checks, 'mixed', 'Pas de contenu HTTP mixte', !mixedContent, 2, 'Qualité', mixedContent ? 'Références http:// détectées.' : 'Aucune référence http:// évidente dans le HTML initial.', 'Passer toutes les ressources en HTTPS.');

  const totalWeight = checks.reduce((n, c) => n + c.weight, 0);
  const earned = checks.reduce((n, c) => n + (c.pass ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);
  const recommendations = checks
    .filter(c => !c.pass)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))
    .map(c => ({ id: c.id, title: c.label, priority: c.priority, fix: c.fix }));

  return {
    product: 'PWA QuickKit',
    version: '1.0.0',
    auditedAt: new Date().toISOString(),
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    score,
    grade: grade(score),
    categories: computeCategoryScores(checks),
    summary: {
      passed: checks.filter(c => c.pass).length,
      failed: checks.filter(c => !c.pass).length,
      total: checks.length,
      htmlKb: Math.round(page.bytes / 1024),
      responseMs: page.ttfbMs,
      manifestUrl: manifestUrl || null,
      serviceWorkerPath: sw.path || null,
    },
    checks,
    recommendations,
    limitations: [
      'Audit statique : les comportements après interaction utilisateur ne sont pas exécutés.',
      'Un service worker enregistré depuis un bundle JavaScript externe peut nécessiter une vérification manuelle.',
      'Les performances mesurées correspondent à la requête du serveur d’audit, pas à un Lighthouse navigateur complet.',
    ],
  };
}
