import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const component=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
const visual=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/city/city3b-client.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/city-3b.css',import.meta.url),'utf8');

test('passport now enters City 3B instead of the legacy Nexus journey',()=>{
  assert.match(visual,/MA VILLE/);
  assert.match(visual,/Ouvrir Crée ta ville 3B/);
  assert.match(component,/CRÉE TA VILLE/);
  assert.match(component,/Fonder ma ville/);
  assert.doesNotMatch(component,/useNexusJourney|journey\.travel/);
});

test('City 3B keeps permanent progression and the eight established values',()=>{
  assert.match(component,/Aucun reset, aucune saison/);
  assert.match(client,/France:'Justice'/);
  assert.match(client,/Algérie:'Loyauté'/);
  assert.match(client,/Espagne:'Passion'/);
  assert.match(client,/Maroc:'Noblesse'/);
  assert.match(client,/Italie:'Espoir'/);
  assert.match(client,/Tunisie:'Courage'/);
  assert.match(client,/Turquie:'Foi'/);
  assert.match(client,/Estonie:'Sagesse'/);
});

test('City API calls are authenticated and target only the city Edge Function',()=>{
  assert.match(client,/\/functions\/v1\/city-3b/);
  assert.match(client,/Authorization:`Bearer \$\{session\.access_token\}`/);
  assert.match(client,/if\(!session\)throw Error/);
  assert.doesNotMatch(client,/service_role|secret|SUPABASE_SERVICE/);
});

test('construction uses an idempotency request and explicit parcel coordinates',()=>{
  assert.match(component,/request:reqId\(\)/);
  assert.match(component,/building:selected\.code/);
  assert.match(component,/rotation:Number\(rotation\)/);
  assert.match(component,/Le serveur contrôle niveau, quartier, collisions et Coins/);
});

test('signed-out members get an explicit Passport requirement instead of an endless loader',()=>{
  assert.match(component,/PASSEPORT 3B REQUIS/);
  assert.match(component,/needsLogin=!account\.loading&&!uid/);
});

test('City UI includes responsive mobile navigation and premium 3B styling',()=>{
  assert.match(css,/city3b-nav/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/#d7bc78|#e4c879/);
  assert.match(css,/#63d9ff|#35cdfa/);
});
