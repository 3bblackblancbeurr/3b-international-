import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scene=readFileSync(new URL('../src/world/origins/scene.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/world/origins/OriginsPage.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/world/origins/origins.css',import.meta.url),'utf8');

test('active Origins scene uses Motion V2 and separates movement from camera gestures',()=>{
 assert.ok(scene.includes('createMotionSmoother'));
 assert.ok(scene.includes("rect.width*.52?'move':'camera'"));
 assert.ok(scene.includes('lastGroundTapAt<320'));
 assert.ok(scene.includes('lastCameraTapAt<320'));
 assert.ok(scene.includes('CAMERA_FOLLOW_RESUME_SECONDS'));
 assert.ok(scene.includes('routeSprintUntil'));
 assert.ok(scene.includes('Math.hypot(input.x,input.z)>1e-5'));
 assert.ok(!scene.includes('manual=2.2'));
});

test('World 3B requests landscape without forcing portrait application pages',()=>{
 assert.ok(page.includes("orientation?.lock?.('landscape')"));
 assert.ok(page.includes('origins-rotate-device'));
 assert.ok(css.includes('@media (orientation:portrait)'));
 assert.ok(css.includes('origins-rotate-hint'));
});
