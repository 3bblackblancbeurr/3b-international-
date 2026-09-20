import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('current World 3B explicitly requests landscape and blocks portrait play on phones', () => {
  const page = read('src/world/WorldPage.jsx');
  const css = read('src/world/world.css');
  assert.match(page, /orientation\?\.lock\?\.\('landscape'\)/);
  assert.match(page, /className="world-rotate-device"/);
  assert.match(page, /Le Monde du 3B se joue en horizontal/);
  assert.match(css, /@media \(orientation:portrait\) and \(max-width:900px\)/);
  assert.match(css, /\.world-rotate-device/);
});

test('current character editor exposes the 16-weapon armory and saves weapon changes with the avatar', () => {
  const avatar = read('src/world/AvatarPanel.jsx');
  const arsenal = read('src/world/arsenal.js');
  assert.match(avatar, /import Armory from '\./armory/Armory\.jsx'/);
  assert.match(avatar, />Armurerie<\/button>/);
  assert.match(avatar, /<Armory draft=\{draft\} change=\{merge\} xp=\{save\.xp\}\/>/);
  assert.match(avatar, /Enregistrer personnage & arme/);
  const weapons = [...arsenal.matchAll(/weapon\('/g)];
  assert.equal(weapons.length, 16);
});

test('phone landscape receives the compact four-pillar command center and armory layout', () => {
  const menu = read('src/world/command-center.css');
  const armory = read('src/world/weapon-customizer.css');
  assert.match(menu, /@media\(max-height:550px\) and \(orientation:landscape\)/);
  assert.match(menu, /\.command-center\{grid-template-columns:86px minmax\(0,1fr\)/);
  assert.match(menu, /\.command-tabs\{grid-template-columns:1fr/);
  assert.match(armory, /\.weapon-gallery/);
});

test('pause menu exposes character and weapons together', () => {
  const menu = read('src/world/WorldCommandCenter.jsx');
  assert.match(menu, /Personnage & armes/);
});
