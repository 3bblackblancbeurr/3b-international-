import test from 'node:test';
import assert from 'node:assert/strict';
import {characterSequence, frameAt} from '../src/world/cinematic-script.js';
const data = {avatar: {name: 'Kaïs', path: 'tempete'}, power: {name: 'Tempête', description: '+3 attaque et −8 vitalité en aventure.'}, gear: {name: 'Léger', description: 'Équipement de voyage.'}};
test('uses the saved identity and real mechanical descriptions', () => {
  const result = characterSequence(data);
  assert.match(result.shots[0].title, /Kaïs/);
  assert.equal(result.shots.find(s => s.id === 'power').line, data.power.description);
  assert.match(result.shots.find(s => s.id === 'tradeoff').line, /vitalité est réduite/);
});
test('never advertises a weapon that is not implemented', () => {
  for (const weapon of [null, {name: 'Ciseaux'}, {enabled: false, name: 'Ciseaux', attack: 'a', defense: 'd', drawback: 'x'}, {enabled: true, name: 'Ciseaux'}]) {
    assert.ok(!characterSequence({...data, weapon}).shots.some(s => s.id === 'weapon'));
  }
});
test('resolved enabled weapon includes all three gameplay explanations', () => {
  const result = characterSequence({...data, weapon: {enabled: true, name: 'Test', attack: 'Frappe.', defense: 'Garde.', drawback: 'Récupération.'}});
  const shot = result.shots.find(s => s.id === 'weapon');
  assert.match(shot.line, /Frappe/); assert.match(shot.line, /Garde/); assert.match(shot.line, /Récupération/);
});
test('reveal is deterministic and has no input/save side effects', () => {
  const before = JSON.stringify(data);
  assert.deepEqual(characterSequence(data), characterSequence(data));
  assert.equal(JSON.stringify(data), before);
});
test('timeline crosses every boundary once and terminates', () => {
  const sequence = characterSequence(data); let elapsed = 0;
  sequence.shots.forEach((shot, index) => {
    assert.ok(shot.duration >= 6000); assert.equal(frameAt(sequence, elapsed).index, index);
    assert.equal(frameAt(sequence, elapsed).progress, 0);
    assert.equal(frameAt(sequence, elapsed + shot.duration - 1).index, index);
    elapsed += shot.duration;
  });
  assert.equal(frameAt(sequence, elapsed).done, true);
  assert.equal(frameAt(sequence, elapsed + 10000).totalProgress, 1);
});
test('handles negative and invalid elapsed values and empty sequence', () => {
  const sequence = characterSequence();
  for (const value of [-12, NaN, Infinity]) assert.equal(frameAt(sequence, value).progress, 0);
  assert.equal(frameAt({shots: []}, 100), null);
});
test('same script distinguishes all four actual paths without assigning powers to origin', () => {
  const lines = new Set(['lumiere','tempete','nature','ombre'].map(path => characterSequence({...data, avatar: {...data.avatar, path}}).shots.find(s => s.id === 'tradeoff').line));
  assert.equal(lines.size, 4);
  assert.deepEqual(characterSequence({...data, avatar: {...data.avatar, origin: 'france'}}), characterSequence({...data, avatar: {...data.avatar, origin: 'algerie'}}));
});

import {worldCinematicEvents} from '../src/world/cinematic-events.js';
const world = (adventure = {}, extra = {}) => ({region: 'france', visited: ['france'], collection: {}, adventure: {chapters: {}, discoveries: [], ...adventure}, ...extra});
test('country entry is only the first actual successful visit', () => {
  const before = world({}, {region: 'hub', visited: []}), after = world();
  assert.equal(worldCinematicEvents(before, after, {type:'visit'})[0].kind, 'country-first-entry');
  assert.deepEqual(worldCinematicEvents(world({}, {region:'hub'}), after, {type:'visit'}), []);
});
test('restoration follows a successful progression, not the button press', () => {
  const before = world({chapters:{france:{restored:1}}}), after = world({chapters:{france:{restored:2,choice:'garden'}}});
  assert.equal(worldCinematicEvents(before,after,{type:'restore'})[0].context.choice,'garden');
  assert.deepEqual(worldCinematicEvents(before,before,{type:'restore'}),[]);
});
test('important fight intro is not repeated on fieldStart', () => {
  const after = world({encounter:{boss:true,card:'guardian',region:'france',result:null}});
  assert.equal(worldCinematicEvents(world(),after,{type:'encounter'})[0].kind,'guardian-intro');
  assert.deepEqual(worldCinematicEvents(after,after,{type:'fieldStart'}),[]);
});
test('ordinary echoes and farming patrols never receive guardian intros', () => {
  for (const encounter of [{boss:false},{boss:true,patrol:true}]) {
    assert.deepEqual(worldCinematicEvents(world(),world({encounter}),{type:'encounter'}),[]);
  }
});
test('victory and defeat remain different outcomes', () => {
  const before=world({encounter:{boss:true,card:'guardian',result:null}});
  for(const result of ['victory','defeat']){
    const after=world({encounter:{boss:true,card:'guardian',result}});
    assert.equal(worldCinematicEvents(before,after,{type:'field'})[0].context.result,result);
    assert.deepEqual(worldCinematicEvents(after,after,{type:'field'}),[]);
  }
});
test('final ending only follows a real transition to story finished', () => {
  const before=world({finished:false,encounter:{boss:true,final:true,card:'final',result:null}});
  const after=world({finished:true,encounter:{boss:true,final:true,card:'final',result:'victory'}});
  assert.deepEqual(worldCinematicEvents(before,after,{type:'battle'}).map(e=>e.kind),['important-combat-result','story-finale']);
});
test('bond cinematic requires a newly recruited and actually owned companion', () => {
  const before=world({encounter:{card:'wolf',result:'calm'}});
  const after=world({encounter:{card:'wolf',result:'recruited'}},{collection:{wolf:1}});
  assert.equal(worldCinematicEvents(before,after,{type:'pactChoice'})[0].kind,'companion-first-bond');
  assert.deepEqual(worldCinematicEvents(before,{...after,collection:{}},{type:'pactChoice'}),[]);
});
test('discovery cannot be farmed by repeating its action', () => {
  const before=world(),after=world({discoveries:['france:city']});
  assert.equal(worldCinematicEvents(before,after,{type:'survey',id:'city'})[0].kind,'discovery');
  assert.deepEqual(worldCinematicEvents(after,after,{type:'survey',id:'city'}),[]);
});
test('loading a save and presentation playback emit no story events', () => {
  assert.deepEqual(worldCinematicEvents(null,world(),{type:'load'}),[]);
  assert.deepEqual(worldCinematicEvents(world(),world(),{type:'cinematic-finish'}),[]);
});
