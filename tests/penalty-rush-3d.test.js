import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const match = readFileSync(new URL('../src/games/PenaltyRush.jsx', import.meta.url), 'utf8');
const arena = readFileSync(new URL('../src/games/penaltyRush/PenaltyRushArena3D.jsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../supabase/functions/penalty-rush/index.ts', import.meta.url), 'utf8');

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
  assert.match(match, /now - moveThrottle\.current < 50/);
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
  assert.match(arena, /fov = 63/);
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
  assert.match(match, /moveThrottle\.current < 50/);
  assert.match(match, /keeper:\{ direction:0, intensity:0, active:false \}/);
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
  assert.match(arena, /const targetHeight = 1\.82/);
  assert.match(arena, /targetHeight \/ height/);
  assert.match(arena, /root\.scale\.setScalar\(\.56\)/);
});

test('V4 keeper camera is physically behind the goal without an opaque end stand', () => {
  assert.match(arena, /GOAL_Z - goalDistance/);
  assert.match(arena, /2\.42/);
  assert.match(arena, /fov = 61/);
  assert.doesNotMatch(arena, /const endStand = new THREE\.Mesh/);
  assert.match(arena, /goal\.userData\.netMat\.opacity = mix\(goal\.userData\.netMat\.opacity, \.065/);
});

test('V4 streams keeper movement while dragging and keeps the server authoritative', () => {
  assert.match(match, /keeperMoveThrottle/);
  assert.match(match, /pendingKeeperMove/);
  assert.match(match, /keeperFinalAction/);
  assert.match(match, /queueKeeperMove\(\{ type:'hold', direction, intensity \}\)/);
  assert.match(match, /queueKeeperFinal\(parsed\)/);
  assert.match(server, /state\.lastKeeperMoveAt = at/);
  assert.match(server, /const lateralSpeed = 1\.65 \+ intensity \* 1\.35/);
  assert.match(server, /direction \* lateralSpeed \* dt/);
});

test('V4+ local prediction prioritizes instant control then reconciles softly', () => {
  assert.match(arena, /const lateralSpeed = 5\.4 \+ intensity \* 1\.8/);
  assert.match(arena, /const forwardSpeed = \(6\.8 \+ intensity \* 4\.4\)/);
  assert.match(arena, /input\?\.active \? \.55 : 10\.5/);
  assert.match(arena, /const desiredX = direction \* \(GOAL_W \/ 2 - \.28\)/);
  assert.match(arena, /expFollow\(34, dt\)/);
});


test('V5 goalkeeper camera stays centered behind the whole goal', () => {
  assert.match(arena, /fov = 63/);
  assert.match(arena, /desired\.set\(\s*0,\s*2\.42,\s*GOAL_Z - goalDistance/);
  assert.match(arena, /goal\.userData\.netMat\.opacity = mix\(goal\.userData\.netMat\.opacity, \.028/);
  assert.match(arena, /clamp\(serverAttack\.x \* \.12, -1\.15, 1\.15\)/);
});

test('V5 goalkeeper follows horizontal finger travel almost directly', () => {
  assert.match(match, /const horizontal = Math\.abs\(dx\)/);
  assert.match(match, /const intensity = Math\.min\(1, horizontal \/ 82\)/);
  assert.match(arena, /const desiredX = direction \* \(GOAL_W \/ 2 - \.28\)/);
  assert.match(arena, /expFollow\(34, dt\)/);
});

test('V5 prioritizes local control and tighter ball touches', () => {
  assert.match(arena, /const lateralSpeed = 5\.4 \+ intensity \* 1\.8/);
  assert.match(arena, /const forwardSpeed = \(6\.8 \+ intensity \* 4\.4\)/);
  assert.match(arena, /input\?\.active \? \.55 : 10\.5/);
  assert.match(arena, /index === snapshot\.selfIndex \? 32 : 10/);
  assert.match(arena, /normalBall\.x \+= touchPhase \* \(\.055 \+ inputIntensity \* \.045\)/);
  assert.match(arena, /normalBall\.z \+= inputY \* \(\.06 \+ inputIntensity \* \.12\)/);
});
