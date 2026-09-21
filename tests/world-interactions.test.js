import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blankSave} from '../src/world/rules.js';
import {contextualActions,interactionDescription} from '../src/world/interaction-actions.js';

test('context actions stay compact and always keep one primary action',()=>{
 const save=blankSave();
 const items=[
  {type:'hubNpc',name:'Maël',npcId:'mael_rivière',country:'france',district:'heritage_square',missionIds:['first_steps']},
  {type:'beacon',name:'Souvenir',id:'france:0',done:false},
  {type:'patrol',name:'Patrouille'},
  {type:'hubBuilding',name:'Archives',functions:['collection','tutorial']},
 ];
 for(const item of items){
  const actions=contextualActions(item,{save,snapshot:{region:'france'}});
  assert.ok(actions.length>=1&&actions.length<=4,item.type);
  assert.equal(actions[0].id,'primary',item.type);
  assert.equal(new Set(actions.map(entry=>entry.id)).size,actions.length,item.type);
 }
});

test('NPC actions adapt to mission and guardian context',()=>{
 const save=blankSave(),npc={type:'hubNpc',name:'Maël',npcId:'mael_rivière',country:'france',district:'heritage_square',missionIds:['first_steps']};
 const ids=contextualActions(npc,{save,snapshot:{region:'hub'}}).map(entry=>entry.id);
 assert.deepEqual(ids,['primary','mission','guardian-topic','directions']);
});

test('memories and echoes expose non-combat powers without auto claiming progression',()=>{
 const save=blankSave(),beacon={type:'beacon',name:'Souvenir',id:'france:0',done:false};
 const actions=contextualActions(beacon,{save,snapshot:{region:'france'}});
 assert.ok(actions.some(entry=>entry.id==='memory-vision'&&entry.kind==='power'));
 assert.equal(save.beacons.length,0);
 assert.match(interactionDescription(beacon,'memory-vision',{save}),/sans le ramasser automatiquement/);
 const echo=contextualActions({type:'echo',name:'Écho',id:'france:echo:0'},{save,snapshot:{region:'france'}});
 assert.ok(echo.some(entry=>entry.id==='companion-scout'));
});

test('guardians offer value, preparation and confrontation rather than a generic interact button',()=>{
 const save=blankSave();save.region='france';
 const actions=contextualActions({type:'guardian',name:'Céliane',id:'france:guardian'},{save,snapshot:{region:'france'}});
 assert.deepEqual(actions.map(entry=>entry.id),['primary','guardian-value','prepare']);
 assert.match(interactionDescription({type:'guardian',region:'france'},'guardian-value',{save}),/Justice/);
});

test('World HUD and page wire the compact secondary action surface',()=>{
 const hud=fs.readFileSync(new URL('../src/world/WorldHUD.jsx',import.meta.url),'utf8');
 const page=fs.readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 const scene=fs.readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
 assert.match(hud,/play-interaction-more/);
 assert.match(hud,/contextualActions/);
 assert.match(page,/runContextAction/);
 assert.match(page,/ACTION · RÉACTION · CONSÉQUENCE/);
 assert.match(scene,/contextEffect\(kind,item\)/);
});
