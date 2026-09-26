import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_FINALS,WORLD_FINAL_SPORTS,safeWorldFinalVideoId} from '../shared/sport-finals.js';

const component=readFileSync('src/sport/SportFinals.jsx','utf8');
const page=readFileSync('src/sport/SportPage.jsx','utf8');
const allowedSources=new Set(['FIFA',"L'ÉQUIPE",'World Rugby','FIBA Basketball','Volleyball World','IIHF','International Hockey Federation','Olympic Games','IBA Boxing','World Tennis','BWF TV','World Table Tennis']);

test('Grandes finales is a separate section from Direct 24/7',()=>{
 assert.match(page,/id:'live',label:'Direct 24\/7'/);
 assert.match(page,/id:'finals',label:'Grandes finales'/);
 assert.match(page,/section==='finals'&&<SportFinals\/>/);
 assert.match(component,/séparées du H24/i);
});

test('the curated catalog contains only allowlisted official finals',()=>{
 assert.ok(WORLD_FINALS.length>=12);
 assert.equal(new Set(WORLD_FINALS.map(item=>item.id)).size,WORLD_FINALS.length);
 assert.equal(new Set(WORLD_FINALS.map(item=>item.videoId)).size,WORLD_FINALS.length);
 for(const item of WORLD_FINALS){
  assert.match(item.videoId,/^[A-Za-z0-9_-]{11}$/);
  assert.equal(safeWorldFinalVideoId(item.videoId),item.videoId);
  assert.ok(allowedSources.has(item.source),`source non autorisée: ${item.source}`);
  assert.match(item.format,/complet|complète|intégral/i);
 }
});

test('requested sports are represented and video privacy is hardened',()=>{
 for(const name of ['Football','Rugby','Boxe','Tennis','Basketball','Volleyball','Hockey'])assert.ok(WORLD_FINAL_SPORTS.includes(name));
 assert.match(component,/youtube-nocookie\.com\/embed/);
 assert.match(component,/MEDIA_CONSENT_KEY/);
 assert.match(component,/rel="noopener noreferrer"/);
 assert.match(component,/safeWorldFinalVideoId/);
 assert.doesNotMatch(component,/dangerouslySetInnerHTML/);
});
