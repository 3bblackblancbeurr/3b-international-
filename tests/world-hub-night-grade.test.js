import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {artLighting} from '../src/world/art-direction.js';

const grade=(region,daylight,sun=1)=>artLighting(region,{daylight,sun,phase:daylight<.2?'night':'day',hour:daylight<.2?23:12},{visibility:1});
test('nighttime 3B Hub retains its atmosphere but makes distant masonry readable',()=>{
 const night=grade('hub',.08,0),midday=grade('hub',1),frenchNight=grade('france',.08,0);
 assert.equal(night.sunIntensity,0,'moon light never turns on the sun');
 assert.ok(night.skyIntensity>.36&&night.skyIntensity<.48);
 assert.ok(night.fillIntensity>.16&&night.fillIntensity<.28);
 assert.ok(night.environmentIntensity>.28&&night.environmentIntensity<.43);
 assert.ok(night.exposure>.92&&night.exposure<1.03,'night stays recognizably darker than daylight');
 assert.equal(midday.exposure,1,'daylight white balance remains untouched');
 assert.equal(midday.skyIntensity,.88);
 assert.equal(midday.environmentIntensity,.63);
 assert.equal(frenchNight.environmentIntensity,.18+.45*.08,'country palettes are not regraded');
 assert.equal(frenchNight.exposure,.87+.13*.08);
});

test('city glazing gains warm occupied rooms without a new light or draw-call budget',()=>{
 const facade=readFileSync(new URL('../src/world/hub/district-fabric.js',import.meta.url),'utf8');
 assert.match(facade,/emissive:'#112a34'/);
 assert.match(facade,/fabricLit\*pow\(1\.-fabricDay,1\.25\)/);
 assert.match(facade,/glazing-v2-night/);
 assert.doesNotMatch(facade,/new THREE\.PointLight|new THREE\.SpotLight/);
 assert.match(facade,/new THREE\.InstancedMesh/);
});
