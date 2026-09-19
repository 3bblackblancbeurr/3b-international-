import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readGlbJson,summarizeGlb} from '../scripts/audit-avatar-glb.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));

test('all six traveller GLBs are valid and expose the required avatar skeleton',()=>{
 for(let i=0;i<6;i++){
  const file=path.join(root,'public/world/living/traveller-'+i+'.glb'),summary=summarizeGlb(readGlbJson(file));
  for(const node of ['Head','spine_02','spine_03','pelvis','hand_r','hand_l'])assert.ok(summary.nodes.includes(node),'traveller-'+i+' missing '+node);
  assert.ok(summary.animations.some(x=>x==='Idle'||x.includes('Idle')),'traveller-'+i+' missing Idle animation');
 }
});
