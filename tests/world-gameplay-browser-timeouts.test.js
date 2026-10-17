import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('../scripts/verify-world-gameplay-browser.mjs',import.meta.url),'utf8');

test('software-GPU gameplay CI actually allows a slow first render to mount',()=>{
 // Playwright's signature is waitForFunction(expression, arg, options).
 // The prior second-argument timeout was silently passed as expression data,
 // leaving a 20-second default which failed on a busy Ubuntu SwiftShader runner.
 assert.match(script,/page\.waitForFunction\(\(\)=>window\.qa\?\.scene,undefined,\{timeout:120000,polling:250\}\)/);
 assert.doesNotMatch(script,/page\.waitForFunction\(\(\)=>window\.qa\?\.scene,\{timeout:/);
 assert.match(script,/qa\.scene\.setQuality\('fluid'\)/,'the software renderer stays bounded only within private QA');
 assert.match(script,/page\.getByRole\('button',\{name:'Affichage du jeu'/,'the test still performs a real user interaction');
});
