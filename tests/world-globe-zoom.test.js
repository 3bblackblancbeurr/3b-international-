import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clampGlobeZoom,GLOBE_ZOOM_MAX,GLOBE_ZOOM_MIN} from '../src/components/world-globe-zoom.js';

test('globe zoom is finite, bounded, deterministic and free of device data',()=>{
 assert.equal(GLOBE_ZOOM_MIN,1);
 assert.equal(GLOBE_ZOOM_MAX,1.55);
 for(const n of [undefined,null,Number.NaN,Infinity,-Infinity,'invalid'])assert.equal(clampGlobeZoom(n),1);
 for(const n of [-3,0,.75,1])assert.equal(clampGlobeZoom(n),1);
 assert.equal(clampGlobeZoom(1.125),1.13);
 assert.equal(clampGlobeZoom(1.24),1.24);
 for(const n of [1.55,1.8,100])assert.equal(clampGlobeZoom(n),1.55);
 for(let i=0;i<200;i++){const n=Math.random()*10-5,z=clampGlobeZoom(n);assert.ok(z>=1&&z<=1.55);}
});

test('zoom controls, pinch handling and suspended animation are built into actual visual components',()=>{
 const component=readFileSync(new URL('../src/components/LivingWorldHome.jsx',import.meta.url),'utf8');
 const globe=readFileSync(new URL('../src/components/LivingWorldGlobe.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/styles/world-living-home.css',import.meta.url),'utf8');
 for(const label of ['Agrandir la planète','Réduire la planète','Réinitialiser le zoom'])assert.ok(component.includes(label));
 assert.match(component,/onZoomChange=\{setGlobeZoom\}/);
 assert.match(component,/pince pour zoomer/);
 assert.match(globe,/state\.pointers\.size===2/);
 assert.match(globe,/state\.pinch\.zoom\*distance\/state\.pinch\.distance/);
 assert.match(globe,/function onPointerCancel/);
 assert.match(globe,/if\(!event\.ctrlKey\)return/);
 assert.match(globe,/event\.key==='\+'/);
 assert.match(globe,/event\.key==='-'/);
 assert.match(globe,/function schedule\(\)\{if\(canAnimate\(\)&&!raf\)/);
 assert.match(globe,/if\(!canAnimate\(\)\)return/);
 assert.match(globe,/motionObserver\?\.observe/);
 assert.match(css,/\.world3b-globe-controls/);
 assert.match(globe,/dataset\.experienceMotion==='reduced'/);
 assert.match(globe,/dataset\.experienceQuality==='economical'/);
 assert.match(globe,/data-experience-motion/);
 assert.match(globe,/data-experience-quality/);
 assert.match(css,/data-experience-motion="reduced"/);
 assert.match(css,/data-experience-quality="economical"/);

});
