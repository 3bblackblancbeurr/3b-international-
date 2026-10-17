import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CINEMATIC_CITY_LIGHTS,createCinematicCityLights} from '../src/components/world-city-lights.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('night lights are bounded fixed illustration rather than live locations',()=>{
 assert.equal(CINEMATIC_CITY_LIGHTS.length,222);
 assert.deepEqual(createCinematicCityLights(),CINEMATIC_CITY_LIGHTS);
 for(const lamp of CINEMATIC_CITY_LIGHTS){
  assert.ok(Number.isFinite(lamp.lon)&&Number.isFinite(lamp.lat));
  assert.ok(lamp.lon>=-180&&lamp.lon<=180);
  assert.ok(lamp.lat>=-90&&lamp.lat<=90);
  assert.ok(lamp.brightness>=0&&lamp.brightness<=1);
 }
 const globe=read('src/components/LivingWorldGlobe.jsx');
 assert.match(globe,/CINEMATIC_CITY_LIGHTS/);
 assert.match(globe,/const lightStride=width<360\?3:width<520\?2:1/);
 assert.match(globe,/if\(!bright&&i%lightStride!==0\)continue/);
 assert.match(globe,/ctx\.arc\(p\.x,p\.y,radius,0,TAU\)/);
 assert.doesNotMatch(read('src/components/world-city-lights.js'),/\b(fetch|navigator|geolocation|supabase|localStorage)\b/);
});

test('Albert uses bespoke sculpted portrait with economical mobile styling',()=>{
 const avatar=read('src/components/AlbertHologramAvatar.jsx');
 const concierge=read('src/components/AlbertPublicPreview.jsx');
 const css=read('src/styles/albert-daily-timeline.css');
 assert.match(avatar,/albert3b-portrait-svg/);
 assert.match(avatar,/albert3b-eye-glimmer/);
 assert.match(avatar,/albert3b-sculpted-avatar/);
 assert.match(concierge,/import AlbertHologramAvatar/);
 assert.match(concierge,/<AlbertHologramAvatar\/>/);
 assert.match(css,/albert3b-portrait-breathe/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.albert3b-sculpted-avatar \.albert3b-portrait-svg\{filter:none\}/);
 assert.doesNotMatch(avatar,/\bWebGL\b|https:\/\//);
});
