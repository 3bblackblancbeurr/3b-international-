import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSpaces,applySpaceActions,newPanel} from '../src/control/albert-spaces-model.js';
import {parseAlbertLocal,validateAlbertActions} from '../src/control/albert-model.js';

test('Contextual panel commands work immediately and preserve existing motion commands',()=>{
 const state=initialSpaces(),planning=state.spaces[0].panels[0];
 assert.deepEqual(parseAlbertLocal('Agrandis le planning !',state),[{type:'panel_resize',id:planning.id,width:12}]);
 assert.deepEqual(parseAlbertLocal('réduis le calendrier',state),[{type:'panel_resize',id:planning.id,width:6}]);
 assert.deepEqual(parseAlbertLocal('réduis les animations',state),[{type:'motion',value:false}]);
 assert.equal(parseAlbertLocal('ne duplique pas le planning',state),null);
 assert.equal(parseAlbertLocal('comment agrandir le planning ?',state),null);
});
test('Exact titles win over kind aliases; missing and ambiguous targets fail safely',()=>{
 const state=initialSpaces();state.spaces[0].panels.push(newPanel('budget'),newPanel('budget'));
 assert.throws(()=>parseAlbertLocal('duplique le budget',state),/Plusieurs/);
 assert.throws(()=>parseAlbertLocal('duplique les documents',state),/Aucun panneau/);
 state.spaces[0].panels.at(-1).title='Campagne été';
 assert.deepEqual(parseAlbertLocal('duplique Campagne été',state),[{type:'panel_duplicate',id:state.spaces[0].panels.at(-1).id}]);
});
test('Budget copies are independent and inserted next to their original',()=>{
 const state=initialSpaces(),budget=newPanel('budget');budget.rows=[{id:'r',label:'Campagne',amount:200,url:''}];state.spaces[0].panels.push(budget);
 const next=applySpaceActions(state,parseAlbertLocal('duplique le budget',state));
 const copy=next.spaces[0].panels.at(-1);
 assert.notEqual(copy.id,budget.id);assert.notEqual(copy.rows[0].id,budget.rows[0].id);
 assert.equal(copy.rows[0].amount,200);copy.rows[0].amount=500;assert.equal(budget.rows[0].amount,200);
 const ordered=applySpaceActions(next,parseAlbertLocal('mets en premier Budget · copie',next));assert.equal(ordered.spaces[0].panels[0].id,copy.id);
 assert.equal(state.spaces[0].panels.length,4);
});
test('Duplicating task views preserves the shared task collection, and caps remain enforced',()=>{
 const state=initialSpaces();state.spaces[0].tasks=[{id:'task',text:'Préparer',done:false,due:''}];
 const next=applySpaceActions(state,parseAlbertLocal('duplique les tâches',state));
 assert.equal(next.spaces[0].tasks.length,1);assert.equal(next.spaces[0].panels.filter(p=>p.kind==='tasks').length,2);
 while(state.spaces[0].panels.length<16)state.spaces[0].panels.push(newPanel('notes'));
 assert.throws(()=>applySpaceActions(state,parseAlbertLocal('duplique le planning',state)),/16 panneaux/);
 assert.deepEqual(validateAlbertActions([{type:'panel_duplicate',id:'p',script:'bad'}]),[{type:'panel_duplicate',id:'p'}]);
 assert.deepEqual(validateAlbertActions([{type:'panel_first',id:''}]),[]);
});
