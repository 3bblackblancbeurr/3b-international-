import {readFileSync} from 'node:fs';

const host = '3b-international.vercel.app';
const key = '3b-indexnow-20260922-a7f42c8d10e65b91';
const origin = 'https://' + host;
const keyLocation = origin + '/' + key + '.txt';
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map(match => match[1]);

if (!urlList.length) {
  console.error('IndexNow: aucune URL trouvée dans le sitemap.');
  process.exit(1);
}

let keyReady = false;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    const response = await fetch(keyLocation, {cache: 'no-store'});
    const body = response.ok ? (await response.text()).trim() : '';
    if (body === key) {
      keyReady = true;
      break;
    }
  } catch {}
  if (attempt < 12) await new Promise(resolve => setTimeout(resolve, 10000));
}

if (!keyReady) {
  console.warn('IndexNow: la clé publique n’est pas encore disponible en production. Une exécution ultérieure réessaiera.');
  process.exit(0);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: {'content-type': 'application/json; charset=utf-8'},
  body: JSON.stringify({host, key, keyLocation, urlList}),
});

if ([200, 202].includes(response.status)) {
  console.log('IndexNow: ' + urlList.length + ' URL envoyées (HTTP ' + response.status + ').');
  process.exit(0);
}

if (response.status === 429) {
  console.warn('IndexNow: limite temporaire atteinte (HTTP 429). Une prochaine exécution réessaiera.');
  process.exit(0);
}

const detail = await response.text().catch(() => '');
console.error('IndexNow: échec HTTP ' + response.status + ' ' + detail);
process.exit(1);
