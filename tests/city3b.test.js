import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const passport=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
const legacyPortal=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
const builder=readFileSync(new URL('../src/nexus/NexusCityPageV2.jsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/city/city3b-client.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/city-3b.css',import.meta.url),'utf8');

test('passport opens the Monde 3B while the city builder remains a separate discovered mode',()=>{
  assert.match(passport,/MONDE/);
  assert.match(passport,/goTo\?\.\('world3b'\)/);
  assert.doesNotMatch(passport,/MA VILLE|Ouvrir Crée ta ville 3B/);
  assert.match(builder,/NEXUS · MODE VILLE 3B/);
  assert.match(builder,/960/);
});

test('legacy Passport Nexus remains isolated from the new builder route',()=>{
  assert.match(legacyPortal,/useNexusJourney/);
  assert.match(legacyPortal,/journey\.travel/);
  assert.doesNotMatch(legacyPortal,/city3bRequest/);
});

test('City 3B compatibility API remains authenticated and isolated',()=>{
  assert.match(client,/\/functions\/v1\/city-3b/);
  assert.match(client,/Authorization:`Bearer \$\{session\.access_token\}`/);
  assert.match(client,/if\(!session\)throw Error/);
  assert.doesNotMatch(client,/service_role|secret|SUPABASE_SERVICE/);
});

test('new Nexus builder exposes permanent server-backed construction instead of seasonal reset logic',()=>{
  assert.match(builder,/loadNexusState/);
  assert.match(builder,/buyNexusBuilding/);
  assert.match(builder,/sauvegarde serveur confirmée/);
  assert.match(builder,/5<\/strong> niveaux d’amélioration/);
});

test('City 3B compatibility styling remains responsive and premium 3B',()=>{
  assert.match(css,/city3b-nav/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/#d7bc78|#e4c879/);
  assert.match(css,/#63d9ff|#35cdfa/);
});
