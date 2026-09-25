import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell=readFileSync(new URL('../src/games/Dada3B.jsx',import.meta.url),'utf8');
const three=readFileSync(new URL('../src/games/Dada3BThree.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/games/dada3b.css',import.meta.url),'utf8');

test('V8 removes the crushed-black presentation and keeps a readable blue-night scene',()=>{
  assert.match(three,/scene\.background=new THREE\.Color\(0x0d2730\)/);
  assert.match(three,/FogExp2\(0x0d2730,\.010\)/);
  assert.match(three,/toneMappingExposure=1\.52/);
  assert.match(css,/dada3b-shell-v8/);
  assert.match(css,/linear-gradient\(145deg,#17333a 0%,#102930 46%,#0b2026 100%\)/);
});

test('V8 makes turn ownership and legal destinations explicit',()=>{
  assert.match(shell,/dada3b-board-turn-chip/);
  assert.match(shell,/À TOI/);
  assert.match(shell,/data-legal-target=\{target\}/);
  assert.match(three,/function syncLegalFx/);
  assert.match(three,/previewMove\(match,pieceIndex,match\.pendingRoll,match\.turn\)/);
  assert.match(css,/dadaLegalTargetV8/);
});

test('V8 menu exposes exactly the four primary decisions before secondary options',()=>{
  assert.match(shell,/Choisis\. Lance\. Joue\./);
  assert.match(shell,/<strong>Jouer<\/strong>/);
  assert.match(shell,/<strong>Reprendre<\/strong>/);
  assert.match(shell,/<strong>Multijoueur<\/strong>/);
  assert.match(shell,/<strong>Classement<\/strong>/);
  assert.match(shell,/dada3b-menu-more-v8/);
  assert.match(shell,/Plus d’options/);
});

test('V8 multiplayer modes live in one compact selector instead of separate home cards',()=>{
  assert.match(shell,/dada3b-online-tabs/);
  assert.match(shell,/\['quick','Rapide'\]/);
  assert.match(shell,/\['private','Privé'\]/);
  assert.match(shell,/\['join','Rejoindre'\]/);
  assert.match(shell,/\['ranked','Classé'\]/);
  assert.match(shell,/\['team2v2','2v2'\]/);
});

test('V8 animation hierarchy keeps ambient effects quiet and gameplay feedback short',()=>{
  assert.match(three,/const count=180/);
  assert.match(three,/opacity:\.22/);
  assert.match(three,/landingUntil=performance\.now\(\)\+320/);
  assert.match(three,/age>\.68/);
  assert.match(three,/cameraShakeUntil=performance\.now\(\)\+360/);
});

test('V8 remains responsive and reduced-motion safe',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/dada3b-online-tabs/);
  assert.match(css,/dada3b-board-turn-chip/);
});

test('V9 moves stables away from the track and turns the four pieces into animated warriors',()=>{
  assert.match(three,/STABLE_RING_FACTOR=1\.255/);
  assert.match(three,/WARRIOR_ARCHETYPES=Object\.freeze\(\['axe','sword','shield','bow'\]\)/);
  assert.match(three,/archetype==='axe'/);
  assert.match(three,/archetype==='sword'/);
  assert.match(three,/archetype==='shield'/);
  assert.match(three,/attackUntil=actionAt\+560/);
  assert.match(shell,/data-warrior=\{archetype\}/);
  assert.match(shell,/WARRIOR_LABELS/);
  assert.match(css,/dada3b-warrior-icon/);
  assert.match(css,/DADA 3B V9/);
  assert.match(three,/bridgeLength=Math\.max\(\.8/);
  assert.match(three,/BoxGeometry\(\.72,\.12,bridgeLength\)/);
  assert.match(three,/CylinderGeometry\(\.56,\.64,1\.55,10\)/);
  assert.match(shell,/factor=1\.20/);
  assert.match(shell,/Choisis un guerrier/);
});

test('V10 uses premium rounded cells, player-follow camera, spatial dice and capture reconstruction',()=>{
  assert.match(three,/RoundedBoxGeometry/);
  assert.match(three,/function cameraPoseForCountry/);
  assert.match(three,/desiredCameraPosition/);
  assert.match(three,/cameraFollowUntil/);
  assert.match(three,/function createCaptureCinematic/);
  assert.match(three,/CINEMATIC_CAPTURE_MS=1180/);
  assert.match(three,/runtime\.captureCinematics/);
  assert.match(three,/function createTurnAnchor/);
  assert.match(shell,/TURN_PHASE_LABELS/);
  assert.match(shell,/dada3b-player-dice/);
  assert.match(shell,/data-phase=\{phase\}/);
  assert.match(css,/DADA 3B V10/);
  assert.match(css,/dadaDiceOrbitV10/);
  assert.match(css,/FRACTURE MATRIX/);
});
