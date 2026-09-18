import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,content)=>{const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content.endsWith('\n')?content:`${content}\n`);};
const replace=(source,oldValue,newValue,label)=>{
 if(!source.includes(oldValue))throw new Error(`Motion V2 finalization: motif introuvable pour ${label}`);
 return source.replace(oldValue,newValue);
};

let origins=read('src/world/origins/scene.js');
origins=replace(origins,
 `let x=stick.x+pad.move.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft')),z=stick.z+pad.move.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('z')||keys.has('arrowup'));const input=movementFrame.resolve(x,z,yaw),smoothed=motionSmoother.update(input,dt);x=smoothed.x;z=smoothed.z;\n    if(Math.hypot(x,z)>1e-5){path=[];autoTarget=null;}`,
 `let x=stick.x+pad.move.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft')),z=stick.z+pad.move.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('z')||keys.has('arrowup'));const input=movementFrame.resolve(x,z,yaw),smoothed=motionSmoother.update(input,dt);x=smoothed.x;z=smoothed.z;\n    if(Math.hypot(input.x,input.z)>1e-5){path=[];autoTarget=null;routeSprintUntil=0;}`,
 'annulation manuelle sans inertie résiduelle');
write('src/world/origins/scene.js',origins);

write('tests/origins-controls-v2.test.js',`import test from 'node:test';
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
`);

let nexusTest=read('tests/nexus-cinema.test.js');
const oldPassportTest=`test('passport destination is either the legacy journey or the intentional City 3B replacement', () => {
  const source=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
  if (source.includes('city3bRequest')) {
    assert.match(source,/CRÉE TA VILLE/);
    assert.match(source,/Fonder ma ville/);
    assert.match(source,/nexus_city_place_v2|call\\('place'/);
    assert.match(source,/Collection permanente/);
    assert.match(source,/Découvrir les villes 3B/);
    assert.doesNotMatch(source,/localStorage\\.clear|sessionStorage\\.clear/);
    return;
  }
  assert.match(source,/useNexusJourney\\(\\{ open, onClose, goTo \\}\\)/);
  assert.match(source,/journey\\.travel\\('ORIGINE'\\)/);
  assert.match(source,/setArrivalCode\\(active\\.code\\)/);
  assert.match(source,/journey\\.travel\\(code\\)/);
  assert.match(source,/NexusCountryArrival/);
  assert.match(source,/originEnabled=\\{journey\\.originEnabled\\}/);
  assert.match(source,/Voir le sanctuaire en 3D/);
  assert.doesNotMatch(source,/localStorage\\.clear|sessionStorage\\.clear/);
});`;
const newPassportTest=`test('Passport opens the active City 3B gateway and permanent server-backed city', () => {
  const entry=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
  const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');
  const city=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');
  const source=gateway+'\\n'+city;
  assert.match(entry,/NexusCityGateway/);
  assert.match(gateway,/City3BPortal/);
  assert.match(source,/city3bRequest/);
  assert.match(source,/CRÉE TA VILLE/);
  assert.match(source,/Fonder ma ville/);
  assert.match(source,/call\\('place'/);
  assert.match(source,/Collection permanente/);
  assert.match(source,/Découvrir les villes 3B/);
  assert.doesNotMatch(source,/localStorage\\.clear|sessionStorage\\.clear/);
});`;
nexusTest=replace(nexusTest,oldPassportTest,newPassportTest,'contrat Passeport vers Ville 3B');
write('tests/nexus-cinema.test.js',nexusTest);

console.log('Validation Motion V2 finalisée.');
