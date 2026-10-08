import test from 'node:test';
import assert from 'node:assert/strict';
import {applyWorldAction} from '../src/world/engine.js';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {CAMPAIGN_RUNTIME_SPEC,validateCampaignRuntimeSpec} from '../src/world/campaign-spec.js';
import {campaignSnapshot,campaignObjectives,activeCampaignSnapshot} from '../src/world/campaign-runtime.js';
import {realmPositionValid,realmDimensions} from '../src/world/realm-layout.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {CHAPTERS,chapterCards} from '../src/world/chapters.js';
import {guardianBossPhase,GUARDIAN_BOSS_PHASES,displayedGuardianVitality} from '../src/world/guardian-combat.js';
import {startField,stepField,normalizeField} from '../src/world/field-combat.js';
import {validateMissionArchitecture,centralMissionIndex} from '../src/world/mission-index.js';
import {finalCirclePhase,finalCircleMasteryCount} from '../src/world/final-circle.js';
import {realmTravelItems} from '../src/world/realm-layout.js';
import {realmTravelDestinations,realmRelayAvailable} from '../src/world/realm-navigation.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';
const reload=s=>normalizeSave(JSON.parse(JSON.stringify(s)));
function perform(save,region,operation='interact',extra={}){const s=campaignSnapshot(save,region);return reload(applyWorldAction(save,{type:'campaignAction',region,objective:s.objective,operation,position:s.target,...extra}));}
function tick(save,region,position){const s=campaignSnapshot(save,region);return perform(save,region,'tick',{tick:s.tick+1,position:position||s.target});}
function finishTrial(save,region){
 let c=campaignSnapshot(save,region),id=c.objective;
 if(!c.started)save=perform(save,region);
 for(let n=0;n<1000&&campaignSnapshot(save,region).objective===id;n++){
  c=campaignSnapshot(save,region);
  if(c.mode==='route'){save=perform(save,region);continue;}
  if(c.mode==='hazard'){if(c.safe){save=perform(save,region);continue;}}
  if(c.mode==='rhythm'){const expected=['strike','guard','strike','guard','strike'][c.trial],state=save.adventure.campaigns[region];if(c.tick-state.actionTick>=3&&(expected==='guard'||c.safe)){save=perform(save,region,expected);continue;}}
  if(c.mode==='rebuild'&&c.clock>=5){save=perform(save,region,'repair',{choice:c.trial===2?'alternative':undefined});continue;}
  if(c.mode==='defend'&&c.clock%10===7)save=perform(save,region,'guard');
  if(c.mode==='relay'&&save.adventure.companionOrder!=='guard')save=applyWorldAction(save,{type:'companionOrder',value:'guard'});
  save=tick(save,region);
 }
 assert.notEqual(campaignSnapshot(save,region).objective,id,'physical trial must eventually complete: '+id);
 return save;
}
function winGuardian(save,region){
 save=perform(save,region);const seen=new Set();
 for(let n=0;n<900&&!save.adventure.encounter.result;n++){
  const e=save.adventure.encounter,f=e.field,d=Math.hypot(f.enemy.x-f.p.x,f.enemy.z-f.p.z);seen.add(guardianBossPhase(e)?.index);
  const kind=f.phase==='windup'?(f.windup<=400&&!f.guard?'guard':undefined):e.focus>=2?'power':'strike';
  save=reload(applyWorldAction(save,{type:'field',x:d>6?(f.enemy.x-f.p.x)/d:0,z:d>6?(f.enemy.z-f.p.z)/d:0,kind}));
 }
 assert.equal(save.adventure.encounter.result,'victory',region+' guardian must remain winnable');assert.deepEqual([...seen],[1,2,3],region+' must expose three actual phases');return applyWorldAction(save,{type:'leave'});
}
function playCountry(save,region){
 if(save.region!=='hub')save=applyWorldAction(save,{type:'visit',region:'hub'});
 save=applyWorldAction(save,{type:'visit',region});
 for(let n=0;n<90&&!campaignSnapshot(save,region).finished;n++){
  let c=campaignSnapshot(save,region);
  const objectiveRegion=c.mode==='homecoming'?'hub':save.region;
  assert.ok(campaignObjectives({...save,region:objectiveRegion},objectiveRegion).some(item=>item.id===c.objective),'every current objective has a world interaction: '+c.objective);
  if(c.mode==='guardian'){save=winGuardian(save,region);continue;}
  if(c.mode==='homecoming'){save=applyWorldAction(save,{type:'visit',region:'hub'});const before=save;save=perform(save,region);assert.equal(save.adventure.chapters[region].restored,3);if(before.adventure.chapters[region]?.restored!==3)assert.ok(worldCinematicEvents(before,save,{type:'campaignAction',region}).some(event=>event.kind==='guardian-homecoming'&&event.key==='homecoming:'+region),'physical homecoming must reach the cinematic director before it is recorded as seen');save=applyWorldAction(save,{type:'visit',region});continue;}
  if(['escort','hazard','route','relay','rhythm','defend','rebuild'].includes(c.mode)){save=finishTrial(save,region);continue;}
  const spec=CAMPAIGN_RUNTIME_SPEC[region][c.phaseIndex].steps[c.stepIndex];
  const choice=c.mode==='value'?GUARDIAN_VALUES[region].choices[save.adventure.values[region].step]?.[0]:spec.answers?.[0]||spec.answer;
  assert.ok(realmPositionValid(region,c.target),region+' objective must be in a walkable footprint');
  save=perform(save,region,'interact',{choice});
 }
 assert.equal(campaignSnapshot(save,region).finished,true);return save;
}
function winFinale(save){
 const seen=new Set();
 for(let n=0;n<1600&&!save.adventure.encounter.result;n++){
  const e=save.adventure.encounter,f=e.field,phase=finalCirclePhase(e);seen.add(phase.region);
  const d=Math.hypot(f.enemy.x-f.p.x,f.enemy.z-f.p.z),homeDistance=Math.hypot(f.p.x-f.home.x,f.p.z-f.home.z);
  let x=d>6?(f.enemy.x-f.p.x)/d:0,z=d>6?(f.enemy.z-f.p.z)/d:0,kind;
  if(['algerie','maroc'].includes(phase.region)&&homeDistance>8){x=(f.home.x-f.p.x)/homeDistance;z=(f.home.z-f.p.z)/homeDistance;}
  if(phase.region==='espagne'&&e.guardianFlag)kind='guard';
  else if(f.phase==='windup'&&f.windup<=400&&!f.guard){kind=phase.region==='tunisie'?'dodge':'guard';if(kind==='dodge'){x=(f.enemy.x-f.p.x)/Math.max(1,d);z=(f.enemy.z-f.p.z)/Math.max(1,d);}}
  else if(f.phase!=='windup')kind=e.focus>=2?'power':'strike';
  save=reload(applyWorldAction(save,{type:'field',x,z,kind}));
 }
 assert.equal(save.adventure.encounter.result,'victory');assert.equal(seen.size,8);assert.equal(finalCircleMasteryCount(save.adventure.encounter),8);assert.equal(save.adventure.finished,true);return save;
}

test('eight physical campaigns close all framework phases, persist rewards once and transform the Hub',()=>{
 assert.equal(validateCampaignRuntimeSpec(),true);assert.equal(validateMissionArchitecture(),true);
 for(const entry of centralMissionIndex().filter(m=>m.source==='guardian'))assert.ok(entry.phases.every(p=>p.runtimeObjectives.length));
 let save=blankSave();
 for(const country of COUNTRIES){
  save=playCountry(save,country.id);const state=save.adventure.campaigns[country.id];
  assert.equal(state.completed.length,8);assert.equal(state.claimed.length,8);assert.equal(save.beacons.filter(id=>id.startsWith(country.id+':')).length,3);assert.ok(save.seals.includes(country.id));assert.equal(save.adventure.chapters[country.id].restored,3);
  const before=save.xp,previous=CAMPAIGN_RUNTIME_SPEC[country.id][7].steps.at(-1),id=country.id+':post:'+previous.id;
  // Replaying a completed objective never adds a second reward, including JSON reload.
  assert.deepEqual(applyWorldAction(reload(save),{type:'campaignAction',region:country.id,objective:id,position:{x:0,z:0}}),save);
  assert.equal(save.xp,before);assert.deepEqual(reload(save).adventure.campaigns[country.id],state);
 }
 assert.equal(save.seals.length,8);save=applyWorldAction(save,{type:'visit',region:'hub'});save=applyWorldAction(save,{type:'final'});assert.ok(save.adventure.encounter.final);assert.equal(save.adventure.encounter.finalCircleMastery,0);save=winFinale(save);const before=save.xp;assert.throws(()=>applyWorldAction(save,{type:'field',x:0,z:0}));assert.equal(save.xp,before);
});

test('distance, order, bounded position and rhythm tick sequencing reject shortcuts and forged outcomes',()=>{
 let s=applyWorldAction(blankSave(),{type:'visit',region:'espagne'}),c=campaignSnapshot(s);
 assert.ok(Math.hypot(c.target.x,c.target.z)>260,'story starts in an actual large province');
 for(const position of [{x:0,z:0},{x:Infinity,z:0},{x:realmDimensions('espagne').radius+10,z:0}])assert.throws(()=>perform(s,'espagne','interact',{position}));
 assert.throws(()=>perform(s,'espagne','interact',{objective:'espagne:arena:enchaîner'}),/ordre/);
 s=perform(s,'espagne','interact',{xp:999999,result:'victory'});assert.equal(s.xp,0);assert.equal(s.seals.length,0);
 const replay={type:'campaignAction',region:'espagne',objective:c.objective,operation:'interact',position:c.target};assert.deepEqual(applyWorldAction(s,replay),s);
 s=perform(s,'espagne','interact',{choice:'canaliser'});s=finishTrial(s,'espagne');s=perform(s,'espagne','interact',{choice:'pause'});s=perform(s,'espagne');
 c=campaignSnapshot(s);assert.equal(c.mode,'rhythm');assert.equal(c.started,true);
 assert.throws(()=>perform(s,'espagne','tick',{tick:c.tick+2}),/Cycle manquant/);
 s=tick(s,'espagne');const once=s;s=perform(s,'espagne','tick',{tick:campaignSnapshot(s).tick});assert.deepEqual(s,once,'retrying a delivered cycle is idempotent');
 while(!campaignSnapshot(s).safe)s=tick(s,'espagne');s=perform(s,'espagne','strike');assert.equal(campaignSnapshot(s).actionReady,false);assert.equal(campaignSnapshot(s).actionCooldown,300);assert.throws(()=>perform(s,'espagne','guard'),/temps/);for(let n=0;n<3;n++)s=tick(s,'espagne');assert.equal(campaignSnapshot(s).actionReady,true);
});

test('a restored legacy save can play the new campaign without losing its old story or value progression',()=>{
 const base=blankSave(),cards=chapterCards('france');
 const legacy=reload({...base,region:'hub',visited:['france'],seals:['france'],beacons:['france:0','france:1','france:2'],team:[cards.ally],collection:{...base.collection,...Object.fromEntries(Object.values(cards).filter(Boolean).map(id=>[id,1]))},adventure:{...base.adventure,chapters:{france:{helped:true,powers:['ally','ambiance','terrain'],board:[...CHAPTERS.france.answer],solved:true,restored:3,choice:'garden'}},values:{france:{decisions:GUARDIAN_VALUES.france.choices.map(choice=>choice[0])}}}});
 assert.equal(legacy.adventure.campaigns.france,undefined);const oldChapter=legacy.adventure.chapters.france,oldValue=legacy.adventure.values.france;
 const played=playCountry(legacy,'france');assert.equal(campaignSnapshot(played,'france').finished,true);assert.deepEqual(played.adventure.chapters.france,oldChapter);assert.deepEqual(played.adventure.values.france,oldValue);assert.deepEqual(played.beacons,legacy.beacons);assert.deepEqual(played.seals,legacy.seals);
 const previous=CAMPAIGN_RUNTIME_SPEC.france[7].steps.at(-1),xp=played.xp;
 const replay=applyWorldAction(reload(played),{type:'campaignAction',region:'france',objective:'france:post:'+previous.id,position:{x:0,z:0}});assert.equal(replay.xp,xp);assert.deepEqual(replay.adventure.campaigns.france,played.adventure.campaigns.france);
});

test('escort presence and hazard mistakes affect integrity; retry and reconnect preserve inventory and once-only grants',()=>{
 let s=applyWorldAction(blankSave(),{type:'visit',region:'algerie'});s=perform(s,'algerie');s=perform(s,'algerie','interact',{choice:'entendre'});s=perform(s,'algerie');
 const before={...campaignSnapshot(s).escort};for(let i=0;i<50;i++){const c=campaignSnapshot(s);s=tick(s,'algerie',{x:c.target.x+30,z:c.target.z});}
 assert.deepEqual(campaignSnapshot(s).escort,before);assert.equal(campaignSnapshot(s).integrity,0);const tokens={...s.adventure.campaigns.algerie.inventory};s=perform(s,'algerie','retry');assert.equal(campaignSnapshot(s).integrity,100);assert.deepEqual(s.adventure.campaigns.algerie.inventory,tokens);assert.equal(s.adventure.campaigns.algerie.claimed.filter(id=>id==='rumor').length,1);
 s=finishTrial(s,'algerie');assert.equal(s.adventure.campaigns.algerie.inventory.confiance,undefined,'next delivery grants confidence, not the trial shortcut');
 let t=applyWorldAction(blankSave(),{type:'visit',region:'tunisie'});t=perform(t,'tunisie');t=perform(t,'tunisie');t=perform(t,'tunisie');const id=campaignSnapshot(t).objective;
 for(let i=0;i<4;i++)t=perform(t,'tunisie');assert.equal(campaignSnapshot(t).integrity,0);assert.equal(campaignSnapshot(t).objective,id);t=perform(t,'tunisie','retry');assert.equal(t.adventure.campaigns.tunisie.inventory.corde,1);t=finishTrial(t,'tunisie');assert.equal(t.adventure.campaigns.tunisie.inventory.corde,1,'rope is consumed only after actual rescue return');
});

test('post liberation is gated by real boss victory and the physical Hub return remains visible',()=>{
 let s=applyWorldAction(blankSave(),{type:'visit',region:'france'});s=perform(s,'france');assert.throws(()=>applyWorldAction(s,{type:'encounter',id:'france:guardian'}),/actes|épreuves/);
 assert.equal(campaignObjectives({...s,region:'hub'},'hub').length,0);assert.equal(activeCampaignSnapshot({...s,region:'hub'}),null);
});

test('24 phase patterns are real combat parameters; poster vitality conversion never changes balanced HP',()=>{
 const move=(p,v,d)=>({x:p.x+v.x*d,z:p.z+v.z*d});
 assert.equal(Object.values(GUARDIAN_BOSS_PHASES).flat().length,24);
 for(const country of COUNTRIES){
  const phases=GUARDIAN_BOSS_PHASES[country.id];assert.equal(new Set(phases.map(p=>p.title)).size,3);assert.equal(new Set(phases.map(p=>JSON.stringify(p.pattern))).size,3);
  let e={card:GUARDIAN_VALUES[country.id].card,boss:true,region:country.id,hp:500,maxHP:500,enemy:1000,enemyMax:1000,focus:3,stats:{attack:1000,affinity:0,speed:1},traps:0,support:false,turn:0,intent:'frappe',field:startField({x:5000,z:6},{x:5000,z:0})};
  assert.equal(normalizeField(e.field).p.x,5000,'large kingdom combat coordinates survive reload');
  e=stepField(e,{x:0,z:0,kind:'power'},move);assert.equal(guardianBossPhase(e).index,2,'a huge hit stops at the next real phase');assert.ok(e.enemy>0);
  const display=displayedGuardianVitality(e);assert.ok(display.max>=8800);assert.equal(display.balanceMax,1000);assert.ok(display.current<display.max);
 }
});

test('realm travel requires a real source, physical discovery and a valid persisted arrival, with an always available core return',()=>{
 for(const country of COUNTRIES){
  let s=applyWorldAction(blankSave(),{type:'visit',region:country.id});const items=realmTravelItems(country.id),source=items.find(i=>i.province===-1),province=items.find(i=>i.id.includes(':province-')),village=items.find(i=>i.id.includes(':village-'));
  assert.equal(realmTravelDestinations(s).length,5);assert.equal(realmRelayAvailable(s,country.id,province.id),true);assert.equal(realmRelayAvailable(s,country.id,village.id),false);
  assert.throws(()=>applyWorldAction(s,{type:'realmTravel',from:source.id,to:province.id,position:{x:0,z:0}}),/relais réel/);
  assert.throws(()=>applyWorldAction(s,{type:'realmTravel',from:source.id,to:village.id,position:source}),/Découvre/);
  assert.throws(()=>applyWorldAction(s,{type:'realmRelayDiscover',id:village.id,position:source}),/physiquement/);
  s=applyWorldAction(s,{type:'realmRelayDiscover',id:village.id,position:village});const before=s.xp;s=applyWorldAction(s,{type:'realmRelayDiscover',id:village.id,position:village});assert.equal(s.xp,before);assert.equal(s.adventure.realmRelays.filter(id=>id===village.id).length,1);
  s=applyWorldAction(s,{type:'realmTravel',from:source.id,to:village.id,position:source});assert.deepEqual(s.adventure.realmTravel,{region:country.id,x:village.x,z:village.z,nonce:1,to:village.id});assert.deepEqual(reload(s).adventure.realmTravel,s.adventure.realmTravel);
  s=applyWorldAction(s,{type:'realmTravel',from:village.id,to:country.id+':realm:core',position:village});assert.equal(s.adventure.realmTravel.nonce,2);assert.ok(Math.hypot(s.adventure.realmTravel.x,s.adventure.realmTravel.z)<260);
 }
});
