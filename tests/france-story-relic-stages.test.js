import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryRelic,FRANCE_RELIC_STAGES} from '../src/world/story-relic.js';
import {createRealmMarker} from '../src/world/realm-effects.js';

const phases=['rumor','evidence','coordination','post'];
const objective=phase=>({id:'france:quest',type:'campaignObjective',region:'france',x:11,z:4,mode:'interact',campaign:{phaseId:phase}});

test('France investigation has four distinct, physical story objects rather than one repeated book',()=>{
 assert.deepEqual(Object.keys(FRANCE_RELIC_STAGES),phases);
 const shapes=new Set();
 for(const phase of phases){
  const art=createStoryRelic(objective(phase));
  assert.ok(art,phase);
  assert.equal(art.phase,phase);
  assert.equal(art.root.children.length,3,'three shared-material draws for each clue');
  assert.match(art.root.name,/3B/);
  const geometrySignature=[];
  for(const mesh of art.root.children){
   assert.ok(mesh.isMesh);
   assert.ok(mesh.geometry.attributes.position.count>0);
   mesh.geometry.computeBoundingBox();
   const box=mesh.geometry.boundingBox;
   assert.ok(box.min.y>=.3&&box.max.y<1.6,'the clue fits the existing interaction plinth');
   geometrySignature.push([mesh.geometry.attributes.position.count,box.max.y.toFixed(3)]);
  }
  shapes.add(JSON.stringify(geometrySignature));
  const owned=art.root.children.map(mesh=>({geo:mesh.geometry,mat:mesh.material}));
  art.dispose();art.dispose();
  assert.equal(art.root.parent,null);
  assert.ok(owned.every(p=>p.geo.attributes.position.count>0),'disposal is handled by the owning marker');
 }
 assert.equal(shapes.size,4,'all four campaign phases must have visually distinct meshes');
 assert.equal(createStoryRelic({type:'campaignObjective',region:'maroc',campaign:{phaseId:'evidence'}}),null);
 assert.equal(createStoryRelic({type:'realmTravel',region:'france',campaign:{phaseId:'rumor'}}),null);
});

test('the actual reusable world marker swaps its physical prop when France campaign phase changes',()=>{
 const marker=createRealmMarker(objective('rumor'),{groundY:()=>0});
 const child=()=>marker.root.children.find(c=>c.name.startsWith('3B · '));
 const first=child();
 assert.ok(first?.name.includes('témoignages'));
 marker.update(objective('evidence'));
 assert.ok(child()?.name.includes('Archives'));
 assert.notStrictEqual(child(),first);
 assert.equal(first.parent,null,'old relic is detached when mission advances');
 marker.update(objective('coordination'));
 assert.ok(child()?.name.includes('plateaux'));
 marker.update(objective('post'));
 assert.ok(child()?.name.includes('dossier'));
 marker.update(objective('memory'));
 assert.equal(child(),undefined,'future mission phases use the default marker, not a false clue');
 marker.update(objective('rumor'));
 assert.ok(child()?.name.includes('témoignages'),'the same marker supports revisiting the investigation');
 marker.dispose();
 assert.equal(marker.root.parent,null);
});
