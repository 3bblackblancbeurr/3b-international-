import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');
const builder=readFileSync(new URL('../src/city/City3BBuilder.jsx',import.meta.url),'utf8');
const component=gateway+'\n'+portal+'\n'+builder;
const visual=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/city/city3b-client.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/city-3b.css',import.meta.url),'utf8');

test('City 3B keeps direct creation while the Passport remains an identity card',()=>{
  assert.doesNotMatch(visual,/MA VILLE|PassportNexus|passport-portal-trigger/);
  assert.match(component,/CRÉE TA VILLE/);
  assert.match(component,/Fonder ma ville/);
  assert.doesNotMatch(component,/useNexusJourney|journey\.travel/);
});

test('City 3B keeps permanent progression and the eight established values',()=>{
  assert.match(component,/Aucun reset, aucune saison/);
  assert.match(client,/France:'Justice'/);
  assert.match(client,/["']Algérie["']:'Loyauté'/);
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
  assert.match(builder,/requestId\(\)/);
  assert.match(builder,/building: activeDefinition\.code/);
  assert.match(builder,/normalizeRotation\(draft\.rotation\)/);
  assert.match(builder,/collisionState/);
  assert.match(builder,/Coins/);
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


test('landscape construction keeps visual editing and recovery with a 3D-only game view',()=>{
  const scene=readFileSync(new URL('../src/city/City3DMap.jsx',import.meta.url),'utf8');
  const gameCss=readFileSync(new URL('../src/city/city3b-game.css',import.meta.url),'utf8');
  assert.match(builder,/Jeu de construction 3D/);
  assert.match(builder,/call\('move'/);
  assert.match(builder,/call\('store'/);
  assert.match(builder,/threeb:city-editor:v1/);
  assert.match(builder,/Annuler la dernière action/);
  assert.match(builder,/Rétablir la dernière action/);
  assert.match(builder,/construction_claim/);
  assert.doesNotMatch(builder+scene,/PlanMap|Plan 2D|Aperçu privé|Brouillon local|Recalculer/);
  assert.match(portal,/Tourne ton téléphone/);
  assert.match(gameCss,/orientation:portrait/);
  assert.match(scene,/Relancer la 3D/);
});
