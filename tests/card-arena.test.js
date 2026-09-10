import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultDeck,validateDeck,makeDuel,duelStep,practiceAction,optionsFor,STARTERS,masteryLevel} from '../src/arena/duel.js';
import {blankSave} from '../src/world/rules.js';
import {CARDS} from '../src/world/catalog.js';

test('arena grants a viable loan squad without granting collection ownership',()=>{
 const save=blankSave(),before=structuredClone(save),deck=validateDeck(defaultDeck(),save);
 assert.equal(new Set(deck.cards).size,3);assert.equal(STARTERS.length,8);
 assert.deepEqual(save,before);assert.equal(optionsFor(save).cards.length,8);
 const locked=CARDS.find(c=>c.character&&!STARTERS.includes(c.id)&&!save.collection[c.id]);
 assert.throws(()=>validateDeck({...deck,cards:[locked.id,...deck.cards.slice(1)]},save));
 assert.throws(()=>validateDeck({...deck,cards:[deck.cards[0],deck.cards[0],deck.cards[1]]},save));
 assert.throws(()=>validateDeck({...deck,terrain:deck.cards[0]},save));
});
test('turns, concentration, finite relics and reserve selection are authoritative',()=>{
 const start=makeDuel([defaultDeck(),defaultDeck()]),before=structuredClone(start);
 assert.throws(()=>duelStep(start,1,{type:'strike'}));
 assert.throws(()=>duelStep(start,0,{type:'power'}));
 assert.throws(()=>duelStep(start,0,{type:'swap',index:3}));
 let state=duelStep(start,0,{type:'relic'});assert.equal(state.sides[0].cards[0].focus,3);
 state=duelStep(state,1,{type:'strike'});assert.throws(()=>duelStep(state,0,{type:'relic'}));
 state=duelStep(state,0,{type:'power'});assert.equal(state.sides[0].cards[0].focus,1);
 assert.deepEqual(start,before);
});
test('a disconnected or conceding player loses once; a finished game is immutable',()=>{
 for(const type of ['timeout','forfeit']){
  const s=duelStep(makeDuel([defaultDeck(),defaultDeck()]),1,{type});
  assert.equal(s.winner,0);assert.throws(()=>duelStep(s,0,{type:'strike'}));
 }
});
test('all five archetypes finish legal simulated matches with bounded health and shield',()=>{
 const representatives=[...new Set(CARDS.filter(c=>c.character).map(c=>c.role))].map(role=>CARDS.find(c=>c.character&&c.role===role).id);
 assert.equal(representatives.length,5);
 for(const id of representatives){
  const deck={...defaultDeck(),cards:[id,...STARTERS.filter(x=>x!==id).slice(0,2)]};
  let state=makeDuel([deck,defaultDeck()]);
  for(let n=0;n<101&&state.winner===null;n++){
   state=duelStep(state,state.turn,practiceAction(state));
   for(const side of state.sides)for(const card of side.cards){assert.ok(card.hp>=0&&card.hp<=card.max);assert.ok(card.shield>=0&&card.shield<=40);assert.ok(card.focus>=0&&card.focus<=3);}
  }
  assert.notEqual(state.winner,null);assert.ok(state.round<=100);
 }
 assert.equal(masteryLevel(0),1);assert.equal(masteryLevel(1e9),20);
});
