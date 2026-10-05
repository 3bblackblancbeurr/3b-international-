import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateManifest} from '../src/destin/model.js';

const manifest=JSON.parse(fs.readFileSync(new URL('../config/destin/le-combat-commence-master.json',import.meta.url),'utf8'));

test('AAA music master manifest is publishable and finite',()=>{
  assert.deepEqual(validateManifest(manifest),[]);
  assert.equal(manifest.experience,'music-master-v1');
  assert.equal(manifest.nodes.length,3);
  assert.equal(manifest.nodes[0].timeout,0);
  assert.deepEqual(manifest.nodes[0].choices.map(c=>c.id),['memoire','avenir']);
});
test('master stays French-only at the authored media layer',()=>{
  for(const node of manifest.nodes)assert.equal(node.cinema.language,'fr');
  assert.equal(manifest.nodes[0].cinema.spokenBeforeBeat,true);
});
test('both paths carry permanent ecosystem reward identities',()=>{
  const endings=manifest.nodes.slice(1);
  assert.deepEqual(endings.map(n=>n.ending.id).sort(),['combat-avenir','combat-memoire']);
  for(const node of endings){
    assert.equal(node.ending.reward,true);
    for(const key of ['passportTitle','item','world','city'])assert.ok(node.cinema.reward[key]);
    assert.ok(node.cinema.rap.video && node.cinema.rap.audio);
    assert.ok(node.cinema.witness.video && node.cinema.witness.audio);
    assert.equal(node.cinema.unity.audio.length,3);
  }
});
