import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 8_000;

function json(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(JSON.stringify(body));
}

function normalizeInput(raw) {
  if (typeof raw !== "string") throw new Error("URL_REQUIRED");
  const value = raw.trim();
  if (!value || value.length > 2048) throw new Error("URL_INVALID");
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withScheme);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL_INVALID");
  url.username = "";
  url.password = "";
  url.hash = "";
  return url;
}

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 10 ||
    p[0] === 127 ||
    p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 192 && p[1] === 0 && p[2] === 0) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19)) ||
    p[0] >= 224;
}

function isPrivateIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fe8") || v.startsWith("fe9") ||
      v.startsWith("fea") || v.startsWith("feb") || v.startsWith("fc") || v.startsWith("fd") ||
      v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
  }
  return true;
}

async function assertPublicHost(url) {
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("PRIVATE_HOST");
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("PRIVATE_HOST");
    return;
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((r) => isPrivateIp(r.address))) throw new Error("PRIVATE_HOST");
}

async function safeFetch(startUrl, accept) {
  let current = new URL(startUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    await assertPublicHost(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "PWA-QuickKit/1.0 (+https://3b-international.vercel.app/pwa-quickkit/)",
          Accept: accept
        }
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("BAD_REDIRECT");
      current = new URL(location, current);
      continue;
    }

    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("PAGE_TOO_LARGE");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new Error("PAGE_TOO_LARGE");
    return {
      response,
      finalUrl: current,
      text: new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match ? match[1].trim() : "";
}

function findLink(html, relName) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = attr(tag, "rel").toLowerCase().split(/\s+/);
    if (rel.includes(relName)) return attr(tag, "href");
  }
  return "";
}

function hasMeta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some((tag) => {
    const key = (attr(tag, "name") || attr(tag, "property")).toLowerCase();
    return key === name.toLowerCase() && Boolean(attr(tag, "content"));
  });
}

function iconHasSize(icons, target) {
  return icons.some((icon) => String(icon?.sizes || "").toLowerCase().split(/\s+/).includes(target));
}

function grade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

function addCheck(list, id, label, ok, weight, detail, fix) {
  list.push({ id, label, ok: Boolean(ok), weight, detail, fix: ok ? null : fix });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const inputUrl = normalizeInput(body.url);
    const page = await safeFetch(inputUrl, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");

    if (!page.response.ok) {
      return json(res, 422, { error: "SITE_UNREACHABLE", status: page.response.status });
    }

    const html = page.text;
    const checks = [];
    const isHttps = page.finalUrl.protocol === "https:";
    const manifestHref = findLink(html, "manifest");
    const viewport = hasMeta(html, "viewport");
    const themeColor = hasMeta(html, "theme-color");
    const appleTouch = Boolean(findLink(html, "apple-touch-icon"));
    const swHint = /navigator\.serviceWorker|serviceWorker\.register\s*\(/i.test(html);

    let manifest = null;
    let manifestUrl = "";
    let manifestError = "";

    if (manifestHref) {
      try {
        manifestUrl = new URL(manifestHref, page.finalUrl).toString();
        const mf = await safeFetch(manifestUrl, "application/manifest+json,application/json,text/plain;q=0.8");
        if (mf.response.ok) {
          manifest = JSON.parse(mf.text);
        } else {
          manifestError = `HTTP ${mf.response.status}`;
        }
      } catch (error) {
        manifestError = error?.message || "MANIFEST_INVALID";
      }
    }

    const icons = Array.isArray(manifest?.icons) ? manifest.icons : [];
    const has192 = iconHasSize(icons, "192x192");
    const has512 = iconHasSize(icons, "512x512");
    const hasName = Boolean(manifest?.name || manifest?.short_name);
    const display = String(manifest?.display || "").toLowerCase();
    const installDisplay = ["standalone", "fullscreen", "minimal-ui"].includes(display);

    addCheck(checks, "https", "HTTPS", isHttps, 15,
      isHttps ? "Connexion sécurisée." : "Le site final n'est pas servi en HTTPS.",
      "Servir toutes les pages et ressources d'installation en HTTPS.");
    addCheck(checks, "manifest", "Web App Manifest", Boolean(manifest), 20,
      manifest ? "Manifest détecté et lisible." : (manifestHref ? `Manifest détecté mais invalide: ${manifestError}` : "Aucun manifest déclaré."),
      "Ajouter <link rel=\"manifest\" href=\"/manifest.webmanifest\"> et un manifest JSON valide.");
    addCheck(checks, "name", "Nom d'application", hasName, 5,
      hasName ? "name ou short_name présent." : "Nom absent du manifest.",
      "Ajouter name et short_name au manifest.");
    addCheck(checks, "display", "Mode application", installDisplay, 10,
      installDisplay ? `display=${display}` : `display=${display || "absent"}`,
      "Utiliser display: \"standalone\" (ou fullscreen/minimal-ui selon le besoin).");
    addCheck(checks, "icon192", "Icône 192×192", has192, 10,
      has192 ? "Icône 192×192 déclarée." : "Taille 192×192 absente.",
      "Déclarer une icône PNG 192×192 dans manifest.icons.");
    addCheck(checks, "icon512", "Icône 512×512", has512, 10,
      has512 ? "Icône 512×512 déclarée." : "Taille 512×512 absente.",
      "Déclarer une icône PNG 512×512 dans manifest.icons.");
    addCheck(checks, "sw", "Service Worker", swHint, 15,
      swHint ? "Indice d'enregistrement Service Worker trouvé dans le HTML." : "Aucun indice trouvé dans le HTML initial.",
      "Enregistrer un Service Worker et vérifier qu'il contrôle la page. Un audit navigateur complet peut confirmer ce point.");
    addCheck(checks, "viewport", "Viewport mobile", viewport, 5,
      viewport ? "Meta viewport présent." : "Meta viewport absent.",
      "Ajouter <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">.");
    addCheck(checks, "theme", "Couleur système", themeColor, 5,
      themeColor ? "theme-color déclaré." : "theme-color absent.",
      "Ajouter <meta name=\"theme-color\"> et theme_color dans le manifest.");
    addCheck(checks, "apple", "Compatibilité iPhone", appleTouch, 5,
      appleTouch ? "apple-touch-icon déclaré." : "apple-touch-icon absent.",
      "Ajouter une apple-touch-icon 180×180 et les métadonnées iOS utiles.");

    const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
    const recommendations = checks
      .filter((item) => !item.ok)
      .sort((a, b) => b.weight - a.weight)
      .map(({ id, label, weight, fix }) => ({ id, label, impact: weight, fix }));

    return json(res, 200, {
      version: "1.0",
      auditedAt: new Date().toISOString(),
      requestedUrl: inputUrl.toString(),
      finalUrl: page.finalUrl.toString(),
      score,
      grade: grade(score),
      installReady: score >= 80 && Boolean(manifest) && isHttps,
      manifestUrl: manifestUrl || null,
      checks,
      recommendations,
      note: "Le contrôle Service Worker est heuristique dans l'audit gratuit. Le rapport Pro utilisera un navigateur automatisé pour confirmer l'installabilité réelle."
    });
  } catch (error) {
    const code = error?.message || "AUDIT_FAILED";
    const publicCode = [
      "URL_REQUIRED", "URL_INVALID", "PRIVATE_HOST", "PAGE_TOO_LARGE",
      "TOO_MANY_REDIRECTS", "BAD_REDIRECT"
    ].includes(code) ? code : (error?.name === "AbortError" ? "TIMEOUT" : "AUDIT_FAILED");
    return json(res, publicCode === "PRIVATE_HOST" ? 403 : 400, { error: publicCode });
  }
}
