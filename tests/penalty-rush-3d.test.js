import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const match = readFileSync(new URL('../src/games/PenaltyRush.jsx', import.meta.url), 'utf8');
const arena = readFileSync(new URL('../src/games/penaltyRush/PenaltyRushArena3D.jsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../supabase/functions/penalty-rush/index.ts', import.meta.url), 'utf8');
const training = readFileSync(new URL('../src/games/penaltyRush/PenaltyTraining.jsx', import.meta.url), 'utf8');
const controls = readFileSync(new URL('../src/games/penaltyRush3d.css', import.meta.url), 'utf8');
const joystick = readFileSync(new URL('../src/games/penaltyRush/joystick.js', import.meta.url), 'utf8');

test('Penalty Rush match no longer renders placeholder 10 / GK / 3B avatars', () => {
  assert.match(match, /PenaltyRushArena3D/);
  assert.doesNotMatch(match, /penalty-attacker-avatar/);
  assert.doesNotMatch(match, /penalty-keeper-avatar/);
  assert.doesNotMatch(match, /penalty-ball-avatar/);
  assert.doesNotMatch(match, />GK<\/div>/);
});

test('3D arena contains a pitch, goal, ball, humanoid players and dynamic camera', () => {
  assert.match(arena, /new THREE\.WebGLRenderer/);
  assert.match(arena, /function createHumanoid/);
  assert.match(arena, /function createPitch/);
  assert.match(arena, /function createGoal/);
  assert.match(arena, /new THREE\.SphereGeometry\(\.11/);
  assert.match(arena, /new THREE\.PerspectiveCamera/);
  assert.match(arena, /camera\.position\.lerp/);
  assert.match(arena, /posePlayer/);
  assert.match(arena, /action === 'shot'/);
  assert.match(arena, /action === 'dive'/);
  assert.match(arena, /action === 'celebrate'/);
});

test('mobile movement is locally predicted and server requests are coalesced', () => {
  assert.match(match, /controlRef = useRef/);
  assert.match(match, /moveInFlight = useRef/);
  assert.match(match, /pendingMove = useRef/);
  assert.match(match, /now - moveThrottle\.current < 42/);
  assert.match(match, /queueMove\(\{ type:'move'/);
});

test('server exposes cosmetic appearance and visual shot trajectory without changing the deterministic engine', () => {
  assert.match(server, /shirtNumber:/);
  assert.match(server, /kit:sanitizeKit\(player\.kit\)/);
  assert.match(server, /boots:sanitizeBoots\(player\.boots\)/);
  assert.match(server, /const visual = \{/);
  assert.match(server, /attacker:\{ \.\.\.state\.positions\.attacker \}/);
  assert.match(server, /shot:\{ \.\.\.shot \}/);
  assert.match(server, /result:\{ \.\.\.result \}/);
  assert.match(server, /visual,/);
});


test('V3 deepens the pitch and guarantees a dedicated behind-goal goalkeeper camera', () => {
  assert.match(arena, /const FIELD_L = 44/);
  assert.match(arena, /const GOAL_Z = -19\.75/);
  assert.match(arena, /keeperGoalFramingDistance/);
  assert.match(arena, /GOAL_Z - goalDistance/);
  assert.match(arena, /fov = 72/);
  assert.match(arena, /goal\.userData\.netMat\.opacity/);
});

test('V3 reuses the real skinned 3B human pipeline with procedural fallback', () => {
  assert.match(arena, /createLivingLibrary/);
  assert.match(arena, /createLivingActor/);
  assert.match(arena, /footballAvatar/);
  assert.match(arena, /players\[index\]\.userData\.rig\.visible = false/);
  assert.match(arena, /actor\.update\(dt, dx, dz, travelled\)/);
});

test('V3 adds local prediction for attacker and goalkeeper while server remains authoritative', () => {
  assert.match(arena, /predictLocalAttacker/);
  assert.match(arena, /controlRef\?\.current\?\.keeper/);
  assert.match(arena, /predictLocalKeeper/);
  assert.match(match, /moveThrottle\.current < 42/);
  assert.match(match, /keeper:\{ direction:0, forward:0, intensity:0, active:false \}/);
});

test('V3 adds cinematic goal feedback without heavy post-processing', () => {
  assert.match(arena, /createBallTrail/);
  assert.match(arena, /createImpactFx/);
  assert.match(arena, /triggerImpactFx/);
  assert.match(arena, /goal\.userData\.flash\.material\.opacity/);
  assert.match(arena, /navigator\.vibrate/);
  assert.match(match, /penalty-impact-word/);
});

test('V3 uses adaptive mobile resolution and the renderer animation loop', () => {
  assert.match(arena, /ratioCap = mobile \? 1\.22 : 1\.5/);
  assert.match(arena, /updateAdaptiveResolution/);
  assert.match(arena, /renderer\.setAnimationLoop\(animate\)/);
  assert.match(arena, /renderer\.setAnimationLoop\(null\)/);
});


test('keeper camera computes enough distance to keep the complete goal in frame on different aspect ratios', () => {
  assert.match(arena, /function keeperGoalFramingDistance/);
  assert.match(arena, /const hfov = 2 \* Math\.atan/);
  assert.match(arena, /GOAL_W \/ 2 \+ \.62/);
  assert.match(arena, /GOAL_H \/ 2 \+ \.72/);
  assert.match(arena, /GOAL_Z - goalDistance/);
});


test('V4 normalizes player and ball dimensions to real football scale', () => {
  assert.match(arena, /const GOAL_W = 7\.32/);
  assert.match(arena, /const GOAL_H = 2\.44/);
  assert.match(arena, /new THREE\.SphereGeometry\(\.11/);
  assert.match(arena, /targetHeight = index === clamp\(\(liveRef\.current\.room\?\.state \|\| \{\}\)\.keeper, 0, 1\) \? 1\.86 : 1\.76/);
  assert.match(arena, /targetHeight \/ height/);
  assert.match(arena, /root\.scale\.setScalar\(\.56\)/);
});

test('V4 keeper camera is physically behind the goal with the complete goal visible', () => {
  assert.match(arena, /GOAL_Z - goalDistance/);
  assert.match(arena, /2\.45/);
  assert.match(arena, /fov = 72/);
  assert.match(arena, /keeperApron/);
  assert.match(arena, /goal\.userData\.netMat\.opacity = mix\(goal\.userData\.netMat\.opacity, \.12/);
});

test('V4 streams keeper movement while dragging and keeps the server authoritative', () => {
  assert.match(match, /keeperMoveThrottle/);
  assert.match(match, /pendingKeeperMove/);
  assert.match(match, /keeperFinalAction/);
  assert.match(match, /queueKeeperMove\(\{ type:'hold', direction, intensity \}\)/);
  assert.match(match, /queueKeeperFinal\(parsed\)/);
  assert.match(server, /state\.lastKeeperMoveAt = at/);
  assert.match(server, /const lateralSpeed = 2\.15 \+ intensity \* \.9/);
  assert.match(server, /direction \* lateralSpeed \* dt/);
});

test('V4 local prediction prioritizes instant control then reconciles softly', () => {
  assert.match(arena, /inputSmooth/);
  assert.match(arena, /const lateralSpeed = 4\.15 \+ intensity \* 2\.35/);
  assert.match(arena, /const forwardSpeed = \(5\.15 \+ intensity \* 3\.05\)/);
  assert.match(arena, /const drive = \.2 \+ intensity \* \.8/);
  assert.match(arena, /input\?\.active \? \.35 : 12\.5/);
  assert.match(arena, /const lateralSpeed = 7\.35 \+ intensity \* 3\.45/);
  assert.match(arena, /const drive = \.22 \+ intensity \* \.78/);
  assert.match(arena, /input\?\.active \? \.25 : 15/);
});


test('V4 goalkeeper view is a true behind-goal camera with visible turf behind the net', () => {
  assert.match(arena, /new THREE\.PlaneGeometry\(FIELD_W \+ 4, 10\)/);
  assert.match(arena, /keeperApron\.position\.set\(0, -\.002, GOAL_Z - 5\)/);
  assert.match(arena, /fov = 72/);
  assert.match(arena, /serverKeeper\.x \* \.56/);
  assert.match(arena, /2\.18 \+ keeperDepth \* \.08/);
  assert.match(arena, /GOAL_Z - goalDistance - keeperDepth \* \.22/);
  assert.match(arena, /GOAL_Z \+ 7\.4/);
});

test('V4 uses football-scale player and ball dimensions', () => {
  assert.match(arena, /new THREE\.SphereGeometry\(\.11/);
  assert.match(arena, /targetHeight = index === clamp\(\(liveRef\.current\.room\?\.state \|\| \{\}\)\.keeper, 0, 1\) \? 1\.86 : 1\.76/);
  assert.match(arena, /model\.scale\.setScalar\(\.56\)/);
  assert.match(arena, /const GOAL_H = 2\.44/);
});

test('V4 local movement is tuned for immediate football-game response', () => {
  assert.match(arena, /const lateralSpeed = 4\.15 \+ intensity \* 2\.35/);
  assert.match(arena, /const lateralSpeed = 7\.35 \+ intensity \* 3\.45/);
  assert.match(arena, /snapshot\.selfIndex \? 30 : 12/);
  assert.match(arena, /selfKeeper \? 34 : 12/);
  assert.match(arena, /selfKeeper \? 18 : 8\.5/);
});

test('V4 server movement supports responsive lateral attack and keeper positioning', () => {
  assert.match(server, /ix \* \(\.34 \+ intensity\*\.2\) \* dt/);
  assert.match(server, /const lateralSpeed = 2\.15 \+ intensity \* \.9/);
});


test('V5 touch controls add dead zones, absolute training drag and a hold-to-charge trigger',()=>{
 assert.match(joystick,/deadZone=9/);
 assert.match(joystick,/Math\.pow\(normalized,1\.28\)/);
 assert.match(match,/const keeperDeadZone = 9/);
 assert.match(match,/shapeJoystick/);
 assert.match(match,/detectJoystickTechnique/);
 assert.match(match,/penalty-shot-charge/);
 assert.match(match,/data-charging/);
 assert.match(training,/shapeJoystick/);
 assert.match(training,/penalty-face-cluster/);
 assert.match(training,/data-tone="black"/);
 assert.match(training,/data-tone="white"/);
 assert.match(training,/data-tone="beur"/);
 assert.match(training,/>3B<\/b>/);
 assert.match(training,/heldMs<300/);
 assert.match(training,/penalty-shot-charge/);
 assert.match(controls,/penalty-face-cluster/);
 assert.match(controls,/3B CONTROL/);
});

test('V5 sends goals physically inside the net and builds a 3B world behind the cage',()=>{
 assert.match(arena,/function createThreeBGoalWorld/);
 assert.match(arena,/3B_WORLD_BEHIND_GOAL/);
 assert.match(arena,/MONDE DU 3B · NEXUS/);
 assert.match(arena,/GOAL_Z - 1\.42/);
 assert.match(arena,/event\.type === 'goal' && t > \.76/);
 assert.match(arena,/createThreeBGoalWorld\(scene, mobile\)/);
});

test('V6 premium street-foot movement keeps direction, roulette, camera lead and richer players',()=>{
 assert.match(arena,/followAngle/);
 assert.match(arena,/action === 'rhythm'/);
 assert.match(arena,/Math\.PI \* 1\.72/);
 assert.match(arena,/new THREE\.TorusGeometry\(\.15/);
 assert.match(arena,/const eyeMat = makeMaterial/);
 assert.match(arena,/inputSmooth/);
 assert.match(arena,/fov = 48\.5 \+ pace \* 2\.15/);
 assert.match(controls,/data-technique/);
 assert.match(controls,/--stick-power/);
});


test('V7 separates desktop keyboard-mouse from high precision touch controls', () => {
  assert.match(match, /penaltyInputMode/);
  assert.match(match, /keyboardVector\(desktopKeys\.current\)/);
  assert.match(match, /coalescedPointerSample/);
  assert.match(match, /pointerAim/);
  assert.match(match, /data-input=\{inputMode\}/);
  assert.match(match, /FLÈCHES \/ WASD/);
  assert.match(match, /CLIC MAINTENU = TIR/);
  assert.match(joystick, /export function penaltyInputMode/);
  assert.match(joystick, /getCoalescedEvents/);
  assert.match(joystick, /export function keyboardVector/);
});

test('V7 gives the goalkeeper true lateral and depth mobility with camera follow', () => {
  assert.match(server, /keeper:\{x:0,y:0\}/);
  assert.match(server, /const forward = safeDirection\(input\?\.forward\)/);
  assert.match(server, /const depthSpeed = \.72 \+ intensity \* \.78/);
  assert.match(server, /state\.positions\.keeper\.x = clamp/);
  assert.match(server, /keeperDepth:number\(state\.positions\?\.keeper\?\.x\)/);
  assert.match(arena, /const KEEPER_FORWARD_Z = GOAL_Z \+ 4\.25/);
  assert.match(arena, /clamp\(input\.forward, -1, 1\) \* depthSpeed/);
  assert.match(arena, /serverKeeper\.x \* \.56/);
  assert.match(arena, /renderKeeper,/);
});

test('V7 removes the goalkeeper overlay/filter and adds lightweight match decor', () => {
  assert.doesNotMatch(controls, /CAGE ENTIÈRE · CAMÉRA GARDIEN/);
  assert.match(controls, /penalty-match\[data-role="keeper"\] \.penalty-pitch-3d::after\{display:none\}/);
  assert.match(arena, /function createPremiumMatchDecor/);
  assert.match(arena, /createPremiumMatchDecor\(scene, mobile\)/);
});

test('V7 keeps street football skill motions visual and immediate', () => {
  assert.match(arena, /action === 'feint'/);
  assert.match(arena, /legR\.hip\.rotation\.x \+= Math\.max\(0, step\) \* \.72/);
  assert.match(arena, /action === 'cut'/);
  assert.match(arena, /action === 'rhythm'/);
});
