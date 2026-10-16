// Browser QA for 3B Santé on a local Vite instance (no production writes).
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const server = await createServer({ server: { host: '127.0.0.1', port: 5327, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const origin = 'http://127.0.0.1:5327';
const out = process.env.HEALTH_UI_OUT || '/tmp/3b-health-browser';
await mkdir(out, { recursive: true });
const checks = [], errors = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); console.log('PASS', name); };
try {
  for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', isMobile: true, hasTouch: true, locale: 'fr-FR' });
    await context.addInitScript(() => {
      localStorage.setItem('threeb_companion_prefs_v1', JSON.stringify({ enabled: false }));
      localStorage.setItem('threeb_companion_living_v1', JSON.stringify({ voiceEnabled: false }));
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'application/json', body: '{}' });
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(viewport.width + ': ' + error.message));
    try {
      await page.goto(origin + '/#sante');
      await page.locator('.health3b').waitFor({ state: 'visible' });
      check('Santé loads without crashing ' + viewport.width, await page.locator('.app-crash').count() === 0);
      check('Navigation retains five focused areas ' + viewport.width, await page.locator('.h-nav button').count() === 5);
      check('Today viewport has no horizontal overflow ' + viewport.width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: out + '/sante-jour-' + viewport.width + '.png' });
      await page.locator('.h-nav button').filter({ hasText: 'Manger' }).click();
      await page.locator('.h-atlas').waitFor({ state: 'visible' });
      check('All existing food cards are available ' + viewport.width, await page.locator('.h-atlas-grid-item').count() >= 24);
      check('Carrot has a tappable food card ' + viewport.width, await page.getByRole('button', { name: 'Fiche complète : Carotte' }).count() === 1);
      check('Food page has no horizontal overflow ' + viewport.width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: out + '/sante-atlas-' + viewport.width + '.png' });
      await page.getByRole('button', { name: 'Fiche complète : Carotte' }).click();
      const dialog = page.locator('dialog.h-sheet--nutrition');
      await dialog.waitFor({ state: 'visible' });
      check('Food details use a real modal ' + viewport.width, await dialog.evaluate(el => el.matches(':modal')));
      check('Carrot displays 33 kcal/100g ' + viewport.width, await dialog.locator('.h-nutrition-energy strong').innerText() === '33');
      check('Carrot displays the referenced vitamin A ' + viewport.width, await dialog.getByText('Vitamine A (équivalent rétinol)').isVisible());
      check('Food modal fits viewport ' + viewport.width, await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; }));
      await dialog.getByRole('button', { name: '150 g' }).click();
      check('150g nutrition scaling is real ' + viewport.width, await dialog.locator('.h-nutrition-energy strong').innerText() === '49,5');
      await dialog.getByRole('button', { name: 'Pour le corps' }).click();
      const claim = await dialog.locator('.h-nutrition-body-feature').innerText();
      check('Eyes guidance avoids cure claims ' + viewport.width, claim.includes('vitamine A') && claim.includes('n’améliore pas'));
      await page.screenshot({ path: out + '/sante-carotte-' + viewport.width + '.png' });
      await dialog.getByRole('button', { name: 'En cuisine' }).click();
      check('Cooking details and cautions included ' + viewport.width, await dialog.locator('.h-nutrition-kitchen li').count() >= 3);
      await dialog.getByRole('button', { name: 'Fermer la fiche' }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.getByRole('searchbox', { name: 'Rechercher un fruit ou un légume' }).fill('vitamine C');
      const found = await page.locator('.h-atlas-grid-item').count();
      check('Vitamin search filters the collection ' + viewport.width, found > 0 && found < 24);
      check('No uncaught browser exceptions ' + viewport.width, errors.length === 0);
    } catch (error) {
      console.error('BROWSER ERRORS', JSON.stringify(errors));
      console.error('BODY TEXT', (await page.locator('body').innerText().catch(() => 'unavailable')).slice(0, 2600));
      await page.screenshot({ path: out + '/sante-failed-' + viewport.width + '.png' }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  await writeFile(out + '/results.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors, output: out }));
} finally { await browser.close(); await server.close(); }
