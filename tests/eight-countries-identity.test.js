import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS} from '../src/world/chapters.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';

const REGIONS=['france','algerie','maroc','tunisie','turquie','espagne','italie','estonie'];

test('the eight countries keep distinct gameplay identities and guardians',()=>{
  assert.deepEqual(Object.keys(CHAPTERS).sort(),[...REGIONS].sort());
  assert.deepEqual(Object.keys(GUARDIAN_VALUES).sort(),[...REGIONS].sort());

  const kinds=new Set();
  const values=new Set();
  const guardians=new Set();

  for(const region of REGIONS){
    const chapter=CHAPTERS[region],guardian=GUARDIAN_VALUES[region];
    assert.ok(chapter?.title,region+' chapter title');
    assert.equal(chapter.restores?.length,3,region+' reconstruction stages');
    assert.equal(chapter.pattern?.length,4,region+' guardian combat pattern');
    assert.ok(chapter.kind,region+' unique puzzle mechanic');
    assert.equal(guardian?.choices?.length,3,region+' value trial choices');
    assert.ok(guardian.name,region+' guardian name');
    assert.ok(guardian.value,region+' guardian value');
    kinds.add(chapter.kind);
    values.add(guardian.value);
    guardians.add(guardian.name);
  }

  assert.equal(kinds.size,8,'each country must keep its own puzzle/gameplay mechanic');
  assert.equal(values.size,8,'each country must keep its own value');
  assert.equal(guardians.size,8,'each country must keep its own guardian');
});

test('France remains the reference Justice/Céliane slice',()=>{
  assert.equal(GUARDIAN_VALUES.france.name,'Céliane');
  assert.equal(GUARDIAN_VALUES.france.value,'Justice');
  assert.equal(CHAPTERS.france.kind,'sequence');
  assert.deepEqual(CHAPTERS.france.restores,['La rue des ateliers','Le jardin des noms','La bibliothèque vivante']);
});
