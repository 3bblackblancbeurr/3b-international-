// Local-only browser acceptance. All remote services are intercepted with synthetic fixtures.
// PLAYWRIGHT_MODULE may point to a preinstalled Playwright module. No production login is used.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 5194, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const origin = 'http://127.0.0.1:5194';
const destination = process.env.LUXURY_QA_OUTPUT || '/tmp/3b-luxury-qa';
await mkdir(destination, { recursive: true });
const results = [], errors = [];
const check = (label, value) => { assert.ok(value, label); results.push(label); console.log('PASS', label); };
const uid = '11111111-1111-4111-8111-111111111111';
const profile = { user_id: uid, name: 'Membre Démonstration', handle: 'demo_3b', country: 'France', xp: 1800, points: 100, passport_state: 'active', passport_public_id: '22222222-2222-4222-8222-222222222222', passport_version: 1, theme: 'heir', created_at: '2026-01-01T00:00:00Z' };
async function fixture(context, authenticated = false) {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/my-orders') return json({ orders: [] });
    if (url.pathname === '/api/catalog') return json({ enabled: false, items: [], products: [] });
    if (url.origin === origin) return route.continue();
    if (url.pathname.endsWith('/member-api')) return json({ profile, events: [], inventory: [], entitlements: [], identity_claims_complete: true });
    if (url.pathname.endsWith('/rpc/secret3b_daily_status')) return json({ phase: 'waiting', server_now: new Date().toISOString(), message: 'Le signal viendra à son heure.' });
    if (url.pathname.endsWith('/city-3b')) return json({ hasCity: false });
    if (url.pathname.endsWith('/control-center')) return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
    return route.abort();
  });
  if (authenticated) await context.addInitScript(({ uid }) => {
    const token = [btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), btoa(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })), 'synthetic-test'].join('.');
    localStorage.setItem('3b_member_auth_v1', JSON.stringify({ access_token: token, refresh_token: 'synthetic-test', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: uid, aud: 'authenticated', email: 'demo@example.invalid' } }));
  }, { uid });
}
const screenshot = (page, name) => process.env.LUXURY_QA_SCREENSHOTS === '0'
  ? Promise.resolve()
  : page.screenshot({ path: path.join(destination, name), fullPage: false, timeout: 30000 });
try {
  if (process.env.LUXURY_QA_ACCESS_ONLY !== '1') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await fixture(context, true);
  const page = await context.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/#accueil');
  await page.locator('.luxury-hero-art img').waitFor();
  await page.getByRole('link', { name: 'Entrer dans le Monde du 3B' }).first().waitFor();
  check('Desktop has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await screenshot(page, 'home-desktop.png');
  await page.locator('.luxury-realms').scrollIntoViewIfNeeded();
  await page.locator('.luxury-universe-stage[data-live="true"]').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'FR France' }).click();
  check('3D realm selection retains France and its guardian', await page.locator('.luxury-universe-caption').innerText().then(text => text.includes('France') && text.includes('Céliane')));
  await page.getByRole('button', { name: 'Vue du Nexus' }).click();
  await screenshot(page, 'universe-preview.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/#accueil');
  await page.evaluate(() => window.scrollTo(0, 0));
  await screenshot(page, 'home-mobile.png');
  await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: 'Passeport', exact: true }).click();
  await page.getByRole('heading', { name: 'Membre Démonstration' }).waitFor();
  check('Passport contains no button or link', await page.locator('.passport-visual button,.passport-visual a').count() === 0);
  check('Passport retains all 58 Matrix columns', await page.locator('.passport-matrix-stream').count() === 58);
  check('Passport Matrix still animates', await page.locator('.passport-visual').getAttribute('data-animated') === 'true');
  check('Phone has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await screenshot(page, 'passport-mobile.png');
  await page.getByLabel('Réglages de l’expérience').click();
  await page.getByRole('button', { name: 'Réduire les mouvements Non' }).click();
  check('Reduced motion disables Matrix movement without removing the card', await page.locator('.passport-visual').getAttribute('data-animated') === 'false');
  await page.getByRole('button', { name: 'Réduire les mouvements Oui' }).click();
  await page.getByLabel('Réglages de l’expérience').press('Escape');
  await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: 'Boutique', exact: true }).click();
  await page.locator('.luxury-showroom').waitFor();
  check('Phone showroom keeps the product at full width', await page.locator('.luxury-showroom').evaluate(element => element.getBoundingClientRect().width >= 300));
  await page.getByRole('button', { name: 'Explorer les détails' }).click();
  check('Showroom detail view works', await page.locator('.luxury-showroom').getAttribute('data-detail') === 'true');
  await page.locator('.luxury-showroom').scrollIntoViewIfNeeded();
  await screenshot(page, 'showroom-mobile.png');
  await page.getByRole('button', { name: 'Voir la photo du produit en grand' }).click();
  check('Product zoom opens a dialog', await page.getByRole('dialog', { name: 'Photo du Pull 3B International en grand' }).isVisible());
  await page.getByRole('button', { name: 'Fermer la photo' }).click();
  check('Closing product zoom restores scrolling', await page.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden'));
  await page.goto(origin + '/#secret');
  await page.locator('.premier-secret').waitFor();
  await screenshot(page, 'secret-mobile.png');
  check('Secret remains controlled by the daily server state', await page.getByRole('button', { name: /Entrer maintenant/ }).count() === 0);
  await page.goto(origin + '/#accueil');
  await page.getByRole('button', { name: /Créer ma ville/ }).click();
  check('City is accessible from home outside the Passport', await page.getByRole('dialog', { name: 'Passeport 3B · Créer ma ville' }).isVisible());
  await page.getByRole('button', { name: 'Fermer le portail' }).click();
  await context.close();
  }
  const reduced = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  await fixture(reduced);
  const reducedPage = await reduced.newPage(); reducedPage.on('pageerror', error => errors.push(error.message));
  await reducedPage.goto(origin);
  await reducedPage.locator('.home-dashboard').waitFor();
  check('Reduced motion enters directly without a blocking intro', await reducedPage.locator('.luxury-boot').count() === 0);
  check('Reduced motion does not allocate a preview WebGL canvas', await reducedPage.locator('.luxury-universe-canvas canvas').count() === 0);
  check('Small phone remains within viewport', await reducedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await reducedPage.goto(origin + '/#boutique');
  await reducedPage.getByRole('heading', { name: 'Passeport 3B requis' }).waitFor({ timeout: 10000 });
  check('Guest access gate remains functional and does not replay the intro', await reducedPage.locator('.luxury-boot').count() === 0);
  await reduced.close();
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await fixture(fresh);
  const freshPage = await fresh.newPage();
  await freshPage.goto(origin);
  await freshPage.getByRole('button', { name: 'Passer l’introduction' }).click();
  await freshPage.locator('.home-dashboard').waitFor();
  check('Skipping the intro records a cosmetic seen preference', await freshPage.evaluate(() => localStorage.getItem('3b_luxury_intro_v2') === 'seen'));
  await freshPage.goto(origin);
  await freshPage.locator('.home-dashboard').waitFor({ timeout: 3000 });
  check('Return opening reaches home without replaying the full intro', true);
  await fresh.close();
  check('No uncaught application errors', errors.length === 0);
  await writeFile(path.join(destination, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, errors, destination }));
} catch (error) {
  console.error(error);
  for (const context of browser.contexts()) for (const page of context.pages()) { try { await screenshot(page, 'failure.png'); console.error((await page.locator('body').innerText()).slice(0,4500)); } catch {} }
  process.exitCode = 1;
} finally { await browser.close(); server.httpServer?.closeAllConnections(); await server.close(); }
