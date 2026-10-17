import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

function source(rel){return readFileSync(new URL('../'+rel,import.meta.url),'utf8');}

test('Albert Prestige uses a locally hosted portrait with SVG fallback',()=>{
 const avatar=source('src/components/AlbertHologramAvatar.jsx');
 assert.match(avatar,/\/albert\/apex-hologram-portrait\.png/);
 assert.match(avatar,/onLoad=\{\(\)=>setPortraitReady\(true\)\}/);
 assert.match(avatar,/onError=\{\(\)=>setPortraitReady\(false\)\}/);
 assert.match(avatar,/className="albert3b-portrait-svg"/);
 assert.ok(statSync(new URL('../public/albert/apex-hologram-portrait.png',import.meta.url)).size<500_000);
});
test('Four suggestions are lightweight and do not claim personal data',()=>{
 const page=source('src/components/AlbertPublicPreview.jsx');
 for(const asset of ['reco-voyage.webp','reco-sante.webp','reco-gaming.webp','reco-royaumes.webp']){
  assert.ok(page.includes(asset));
  assert.ok(statSync(new URL('../public/albert/'+asset,import.meta.url)).size<100_000);
 }
 assert.match(page,/Des idées d’exploration, pas des recommandations basées sur ton dossier personnel/);
});
test('Local day timeline displays only activities really chosen by the visitor',()=>{
 const preview=source('src/components/AlbertDayPreview.jsx');
 const planner=source('src/components/AlbertDailyTimeline.jsx');
 assert.match(preview,/readAlbertPlan\(/);
 assert.match(preview,/Aucun rendez-vous inventé/);
 assert.match(preview,/threeb:albert-plan-updated/);
 assert.match(planner,/dispatchEvent\(new CustomEvent\('threeb:albert-plan-updated'\)\)/);
 assert.doesNotMatch(preview,/fetch\(/);
 const page=source('src/components/AlbertPublicPreview.jsx');
 assert.match(page,/<AlbertDayPreview active=\{panel==='discover'\}/);
 assert.match(page,/<AlbertDailyTimeline goTo=\{goTo\}/);
});
test('Panels clear the toolbar and honor reduced-motion devices',()=>{
 const css=source('src/styles/albert-concierge-v3.css');
 assert.match(css,/data-panel="discover"\] \.th-albert-toolbar/);
 assert.match(css,/data-panel="day"\] \.th-albert-agenda/);
 assert.match(css,/data-portrait-ready="true"/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/https?:\/\//);
});
