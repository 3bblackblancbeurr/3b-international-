import test from 'node:test';
import assert from 'node:assert/strict';
import {franceFieldInteraction,franceCollectedEvidence} from '../src/world/france-field-interaction.js';
const current={region:'france',objective:'france:evidence:archive',target:{x:10,z:20},range:6,staging:{speaker:'Archives',place:'Registre',clue:'La date originale reste lisible.',actionLabel:'Examiner la date'},dialogue:'Regarde la page.',instruction:'Regarde la page.',inventory:{date_originale:1}};
test('field evidence is readable only for the current local objective',()=>{
 const model=franceFieldInteraction(current,{x:10,z:25},current.objective);
 assert.equal(model.place,'Registre');assert.equal(model.actionLabel,'Examiner la date');assert.equal(model.ready,true);
 for(const position of [{x:10,z:26.1},{x:NaN,z:20},null])assert.equal(franceFieldInteraction(current,position,current.objective),null);
 assert.equal(franceFieldInteraction(current,{x:10,z:20},'france:rumor:relieuse'),null);
 assert.equal(franceFieldInteraction({...current,region:'maroc'},{x:10,z:20},current.objective),null);
 assert.equal(franceFieldInteraction({...current,finished:true},{x:10,z:20},current.objective),null);
 assert.equal(franceFieldInteraction({...current,staging:null},{x:10,z:20},current.objective),null);
});
test('reading never grants clues and collected evidence follows the accepted inventory',()=>{
 const original=structuredClone(current);franceFieldInteraction(current,{x:10,z:20},current.objective);
 assert.deepEqual(current,original);assert.deepEqual(franceCollectedEvidence(current.inventory),[{id:'date_originale',label:'Date originale'}]);
 assert.deepEqual(franceCollectedEvidence({date_originale:0,temoignage_lea:1,unknown:1}),[{id:'temoignage_lea',label:'Parole de Léa'}]);
 const failed=franceFieldInteraction({...current,instruction:'Relis les deux traces.',actionReady:false},{x:10,z:20},current.objective);
 assert.equal(failed.message,'Relis les deux traces.');assert.equal(failed.ready,false);
});
test('the running relay offers second-plateau guidance while Kaïs remains at the first',()=>{
 const relay={...current,mode:'relay',started:true,target:{x:28,z:20},relay:{companion:{x:10,z:20}}};
 assert.ok(franceFieldInteraction(relay,{x:10,z:20},current.objective));
 assert.ok(franceFieldInteraction(relay,{x:28,z:20},current.objective));
 assert.equal(franceFieldInteraction(relay,{x:19,z:20},current.objective),null,'walking between plates closes the local conversation');
});
