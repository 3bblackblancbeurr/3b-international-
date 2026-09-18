import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,content)=>{const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,content.endsWith('\n')?content:`${content}\n`);};
const replaceExact=(source,oldValue,newValue,label)=>{
 if(source.includes(newValue))return source;
 if(!source.includes(oldValue))throw new Error(`World Motion V2 completion: motif introuvable pour ${label}`);
 return source.replace(oldValue,newValue);
};

// Camera constants stay testable: no hidden magic number in production or QA.
let camera=read('src/world/camera-follow.js');
camera=replaceExact(camera,
 `export const CAMERA_FOLLOW_RESUME_SECONDS=.55;`,
 `export const CAMERA_FOLLOW_RESUME_SECONDS=.55;\nexport const CAMERA_FOLLOW_MAX_SPEED=2.35;\nexport const CAMERA_FOLLOW_REDUCED_MAX_SPEED=1.25;`,
 'constantes caméra');
camera=replaceExact(camera,
 `const seconds=Math.min(dt,.25),response=reducedMotion?3.2:5.2,maxSpeed=reducedMotion?1.25:2.35;`,
 `const seconds=Math.min(dt,.25),response=reducedMotion?3.2:5.2,maxSpeed=reducedMotion?CAMERA_FOLLOW_REDUCED_MAX_SPEED:CAMERA_FOLLOW_MAX_SPEED;`,
 'vitesse caméra documentée');
write('src/world/camera-follow.js',camera);

// Existing director tests now validate the real configurable limits.
let directorTest=read('tests/world-director.test.js');
directorTest=replaceExact(directorTest,
 `import {createMovementFrame,followMovement,angleDelta,viewBearing} from '../src/world/camera-follow.js';`,
 `import {createMovementFrame,followMovement,angleDelta,viewBearing,CAMERA_FOLLOW_RESUME_SECONDS,CAMERA_FOLLOW_MAX_SPEED} from '../src/world/camera-follow.js';`,
 'import constantes caméra');
directorTest=replaceExact(directorTest,
 `for(const options of [{enabled:false},{manual:true},{quietFor:1.3}])assert.deepEqual(followMovement(orbit,1,0,.1,options),orbit);`,
 `for(const options of [{enabled:false},{manual:true},{quietFor:CAMERA_FOLLOW_RESUME_SECONDS-.01}])assert.deepEqual(followMovement(orbit,1,0,.1,options),orbit);`,
 'fenêtre de reprise caméra');
directorTest=replaceExact(directorTest,
 `assert.ok(Math.abs(angleDelta(orbit.yaw,followMovement(orbit,1,0,.25).yaw))<=1.9*.25+1e-10);`,
 `assert.ok(Math.abs(angleDelta(orbit.yaw,followMovement(orbit,1,0,.25).yaw))<=CAMERA_FOLLOW_MAX_SPEED*.25+1e-10);`,
 'limite caméra');
write('tests/world-director.test.js',directorTest);

// The new 10 px dead zone deliberately rejects thumb noise.
let mobileTest=read('tests/mobile-mission.test.js');
mobileTest=replaceExact(mobileTest,
 `test('single radial dead zone retains small movement and rejects noise',()=>{assert.deepEqual(pointerStick(5,2),{x:0,z:0});const input=pointerStick(8,0);assert.ok(input.x>0&&input.x<.06);assert.ok(integrate(60,input).travelled>0);});`,
 `test('single radial dead zone rejects thumb noise and retains precise movement',()=>{assert.deepEqual(pointerStick(5,2),{x:0,z:0});assert.deepEqual(pointerStick(9,0),{x:0,z:0});const input=pointerStick(14,0);assert.ok(input.x>0&&input.x<.06);assert.ok(integrate(60,input).travelled>0);});`,
 'test zone morte');
write('tests/mobile-mission.test.js',mobileTest);

// City 3B tests must inspect the active implementation, not a one-line re-export.
let cityTest=read('tests/city3b.test.js');
cityTest=replaceExact(cityTest,
 `const component=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');`,
 `const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');\nconst portal=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');\nconst component=gateway+'\\n'+portal;`,
 'source active City 3B');
cityTest=replaceExact(cityTest,
 `assert.match(visual,/Ouvrir Crée ta ville 3B/);`,
 `assert.match(visual,/Ouvrir ma Ville 3B|Entrer dans ma Ville 3B/);`,
 'entrée Ville 3B');
write('tests/city3b.test.js',cityTest);

// Remove the last visible legacy Nexus wording from the physical Passport.
let passport=read('src/components/PassportVisual.jsx');
passport=passport
 .replaceAll('aria-label="Ouvrir le Nexus 3B"','aria-label="Ouvrir ma Ville 3B"')
 .replaceAll('aria-label="Entrer dans le Nexus 3B"','aria-label="Entrer dans ma Ville 3B"')
 .replaceAll('<small>NEXUS</small>','<small>MA VILLE</small>')
 .replaceAll('Entrer dans le Nexus 3B, puis ouvrir Crée ta ville 3B.','Entrer dans ma Ville 3B.');
write('src/components/PassportVisual.jsx',passport);

// Apply the same Motion V2 principles to the active Origins experience.
let origins=read('src/world/origins/scene.js');
origins=replaceExact(origins,
 `import {advanceMotion,pointerStick,createQualityController} from '../motion.js';`,
 `import {advanceMotion,pointerStick,createQualityController,createMotionSmoother} from '../motion.js';`,
 'import smoother Origins');
origins=replaceExact(origins,
 `import {createMovementFrame} from '../camera-follow.js';`,
 `import {createMovementFrame,CAMERA_FOLLOW_RESUME_SECONDS} from '../camera-follow.js';`,
 'import caméra Origins');
origins=replaceExact(origins,
 `const movementFrame=createMovementFrame(),occlusion=createSceneryOcclusion();`,
 `const movementFrame=createMovementFrame(),motionSmoother=createMotionSmoother(),occlusion=createSceneryOcclusion();`,
 'contrôleur Origins');
origins=replaceExact(origins,
 `manual=0,moveYaw=null,path=[],vision=0`,
 `manual=0,moveYaw=null,path=[],routeSprintUntil=0,lastGroundTapAt=-Infinity,lastCameraTapAt=-Infinity,vision=0`,
 'état tactile Origins');
origins=replaceExact(origins,
 `stick.x=stick.z=0;moveYaw=null;movementFrame.reset();world?.dispose();`,
 `stick.x=stick.z=0;moveYaw=null;movementFrame.reset();motionSmoother.reset();world?.dispose();`,
 'reset zone Origins');
origins=replaceExact(origins,
 `path=route(position,destination,state.zone,state.flags);autoTarget=path.length?destination:null;return !!path.length;`,
 `motionSmoother.reset();routeSprintUntil=0;path=route(position,destination,state.zone,state.flags);autoTarget=path.length?destination:null;return !!path.length;`,
 'navigation Origins');
origins=replaceExact(origins,
 `const blur=()=>{combatInput.clear();keys.clear();pointers.clear();stick.x=stick.z=0;moveYaw=null;movementFrame.reset();clock.reset();};`,
 `const blur=()=>{combatInput.clear();keys.clear();pointers.clear();stick.x=stick.z=0;moveYaw=null;movementFrame.reset();motionSmoother.reset();routeSprintUntil=0;clock.reset();};`,
 'blur Origins');
origins=replaceExact(origins,
 `const pointerDown=e=>{if(e.target!==renderer.domElement||paused||loading||director.current)return;renderer.domElement.focus({preventScroll:true});audio.start(state.settings);const rect=renderer.domElement.getBoundingClientRect(),mode=e.pointerType==='touch'&&e.clientX-rect.left<rect.width*.43?'move':'camera';if([...pointers.values()].some(p=>p.mode===mode))return;pointers.set(e.pointerId,{mode,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0});renderer.domElement.setPointerCapture(e.pointerId);};`,
 `const setGroundRoute=(e,run=false)=>{const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=new T.Vector3();if(!ray.ray.intersectPlane(plane,hit))return false;const end=safePosition({x:hit.x,z:hit.z},state.zone,state.flags);if(distance(end,{x:hit.x,z:hit.z})>=1)return false;motionSmoother.reset();path=route(position,end,state.zone,state.flags);autoTarget=path.length?end:null;routeSprintUntil=run?performance.now()+2200:0;return !!path.length;};\n const pointerDown=e=>{if(e.target!==renderer.domElement||paused||loading||director.current)return;renderer.domElement.focus({preventScroll:true});audio.start(state.settings);const rect=renderer.domElement.getBoundingClientRect(),mode=e.pointerType==='touch'&&e.clientX-rect.left<rect.width*.52?'move':'camera';if([...pointers.values()].some(p=>p.mode===mode))return;pointers.set(e.pointerId,{mode,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0});renderer.domElement.setPointerCapture(e.pointerId);};`,
 'route tactile Origins');
origins=replaceExact(origins,
 `const pointerMove=e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.lastX,dy=e.clientY-p.lastY;p.moved+=Math.abs(dx)+Math.abs(dy);if(p.mode==='move'){const input=pointerStick(e.clientX-p.x,e.clientY-p.y);stick.x=input.x;stick.z=input.z;path=[];}else{yaw-=dx*.005*state.settings.sensitivity;pitch=Math.max(-.95,Math.min(.9,pitch+dy*.003*state.settings.sensitivity));manual=2.2;}p.lastX=e.clientX;p.lastY=e.clientY;};`,
 `const pointerMove=e=>{const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.lastX,dy=e.clientY-p.lastY;p.moved+=Math.abs(dx)+Math.abs(dy);if(p.mode==='move'){const input=pointerStick(e.clientX-p.x,e.clientY-p.y);stick.x=input.x;stick.z=input.z;if(Math.hypot(input.x,input.z)>1e-5){path=[];autoTarget=null;routeSprintUntil=0;}}else{yaw-=dx*.005*state.settings.sensitivity;pitch=Math.max(-.95,Math.min(.9,pitch+dy*.003*state.settings.sensitivity));manual=CAMERA_FOLLOW_RESUME_SECONDS;}p.lastX=e.clientX;p.lastY=e.clientY;};`,
 'mouvement pointeur Origins');
origins=replaceExact(origins,
 `const pointerUp=e=>{const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);if(p.mode==='move'){stick.x=stick.z=0;movementFrame.reset();}else if(e.type==='pointerup'&&p.moved<5&&e.pointerType!=='touch'&&!paused&&!loading){const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=new T.Vector3();if(ray.ray.intersectPlane(plane,hit)){const end=safePosition({x:hit.x,z:hit.z},state.zone,state.flags);if(distance(end,{x:hit.x,z:hit.z})<1){path=route(position,end,state.zone,state.flags);autoTarget=path.length?end:null;}}}};`,
 `const pointerUp=e=>{const p=pointers.get(e.pointerId);if(!p)return;const tappedAt=performance.now();pointers.delete(e.pointerId);if(p.mode==='move'){if(e.type==='pointerup'&&p.moved<8&&!paused&&!loading){const run=tappedAt-lastGroundTapAt<320;lastGroundTapAt=tappedAt;setGroundRoute(e,run);}stick.x=stick.z=0;movementFrame.reset();}else if(e.type==='pointerup'&&p.moved<8&&!paused&&!loading){if(e.pointerType==='touch'){if(tappedAt-lastCameraTapAt<320){yaw=heading+Math.PI;manual=0;}lastCameraTapAt=tappedAt;}else setGroundRoute(e,false);}};`,
 'fin geste Origins');
origins=replaceExact(origins,
 `if(pad.look.x||pad.look.y){yaw-=pad.look.x*dt*2.2*state.settings.sensitivity;pitch=Math.max(-.95,Math.min(.9,pitch+pad.look.y*dt*1.4*state.settings.sensitivity));manual=2.2;}`,
 `if(pad.look.x||pad.look.y){yaw-=pad.look.x*dt*2.2*state.settings.sensitivity;pitch=Math.max(-.95,Math.min(.9,pitch+pad.look.y*dt*1.4*state.settings.sensitivity));manual=CAMERA_FOLLOW_RESUME_SECONDS;}`,
 'caméra manette Origins');
origins=replaceExact(origins,
 `let x=stick.x+pad.move.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft')),z=stick.z+pad.move.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('z')||keys.has('arrowup'));const input=movementFrame.resolve(x,z,yaw);x=input.x;z=input.z;`,
 `let x=stick.x+pad.move.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('q')||keys.has('arrowleft')),z=stick.z+pad.move.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('z')||keys.has('arrowup'));const input=movementFrame.resolve(x,z,yaw),smoothed=motionSmoother.update(input,dt);x=smoothed.x;z=smoothed.z;`,
 'lissage Origins');
origins=replaceExact(origins,
 `if(Math.hypot(x,z)>1e-5){path=[];autoTarget=null;}`,
 `if(Math.hypot(input.x,input.z)>1e-5){path=[];autoTarget=null;routeSprintUntil=0;}`,
 'annulation route Origins');
origins=replaceExact(origins,
 `let speed=keys.has('shift')||pad.sprint?5.5:3.3;`,
 `let speed=keys.has('shift')||pad.sprint||path.length&&routeSprintUntil>performance.now()?5.5:3.3;`,
 'sprint route Origins');
write('src/world/origins/scene.js',origins);

// Landscape is requested only inside the game; portrait application pages stay responsive.
let page=read('src/world/origins/OriginsPage.jsx');
page=replaceExact(page,
 `const pendingRoute=useRef(null),host=useRef(),scene=useRef(),messageTimer=useRef(),[snapshot,setSnapshot]=useState(null),[initial]=useState(()=>load(localStorage,uid)),[panel,setPanel]=useState('start'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(null),[saveError,setSaveError]=useState(false);`,
 `const pendingRoute=useRef(null),host=useRef(),scene=useRef(),messageTimer=useRef(),[snapshot,setSnapshot]=useState(null),[initial]=useState(()=>load(localStorage,uid)),[panel,setPanel]=useState('start'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(null),[saveError,setSaveError]=useState(false);\n\n useEffect(()=>{const orientation=globalThis.screen?.orientation;orientation?.lock?.('landscape').catch(()=>{});return()=>orientation?.unlock?.();},[]);`,
 'orientation paysage Origins');
page=replaceExact(page,
 `return <section className="origins" aria-label="3B ORIGINS — Le Cercle Brisé">`,
 `return <section className="origins" aria-label="3B ORIGINS — Le Cercle Brisé">\n\n  <div className="origins-rotate-device" role="status"><RotateCcw/><strong>Tourne ton téléphone</strong><span>Le Monde du 3B se joue en horizontal.</span></div>`,
 'message paysage Origins');
page=page.replace('Gauche : déplacer<br/>Droite : regarder','Gauche : joystick ou double tap pour courir<br/>Droite : regarder · double tap recentrer');
write('src/world/origins/OriginsPage.jsx',page);

let css=read('src/world/origins/origins.css');
if(!css.includes('.origins-rotate-device'))css+=`

.origins-rotate-device{display:none}
@media (orientation:portrait) and (max-width:900px){
 .origins-rotate-device{position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.55rem;padding:2rem;text-align:center;color:#f7e8bd;background:radial-gradient(circle at 50% 38%,rgba(30,83,103,.96),rgba(3,9,15,.99) 70%);letter-spacing:.04em}
 .origins-rotate-device svg{width:3rem;height:3rem;color:#63d9ff;animation:origins-rotate-hint 1.8s ease-in-out infinite}
 .origins-rotate-device strong{font-size:clamp(1.25rem,7vw,2rem);text-transform:uppercase}
 .origins-rotate-device span{max-width:24rem;color:#c9d9dd}
}
@keyframes origins-rotate-hint{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(70deg)}}
@media (prefers-reduced-motion:reduce){.origins-rotate-device svg{animation:none}}
`;
write('src/world/origins/origins.css',css);

write('tests/origins-controls-v2.test.js',`import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scene=readFileSync(new URL('../src/world/origins/scene.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/world/origins/OriginsPage.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/world/origins/origins.css',import.meta.url),'utf8');

test('active Origins scene uses Motion V2 and separates movement from camera gestures',()=>{
 assert.match(scene,/createMotionSmoother/);
 assert.match(scene,/rect\.width\*\.52\?'move':'camera'/);
 assert.match(scene,/lastGroundTapAt<320/);
 assert.match(scene,/lastCameraTapAt<320/);
 assert.match(scene,/CAMERA_FOLLOW_RESUME_SECONDS/);
 assert.match(scene,/routeSprintUntil/);
 assert.doesNotMatch(scene,/manual=2\.2/);
});

test('World 3B requests landscape without forcing portrait application pages',()=>{
 assert.match(page,/orientation\?\.lock\?\.\('landscape'\)/);
 assert.match(page,/origins-rotate-device/);
 assert.match(css,/@media \(orientation:portrait\)/);
 assert.match(css,/Le Monde du 3B|origins-rotate-hint/);
});
`);

let gameplayDoc=read('docs/3B_AAA_MASTER/03_GAMEPLAY_CONTROLES_CAMERA.md');
gameplayDoc=gameplayDoc.replace('Lot **World Motion V2** implémenté sur une branche dédiée.','Lot **World Motion V2** implémenté sur une branche dédiée, y compris dans la scène active **3B ORIGINS**.');
write('docs/3B_AAA_MASTER/03_GAMEPLAY_CONTROLES_CAMERA.md',gameplayDoc);

console.log('World Motion V2 complété sur Origins, City 3B et la suite de tests.');
