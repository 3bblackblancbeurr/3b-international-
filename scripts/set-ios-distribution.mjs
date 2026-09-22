import {readFileSync, writeFileSync} from 'node:fs';

const file = new URL('../public/ios-distribution.json', import.meta.url);
const args = process.argv.slice(2);
const values = {};

for (let i = 0; i < args.length; i += 1) {
  const key = args[i];
  const value = args[i + 1];
  if (!key.startsWith('--') || !value || value.startsWith('--')) {
    console.error('Usage: npm run ios:distribution -- --testflight https://testflight.apple.com/join/... [--app-store https://apps.apple.com/...] [--web https://...]');
    process.exit(1);
  }
  values[key.slice(2)] = value;
  i += 1;
}

const config = JSON.parse(readFileSync(file, 'utf8'));

function verifiedHttps(value, label, allowedHost) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error(label + ' doit utiliser HTTPS.');
  if (allowedHost && url.hostname !== allowedHost) throw new Error(label + ' doit utiliser le domaine officiel ' + allowedHost + '.');
  return url.href;
}

if (values.testflight) config.testflightUrl = verifiedHttps(values.testflight, 'TestFlight', 'testflight.apple.com');
if (values['app-store']) config.appStoreUrl = verifiedHttps(values['app-store'], 'App Store', 'apps.apple.com');
if (values.web) config.webDistributionUrl = verifiedHttps(values.web, 'Distribution web Apple');
if (values.clear === 'all') {
  config.testflightUrl = '';
  config.appStoreUrl = '';
  config.webDistributionUrl = '';
}

if (!values.testflight && !values['app-store'] && !values.web && values.clear !== 'all') {
  console.error('Aucun lien fourni.');
  process.exit(1);
}

config.updatedAt = new Date().toISOString().slice(0, 10);
writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log('Distribution iOS mise à jour :', config);
