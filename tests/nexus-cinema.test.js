import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NEXUS_WORLDS } from '../src/components/nexus-worlds.js';
import { NEXUS_CINEMA_GATES, nexusDoorImage, nexusHotspotStyle } from '../src/components/nexus-cinema.js';

test('cinema hotspots preserve all eight established country destinations', () => {
  assert.deepEqual(Object.keys(NEXUS_CINEMA_GATES), NEXUS_WORLDS.map(w => w.code));
  for (const code of Object.keys(NEXUS_CINEMA_GATES)) {
    const [x,y,w,h]=NEXUS_CINEMA_GATES[code];
    assert.ok(x>=0 && y>=0 && x+w<=941 && y+h<=1116);
    assert.ok(w/941*288>=40 && h/1116*341>=44);
    assert.match(nexusDoorImage(code), /^\/nexus\/cinema-v1\/[A-Z]{2}\.webp$/);
    assert.match(nexusHotspotStyle(code).left, /%$/);
  }
});
test('unknown visual selectors cannot resolve to a real unlocked country', () => {
  for(const code of ['ORIGINE','ORIGIN','__proto__','constructor','../../x',null,undefined]) {
    assert.equal(nexusDoorImage(code),null);assert.equal(nexusHotspotStyle(code),null);
  }
});
test('all reference assets are local WebP files, hash-verified and within budget', () => {
  const root=new URL('../public/nexus/cinema-v1/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  assert.equal(manifest.sourceSha256,'bee77ce31f829943bf157cf55e3397eaa8dd21375298a96f2bc88390066edb97');
  assert.equal(Object.keys(manifest.assets).length,10);
  let total=0;
  for(const [name,asset] of Object.entries(manifest.assets)) {
    const data=readFileSync(new URL(name,root));total+=data.length;
    assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
  }
  assert.ok(total<750000);assert.ok(manifest.assets['hall-mobile.webp'].bytes<250000);
});
test('cinematic rendering still uses the canonical journey and offers a real 3D view', () => {
  const source=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
  assert.match(source,/useNexusJourney\(\{ open, onClose, goTo \}\)/);
  assert.match(source,/journey\.travel\('ORIGINE'\)/);
  assert.match(source,/setArrivalCode\(active\.code\)/);
  assert.match(source,/journey\.travel\(code\)/);
  assert.match(source,/NexusCountryArrival/);
  assert.match(source,/originEnabled=\{journey\.originEnabled\}/);
  assert.match(source,/Voir le sanctuaire en 3D/);
  assert.doesNotMatch(source,/localStorage\.clear|sessionStorage\.clear/);
});
test('premium transit keeps depth, speed, country panels and mobile motion safeguards', () => {
  const source=readFileSync(new URL('../src/components/NexusCinema.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles/nexus-cinema-polish.css',import.meta.url),'utf8');
  for (const layer of ['nexus-transit-horizon','nexus-transit-depth','nexus-transit-streaks','nexus-transit-glyphs','nexus-transit-core','nexus-transit-flare','nexus-transit-vignette']) assert.match(source,new RegExp(layer));
  assert.match(source,/TRANSIT_RINGS/);assert.match(source,/TRANSIT_STREAKS/);assert.match(source,/TRANSIT_GLYPHS/);
  assert.match(source,/nexus-transit-panel-scan/);assert.match(source,/>\{world\.code\}<\/small>/);
  assert.match(css,/@keyframes nexus-depth-ring/);assert.match(css,/@keyframes nexus-streak-flight/);assert.match(css,/@keyframes nexus-core-approach/);
  assert.match(css,/@media\(max-width:759px\)/);assert.match(css,/nexus-transit-streaks>i:nth-child\(n\+19\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/data-calm='true'/);
  assert.doesNotMatch(source,/requestAnimationFrame|setInterval/);
});
test('Passport portal and recognition scan are premium but motion-safe', () => {
  const source=readFileSync(new URL('../src/components/NexusCinema.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles/nexus-portal-v4.css',import.meta.url),'utf8');
  assert.match(source,/nexus-portal-v4\.css/);
  assert.match(css,/\.passport-portal-trigger::before/);assert.match(css,/\.passport-portal-trigger::after/);assert.match(css,/nexus-passport-pulse/);
  assert.match(css,/data-phase='scan'.*nexus-arrival-mark/s);assert.match(css,/nexus-recognition-scan/);
  assert.match(css,/data-phase='tunnel'.*nexus-arrival-mark/s);assert.match(css,/nexus-recognition-release/);
  assert.match(css,/@media\(max-width:759px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/data-calm='true'/);
  assert.doesNotMatch(css,/position:\s*fixed/);
});
test('V5 adds radar, optical lattice and reveal bloom without changing journey logic', () => {
  const source=readFileSync(new URL('../src/components/NexusCinema.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles/nexus-portal-v5.css',import.meta.url),'utf8');
  assert.match(source,/nexus-portal-v5\.css/);
  for(const signature of ['nexus-v5-passport-core','nexus-v5-radar-turn','nexus-v5-field-scan','nexus-v5-lattice-flight','nexus-v5-iris-drive','nexus-v5-reveal-bloom']) assert.match(css,new RegExp(signature));
  assert.match(css,/data-phase='scan'.*nexus-arrival::before/s);assert.match(css,/data-phase='tunnel'.*nexus-transit-decor::before/s);assert.match(css,/data-phase='nexus'.*nexus-stage::after/s);
  assert.match(css,/@media\(max-width:759px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/data-calm='true'/);assert.match(css,/passport-visual\[data-animated="false"\]/);
  assert.doesNotMatch(css,/position:\s*fixed/);assert.doesNotMatch(css,/requestAnimationFrame|setInterval/);
});
test('V7 uses the authentic Nexus circle, twin spark spirals and direct country handoff', () => {
  const cinema=readFileSync(new URL('../src/components/NexusCinema.jsx',import.meta.url),'utf8');
  const circle=readFileSync(new URL('../src/styles/nexus-v7-circle.css',import.meta.url),'utf8');
  const tunnel=readFileSync(new URL('../src/styles/nexus-v7-tunnel.css',import.meta.url),'utf8');
  const doors=readFileSync(new URL('../src/styles/nexus-v7-doors.css',import.meta.url),'utf8');
  const arrival=readFileSync(new URL('../src/components/NexusCountryArrival.jsx',import.meta.url),'utf8');
  assert.match(cinema,/nexus-cinema-authentic-circle/);assert.match(cinema,/hall\.webp/);
  assert.doesNotMatch(cinema,/nexus-cinema-seals/);
  assert.match(circle,/nexus-v7-authentic-circle-spin/);assert.match(circle,/\.nexus-cinema-map::before\{content:none!important/);
  assert.match(tunnel,/nexus-v7-spiral-field/);assert.match(tunnel,/nexus-v7-spiral-a/);assert.match(tunnel,/nexus-v7-spiral-b/);assert.match(tunnel,/nexus-v7-field-drive/);
  assert.match(doors,/height:208px!important/);assert.match(doors,/\.nexus-door-choice::before/);assert.match(doors,/@media\(max-width:759px\)/);
  assert.match(arrival,/useEffect/);assert.match(arrival,/void onEnter\(\)/);assert.match(arrival,/return null/);assert.doesNotMatch(arrival,/Bienvenue|PortalArtwork|Explorer/);
  assert.match(circle,/data-arrival.*nexus-shell/);assert.match(circle,/@media\(prefers-reduced-motion:reduce\)/);
});
