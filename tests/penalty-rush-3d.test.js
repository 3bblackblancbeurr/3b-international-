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
  assert.match(match, /now - moveThrottle\.current < 45/);
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
  assert.match(arena, /fov = 59/);
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
  assert.match(arena, /const desiredLocalX = position \* \(GOAL_W \/ 2 - \.28\)/);
  assert.match(arena, /renderKeeper\.x = mix\(renderKeeper\.x, desiredLocalX, \.98\)/);
  assert.match(match, /moveThrottle\.current < 45/);
  assert.match(match, /keeper:\{ position:0, direction:0, intensity:0, active:false \}/);
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


test('V4 keeps a permanent clear corridor behind the goal for the goalkeeper camera', () => {
  assert.doesNotMatch(arena, /const endStand =/);
  assert.match(arena, /rearLeft\.position\.set\(-7\.7, 3\.4, GOAL_Z - 13\.5\)/);
  assert.match(arena, /rearRight\.position\.set\(7\.7, 3\.4, GOAL_Z - 13\.5\)/);
  assert.match(arena, /keeperGoalFramingDistance/);
});

test('V3 calibrates human and ball scale to football dimensions', () => {
  assert.match(arena, /const targetHeight = 1\.82/);
  assert.match(arena, /actor\.object\.scale\.multiplyScalar\(targetHeight \/ size\.y\)/);
  assert.match(arena, /new THREE\.SphereGeometry\(\.11/);
  assert.match(arena, /root\.scale\.setScalar\(\.56\)/);
});

test('goalkeeper lateral movement is sent continuously while dragging and predicted instantly', () => {
  assert.match(match, /keeperMoveThrottle = useRef\(0\)/);
  assert.match(match, /queueKeeper\(\{/);
  assert.match(match, /type:'keeper-track'/);
  assert.match(match, /now - keeperMoveThrottle\.current >= 45/);
  assert.match(arena, /desiredLocalX/);
  assert.match(arena, /expFollow\(selfKeeper \? 30 : 12/);
});

test('local attacker prediction prioritizes immediate input over server correction while input is held', () => {
  assert.match(arena, /const lateralSpeed = 4\.6 \+ intensity \* 1\.4/);
  assert.match(arena, /const forwardSpeed = \(6\.2 \+ intensity \* 2\.1\)/);
  assert.match(arena, /input\?\.active \? \.9 : 8\.5/);
  assert.match(arena, /index === snapshot\.selfIndex \? 28 : 11/);
});


test('V3 uses official football proportions for goal and ball', () => {
  assert.match(arena, /const GOAL_W = 7\.32/);
  assert.match(arena, /const GOAL_H = 2\.44/);
  assert.match(arena, /new THREE\.SphereGeometry\(\.11/);
  assert.match(arena, /const targetHeight = 1\.82/);
});

test('behind-goal keeper camera has a permanent unobstructed central corridor', () => {
  assert.doesNotMatch(arena, /const endStand =/);
  assert.match(arena, /rearLeft\.position\.set\(-7\.7/);
  assert.match(arena, /rearRight\.position\.set\(7\.7/);
  assert.match(arena, /desired\.set\(\s*0,\s*2\.82,\s*GOAL_Z - goalDistance/);
});

test('keeper tracking is absolute, immediate and server-authoritative', () => {
  assert.match(match, /type:'keeper-track'/);
  assert.match(match, /const position = Math\.max\(-1, Math\.min\(1, Number\(gesture\.keeperBase \|\| 0\) \+ dx \/ 74\)\)/);
  assert.match(match, /keeperMoveThrottle\.current >= 45/);
  assert.match(server, /if \(type === 'keeper-track'\)/);
  assert.match(server, /state\.positions\.keeper\.y = clamp\(position, -\.95, \.95\)/);
});

test('server movement tuning supports competitive responsiveness', () => {
  assert.match(server, /const speed = \(\.17 \+ intensity \* \.16\)/);
  assert.match(server, /ix \* \(\.26 \+ intensity\*\.18\)/);
});
