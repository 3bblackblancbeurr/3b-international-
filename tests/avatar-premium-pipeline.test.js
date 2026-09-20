import test from 'node:test';
import assert from 'node:assert/strict';
import {blankAvatar,normalizeAvatar} from '../src/world/avatar-rules.js';
import {avatarAssetTargets,normalizeAvatarAssetSlots} from '../src/world/avatar-assets.js';
import {avatarRecipe} from '../src/world/living.js';

test('premium avatar morphs are clamped and survive normalization',()=>{
  const avatar=normalizeAvatar({...blankAvatar(),created:true,name:'Kaïs',shoulders:4,hips:-4,eyeSize:.6,freckles:2,hairLength:-1,beard:9,mustache:3,scar:'left-cheek',mole:'chin'});
  assert.equal(avatar.shoulders,1);
  assert.equal(avatar.hips,-1);
  assert.equal(avatar.eyeSize,.6);
  assert.equal(avatar.freckles,1);
  assert.equal(avatar.hairLength,0);
  assert.equal(avatar.beard,6);
  assert.equal(avatar.mustache,3);
  assert.equal(avatar.scar,'left-cheek');
  assert.equal(avatar.mole,'chin');
  const recipe=avatarRecipe(avatar);
  assert.equal(recipe.shoulders,1);
  assert.equal(recipe.hips,-1);
});

test('3B textile slots reject unknown ids and produce stable integration targets',()=>{
  const slots=normalizeAvatarAssetSlots({top:'qamis',jacket:'fake',pants:'jean',collection:'france',glasses:'matrix-glasses'});
  assert.equal(slots.top,'qamis');
  assert.equal(slots.jacket,'none');
  assert.equal(slots.collection,'france');
  const targets=avatarAssetTargets(slots);
  assert.ok(targets.some(target=>target.key==='france:top:qamis'));
  assert.ok(targets.some(target=>target.key==='france:glasses:matrix-glasses'));
});
