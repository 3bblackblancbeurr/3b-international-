import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAvatar} from '../src/world/avatar-rules.js';
import {ACTIVE_FACE_CAPABILITIES,BEARD_CATALOG,FABRIC_CATALOG,HAIR_CATALOG,PATTERN_CATALOG,creatorCapabilities} from '../src/world/avatar-capabilities.js';
import {avatarCompatibility,resolveWeaponHandling} from '../src/world/avatar-compatibility.js';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

test('ultimate creator only exposes morphs backed by current GLB targets',()=>{
 assert.deepEqual(ACTIVE_FACE_CAPABILITIES.map(x=>x.id),['face','jaw','nose']);
 const caps=creatorCapabilities();
 assert.ok(caps.face.future.includes('eyeSize'));
 assert.ok(caps.face.future.includes('mouthWidth'));
 assert.equal(BEARD_CATALOG.filter(x=>x.available).length,1);
 assert.ok(HAIR_CATALOG.filter(x=>x.available).every(x=>x.id>=0&&x.id<=6));
});

test('ultimate pattern and material catalogs expose only implemented options',()=>{
 const patterns=PATTERN_CATALOG.filter(x=>x.available).map(x=>x.id);
 for(const id of ['matrix','zellige','tonal','geo'])assert.ok(patterns.includes(id));
 assert.deepEqual(Object.entries(FABRIC_CATALOG).filter(([,v])=>v.available).map(([id])=>id),['cotton','linen','satin','leather']);
 assert.equal(FABRIC_CATALOG.denim.available,false);
});

test('new creator fields normalize safely and remain backwards compatible',()=>{
 const a=normalizeAvatar({name:'Nora',created:true,pattern:'matrix',patternScale:9,patternRotation:260,patternIntensity:.01,skinUndertone:'cool',posture:'warrior',handedness:'left',beard:'future-1',voice:'future'});
 assert.equal(a.pattern,'matrix');
 assert.equal(a.patternScale,3);
 assert.equal(a.patternRotation,180);
 assert.equal(a.patternIntensity,.15);
 assert.equal(a.skinUndertone,'cool');
 assert.equal(a.posture,'warrior');
 assert.equal(a.handedness,'left');
 assert.equal(a.beard,'none');
 assert.equal(a.voice,'none');
 const old=normalizeAvatar({name:'Old',created:true,pattern:'broderie'});
 assert.equal(old.patternRotation,0);assert.equal(old.patternIntensity,.8);assert.equal(old.skinUndertone,'neutral');
});

test('compatibility rules protect dense back configurations without changing saved choices',()=>{
 const avatar={weapon:'paris',outer:'cape',bag:true,headwear:'hood',hair:4,pendant:false};
 const check=avatarCompatibility(avatar);
 assert.ok(check.warnings.some(x=>x.id==='cape-bag'));
 assert.ok(check.warnings.some(x=>x.id==='back-stack'));
 assert.ok(check.warnings.some(x=>x.id==='back-density'));
 assert.ok(check.warnings.some(x=>x.id==='hood-hair'));
 assert.ok(check.adjustments.weaponClearance>0);
 const plain=resolveWeaponHandling('paris',{weapon:'paris',outer:'none',bag:false});
 const dense=resolveWeaponHandling('paris',avatar);
 assert.ok(dense.holster.position[2]<plain.holster.position[2]);
 assert.equal(avatar.bag,true);assert.equal(avatar.outer,'cape');
});


test('creator companion preview keeps a real wolf asset in the repository',()=>{
 const path=fileURLToPath(new URL('../public/world/origins/wolf.glb',import.meta.url));
 assert.equal(existsSync(path),true);
});
