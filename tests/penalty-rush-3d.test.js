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
  assert.match(arena, /new THREE\.SphereGeometry\(\.23/);
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
  assert.match(match, /now - moveThrottle\.current < 80/);
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
  assert.match(arena, /GOAL_Z - 5\.35/);
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
  assert.match(arena, /renderKeeper\.x \+=/);
  assert.match(match, /moveThrottle\.current < 60/);
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
