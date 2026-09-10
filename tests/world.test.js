import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,COUNTRIES,CHARACTERS,cardById,validateCatalog,cardSlot,craftPrice} from '../src/world/catalog.js';
import {blankSave,normalizeSave,discover,beacon,recruit,seal,teamStats,makeEncounter,battleTurn,guardianReady,moveWithCollision,nearestInteraction,worldItems,equip,craft,awardMissions,encounterCards} from '../src/world/rules.js';
import {createWalkTracker,metresBetween} from '../src/world/gps.js';
import {findPath} from '../src/world/navigation.js';

test('tap navigation reaches the destination around obstacles without corner cutting',()=>{
 const obstacles=[{x:0,z:10,r:5},{x:8,z:20,r:5},{x:-8,z:20,r:5}],end={x:0,z:35};
 const path=findPath({x:0,z:0},end,obstacles);assert.ok(path.length>1);let p={x:0,z:0};
 for(const goal of path){let ticks=0;while(Math.hypot(p.x-goal.x,p.z-goal.z)>.2&&ticks++<1500){const d=Math.hypot(p.x-goal.x,p.z-goal.z),s=Math.min(.15,d);const next=moveWithCollision(p,(goal.x-p.x)/d*s,(goal.z-p.z)/d*s,obstacles);assert.notDeepEqual(next,p);p=next;}assert.ok(ticks<1500);}
 assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<.3);
 const blocked=findPath({x:0,z:0},{x:0,z:10},obstacles);assert.ok(blocked.length);assert.ok(Math.hypot(blocked.at(-1).x,blocked.at(-1).z-10)>5.7);
 assert.deepEqual(findPath({x:0,z:0},{x:0,z:0},[{x:0,z:0,r:30}]),[]);
});

test('world catalog preserves all 368 unique source IDs and categories',()=>{
 assert.equal(validateCatalog(CARDS).length,368);assert.equal(CHARACTERS.length,172);
 assert.deepEqual(CARDS.map(c=>c.id),Array.from({length:368},(_,i)=>'C'+String(i+1).padStart(3,'0')));
 for(const country of COUNTRIES){const cards=CARDS.filter(c=>c.country===country.id);assert.equal(cards.filter(c=>c.category==='Personnage classique').length,20);assert.equal(cards.filter(c=>c.category==='Carte unique').length,1);assert.ok(cards.every(c=>c.source));}
 assert.throws(()=>validateCatalog([...CARDS,CARDS[0]]));
});
test('world save rejects forged cards, invalid equipment and non-character team members',()=>{
 const s=normalizeSave({...blankSave(),xp:Infinity,shards:-20,leader:'FAKE',collection:{FAKE:3,C002:2,C173:1},team:['C173','FAKE','C002','C002'],loadout:{terrain:'FAKE',fragment:'C173'},seals:['france','france','unknown'],finalOpened:true});
 assert.equal(s.xp,0);assert.equal(s.shards,0);assert.equal(s.collection.FAKE,undefined);assert.deepEqual(s.team,['C002']);assert.equal(s.loadout.terrain,undefined);assert.deepEqual(s.seals,['france']);assert.equal(s.finalOpened,false);
});
test('every portal is distinct and traversable; interactions require proximity',()=>{
 const s=blankSave(),items=worldItems('hub',s);assert.equal(items.filter(i=>i.type==='portal').length,8);
 assert.equal(new Set(items.map(i=>[i.x,i.z].join(','))).size,items.length);
 for(const c of COUNTRIES){assert.ok(Math.hypot(...c.portal)<76);const gate=items.find(i=>i.id===c.id);assert.equal(nearestInteraction({x:gate.x,z:gate.z},[gate]),gate);assert.equal(nearestInteraction({x:gate.x+10,z:gate.z},[gate]),null);const region=worldItems(c.id,s);assert.ok(region.some(i=>i.type==='portal'&&i.id==='hub'));assert.equal(region.filter(i=>i.type==='beacon').length,3);}
});
test('world movement slides around obstacles and never crosses the island boundary',()=>{
 assert.deepEqual(moveWithCollision({x:0,z:0},1,0,[{x:1,z:0,r:1}]),{x:0,z:0});
 assert.deepEqual(moveWithCollision({x:75,z:0},2,0,[]),{x:75,z:0});
 const p=moveWithCollision({x:0,z:0},.1,1,[{x:1,z:0,r:.3}]);assert.equal(p.x,0);assert.equal(p.z,1);
});
test('country visits and memories award actual catalog items exactly once',()=>{
 let s=discover(blankSave(),'france');assert.equal(s.collection.C341,1);
 s=beacon(s,'france:0');assert.equal(s.collection.C213,1);assert.equal(s.xp,45);const same=beacon(s,'france:0');assert.equal(same,s);
 assert.equal(beacon(s,'france:9'),s);assert.equal(beacon(s,'unknown:1'),s);
 assert.equal(guardianReady(s,'france'),false);s=beacon(beacon(s,'france:1'),'france:2');assert.equal(s.collection.C215,1);s=recruit(s,'C002');assert.equal(guardianReady(s,'france'),true);
 const sealed=seal(s,'france');assert.equal(sealed.collection.C165,1);assert.equal(sealed.collection.C349,1);assert.equal(sealed.collection.C161,1);assert.equal(seal(sealed,'france').seals.length,1);
});
test('all collectible cards have an acquisition route and appropriate slot',()=>{
 for(const c of CARDS)assert.ok(c.character||cardSlot(c)||['Mission','Passeport','Porte'].includes(c.category),c.id);
 assert.equal(cardSlot(cardById.C213),'fragment');assert.equal(cardSlot(cardById.C215),'pierre');
 let s=discover(blankSave(),'france');s={...s,shards:200};const price=craftPrice(cardById.C173);const next=craft(s,'C173');assert.equal(next.shards,200-price);assert.equal(next.collection.C173,1);assert.equal(craft(next,'C173'),next);
 assert.equal(craft(s,'C176'),s);assert.equal(craft(s,'C165'),s);
});
test('leader, three allies, one neutral and loadout limits apply together',()=>{
 let s=blankSave();for(const id of ['C002','C003','C004','C005','C161','C162','C245','C246','C247','C248'])s.collection[id]=1;
 for(const id of ['C002','C003','C004','C005'])s=equip(s,id);assert.equal(s.team.length,3);
 s=equip(s,'C002',true);assert.equal(s.leader,'C002');assert.ok(!s.team.includes('C002'));
 s=normalizeSave({...s,leader:'C161',team:['C162','C003','C004']});assert.ok(!s.team.includes('C162'));
 for(const id of ['C245','C246','C247','C248'])s=equip(s,id);assert.equal(s.loadout.traps.length,3);
});
test('unseen country characters appear first, rares unlock at two memories',()=>{
 let s=blankSave();assert.equal(encounterCards('france',s).length,12);assert.notEqual(encounterCards('france',s)[0].id,'C001');s=beacon(beacon(s,'france:0'),'france:1');assert.equal(encounterCards('france',s).length,20);
});
test('battle requires concentration and stops after defeat or victory',()=>{
 let s=blankSave(),e=makeEncounter(cardById.C002,s);e.focus=0;assert.equal(battleTurn(e,'power'),e);e=battleTurn(e,'strike');assert.equal(e.focus,1);assert.ok(e.enemy<e.enemyMax);
 let doomed={...e,hp:1};doomed=battleTurn(doomed,'strike');assert.equal(doomed.result,'defeat');assert.equal(battleTurn(doomed,'guard'),doomed);
 let calm=battleTurn({...e,enemy:1},'strike');assert.equal(calm.result,'calm');assert.equal(battleTurn(calm,'strike'),calm);
});
test('a prepared team can defeat all eight increasingly difficult guardians',()=>{
 let s={...blankSave(),xp:1000};for(const c of CARDS)s.collection[c.id]=1;s.leader='C165';s.team=['C002','C005','C004'];s.loadout={terrain:'C173',ambiance:'C197',fragment:'C213',pierre:'C215',energy:'C357',support:'C269',traps:['C245','C246','C247']};
 for(const country of COUNTRIES){let e=makeEncounter(CARDS.find(c=>c.country===country.id&&c.category==='Carte unique'),s,true);for(let i=0;i<40&&!e.result;i++){e=battleTurn(e,e.focus>=2?'power':e.intent==='percée'&&e.traps?'trap':e.hp<45&&e.support?'support':e.intent==='frappe'&&e.hp<65?'guard':'strike');}assert.equal(e.result,'victory',country.id);s=seal(s,country.id);}
 assert.equal(s.seals.length,8);assert.equal(s.collection.C164,1);
});
test('GPS tracker counts plausible walking without retaining or accepting jumps',()=>{
 const t=createWalkTracker(),position=(latitude,time,accuracy=5,speed=1.4)=>({coords:{latitude,longitude:2,accuracy,speed},timestamp:time});
 assert.equal(t.accept(position(48,1000)).metres,0);assert.equal(t.accept(position(48.000001,3000)).metres,0);
 assert.ok(t.accept(position(48.0001,11000)).metres>7);
 assert.equal(t.accept(position(49,12000)).metres,0);assert.equal(t.accept(position(49.001,22000,100)).metres,0);
 assert.equal(t.accept(position(49.0001,13000,5,15)).metres,0);assert.equal(t.accept(position(49.0002,12000)).metres,0);
 t.reset();assert.equal(t.accept(position(48,30000)).metres,0);assert.ok(Math.abs(metresBetween({latitude:0,longitude:0},{latitude:0,longitude:.001})-111.195)<.1);
});
