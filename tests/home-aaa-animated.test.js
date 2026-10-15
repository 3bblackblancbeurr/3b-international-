import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const artwork = readFileSync(new URL('../src/components/HomeCinematicArtwork.jsx', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../src/components/WorldPortalCard.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/home-aaa-animated.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('approved scenic screenshot has distinct static scene and moving ring sources', () => {
  assert.match(artwork, /MENU_SCENE_URL\s*=/);
  assert.match(artwork, /MENU_RING_URL\s*=/);
  assert.match(artwork, /className="home-aaa-artwork"/);
  assert.match(artwork, /className="home-aaa-rotating-circle"/);
  assert.match(css, /\.home-aaa-artwork\s*\{[^}]*animation:none/s);
  assert.match(css, /@keyframes threebMenuBrokenCircleTurn/);
  assert.match(css, /rotate\(360deg\)/);
  assert.match(css, /34s linear infinite/);
  assert.doesNotMatch(portal, /<BrokenCircle3D/);
});

test('animation stops off-screen, inside modal, in background or reduced-motion mode', () => {
  assert.match(artwork, /IntersectionObserver/);
  assert.match(artwork, /visibilitychange/);
  assert.match(artwork, /threeb:app-menu-state/);
  assert.match(artwork, /threeb:home-story-state/);
  assert.match(artwork, /!policy\.reduced && !policy\.economical/);
  for (const condition of ['data-visible="false"', 'data-covered="true"', 'data-motion="reduced"']) {
    assert.ok(css.includes(condition), 'missing stop condition: ' + condition);
  }
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('real routes and story modal remain usable independent from artwork', () => {
  assert.match(portal, /aria-labelledby="world-portal-title"/);
  assert.match(portal, /page="world3b"/);
  assert.match(portal, /setStoryOpen\(true\)/);
  assert.match(portal, /<WorldStoryPreview/);
  assert.match(portal, /<Button/);
  assert.match(css, /pointer-events:none/);
  assert.match(main, /styles\/home-aaa-animated\.css/);
});
