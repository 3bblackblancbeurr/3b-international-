import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { goldMasterTokens } from './tokens.js';
import { REALM_PREVIEWS } from './experience-policy.js';

// Reusable art kit. Static details are merged by district and material, so a
// hundred windows cost one draw call. No accounts, rewards or world saves here.
export function buildUniverseArchitecture() {
  const c = goldMasterTokens.colors;
  const root = new THREE.Group(); root.name = 'Cite_Origine_Architecture';
  const color = (a, b, blend) => new THREE.Color(a).lerp(new THREE.Color(b), blend);
  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: color(c.carbon, c.text, .20), roughness: .82 }),
    ivory: new THREE.MeshStandardMaterial({ color: color(c.text, c.champagne, .18), roughness: .75 }),
    gold: new THREE.MeshStandardMaterial({ color: c.champagne, metalness: .65, roughness: .32 }),
    roof: new THREE.MeshStandardMaterial({ color: color(c.carbon, c.matrix, .2), metalness: .2, roughness: .6 }),
    clay: new THREE.MeshStandardMaterial({ color: color(c.champagne, c.danger, .2), roughness: .9 }),
    green: new THREE.MeshStandardMaterial({ color: color(c.carbon, c.success, .23), roughness: .96 }),
    window: new THREE.MeshStandardMaterial({ color: c.champagneHighlight, emissive: c.champagne, emissiveIntensity: .65, roughness: .4 }),
    energy: new THREE.MeshStandardMaterial({ color: c.matrix, emissive: c.matrix, emissiveIntensity: 1.8, roughness: .3 }),
  };
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    column: new THREE.CylinderGeometry(1, 1, 1, 16),
    cone: new THREE.ConeGeometry(1, 1, 12),
    rock: new THREE.CylinderGeometry(1, .38, 1, 10),
    sphere: new THREE.SphereGeometry(1, 10, 7),
    dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    arch: new THREE.TorusGeometry(1, .11, 6, 20, Math.PI),
    ring: new THREE.TorusGeometry(1, .065, 6, 40),
    fragment: new THREE.TorusGeometry(5.2, .42, 8, 12, Math.PI * .2),
  };
  const temporary = new THREE.Object3D();
  const batches = new Map();
  function district(name, x = 0, z = 0, rotation = 0) {
    const group = new THREE.Group(); group.name = name; group.position.set(x, 0, z); group.rotation.y = rotation;
    root.add(group); batches.set(group, new Map()); return group;
  }
  function part(group, shape, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    temporary.position.set(x, y, z); temporary.scale.set(sx, sy, sz); temporary.rotation.set(rx, ry, rz); temporary.updateMatrix();
    const geometry = geo[shape].clone().applyMatrix4(temporary.matrix);
    const batch = batches.get(group); if (!batch.has(material)) batch.set(material, []); batch.get(material).push(geometry);
  }
  function tree(group, x, y, z, size = 1, pine = false) {
    part(group, 'column', 'clay', x, y + .65 * size, z, .09 * size, 1.3 * size, .09 * size);
    if (pine) {
      for (let i = 0; i < 3; i++) part(group, 'cone', 'green', x, y + (1.2 + i * .5) * size, z, (.65 - i * .12) * size, 1.2 * size, (.65 - i * .12) * size);
    } else part(group, 'sphere', 'green', x, y + 1.6 * size, z, .8 * size, .75 * size, .8 * size);
  }
  function house(group, x, z, height, material = 'stone', roof = 'roof') {
    part(group, 'box', material, x, .65 + height / 2, z, 1.6, height, 1.4);
    part(group, 'box', 'gold', x, height + .72, z, 1.72, .1, 1.52);
    part(group, 'cone', roof, x, height + 1.2, z, 1.25, .9, 1.1, 0, Math.PI / 4);
    for (let floor = 0; floor < Math.floor(height); floor++) for (const side of [-1, 1]) {
      part(group, 'box', 'window', x + side * .39, 1.3 + floor * .85, z + .71, .27, .42, .02);
      part(group, 'box', 'window', x + .81, 1.3 + floor * .85, z + side * .33, .02, .42, .25);
    }
  }
  function arcade(group, x, z, width = 1, material = 'ivory', y = .65, turn = 0) {
    part(group, 'arch', material, x, y + 1.5 * width, z, width, width, width, 0, turn);
    for (const side of [-1, 1]) part(group, 'column', material, x + Math.cos(turn) * side * width, y + .75 * width, z - Math.sin(turn) * side * width, .1 * width, 1.5 * width, .1 * width);
  }

  const hub = district('NEXUS');
  part(hub, 'rock', 'stone', 0, -4.4, 0, 18, 8, 18);
  part(hub, 'column', 'gold', 0, -.29, 0, 17, .16, 17);
  part(hub, 'column', 'stone', 0, -.13, 0, 16.8, .24, 16.8);
  part(hub, 'column', 'ivory', 0, 1.15, 0, 8.2, 2.3, 8.2);
  part(hub, 'column', 'stone', 0, 2.35, 0, 8, .12, 8);
  for (const radius of [7.6, 10.8, 15.8]) part(hub, 'ring', 'gold', 0, radius < 8 ? 2.43 : .02, 0, radius, radius, radius, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    part(hub, 'box', 'ivory', 0, .1 + i * .1, 12 - i * .33, 5, .2 + i * .2, .36);
    part(hub, 'box', 'gold', 0, .21 + i * .2, 12.16 - i * .33, 5, .025, .025);
  }
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + .15;
    part(hub, 'fragment', 'gold', 0, 8.5, 0, 1, 1, 1, 0, 0, angle);
    part(hub, 'fragment', 'energy', 0, 8.5, -.08, .91, .91, .22, 0, 0, angle);
    const x = Math.sin(angle) * 13.7, z = Math.cos(angle) * 13.7;
    house(hub, x, z, 2.8 + (i % 3), 'stone');
    tree(hub, x * .84, 0, z * .84, .85);
    part(hub, 'column', 'gold', x * 1.12, .65, z * 1.12, .06, 1.3, .06);
    part(hub, 'sphere', 'window', x * 1.12, 1.38, z * 1.12, .15, .22, .15);
  }
  // Interior arcades and undercroft remain visible from the moving camera.
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12, x = Math.sin(angle) * 8.25, z = Math.cos(angle) * 8.25;
    arcade(hub, x, z, .78, 'stone', .04, angle);
  }

  const anchors = [], countryGroups = [];
  REALM_PREVIEWS.forEach((realm, index) => {
    const angle = index * Math.PI / 4, x = Math.sin(angle) * 30, z = Math.cos(angle) * 30;
    const group = district(realm.code, x, z, angle); group.userData = { country: realm.name, value: realm.value, guardian: realm.guardian };
    countryGroups.push(group); anchors.push(new THREE.Vector3(x, 3, z));
    part(group, 'rock', 'stone', 0, -2.5, 0, 6.7, 6, 6.7);
    part(group, 'column', 'gold', 0, .55, 0, 6.7, .13, 6.7);
    part(group, 'column', 'stone', 0, .65, 0, 6.55, .1, 6.55);
    part(group, 'box', 'stone', 0, .24, -9.5, 2.2, .36, 10);
    for (const side of [-1, 1]) {
      part(group, 'box', 'gold', side * 1.06, .83, -9.5, .06, .06, 10);
      for (let step = 0; step < 8; step++) part(group, 'column', 'gold', side * 1.06, .6, -5.2 - step * 1.22, .035, .5, .035);
    }
    arcade(group, 0, -4.2, 1.2, 'gold');
    part(group, 'arch', 'energy', 0, 2.45, -4.18, 1.04, 1.04, .45);
    for (let b = 0; b < 4; b++) {
      const a = Math.PI * .2 + b * Math.PI * .52;
      house(group, Math.cos(a) * 4.7, Math.sin(a) * 4.7, 1.3 + (b % 3) * .4, [2,3,5,6].includes(index) ? 'ivory' : 'stone');
      tree(group, Math.cos(a + .27) * 5.4, .72, Math.sin(a + .27) * 5.4, .68, index === 7);
    }
    if (index === 0) { // France: court, colonnade, slate roof and axial symmetry.
      part(group, 'box', 'ivory', 0, 2.05, 1, 4.8, 2.8, 2.8);
      for (let i = 0; i < 6; i++) part(group, 'column', 'ivory', -2.15 + i * .86, 2.05, -.65, .13, 2.8, .13);
      part(group, 'box', 'gold', 0, 3.56, -.65, 5, .18, .5);
      part(group, 'cone', 'roof', 0, 4.35, 1, 3.55, 1.5, 2.3, 0, Math.PI / 4);
      part(group, 'dome', 'gold', 0, 5, 1, .8, .8, .8);
    } else if (index === 1) { // Algeria: three rising blades joined around a garden.
      part(group, 'column', 'ivory', 0, .85, 0, 2.4, .4, 2.4);
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        part(group, 'box', 'ivory', Math.sin(a) * .95, 3.5, Math.cos(a) * .95, .55, 5.4, .8, Math.sin(a) * .12, a, Math.cos(a) * -.12);
        part(group, 'cone', 'gold', Math.sin(a) * .7, 6.6, Math.cos(a) * .7, .5, 1.3, .5);
      }
      for (let i = 0; i < 6; i++) tree(group, Math.sin(i) * 2.8, .7, Math.cos(i) * 2.8, .85);
    } else if (index === 2) { // Morocco: courtyard palace, arcades and corner towers.
      part(group, 'box', 'clay', 0, 1.8, 1, 4.8, 2.3, 3.8);
      for (const x of [-1.6, 0, 1.6]) arcade(group, x, -1, .64, 'gold');
      for (const x of [-2, 2]) for (const z of [-.7, 2.7]) {
        part(group, 'box', 'ivory', x, 2.65, z, .8, 4, .8);
        part(group, 'cone', 'roof', x, 4.98, z, .72, .7, .72, 0, Math.PI / 4);
      }
      part(group, 'dome', 'gold', 0, 3, 1, 1.2, .8, 1.2);
    } else if (index === 3) { // Tunisia: white terraces and restrained blue openings.
      for (let i = 0; i < 3; i++) {
        part(group, 'box', 'ivory', (i - 1) * 1.7, 1.6 + i * .32, i * .4, 1.9, 1.9 + i * .65, 2.6);
        part(group, 'dome', 'ivory', (i - 1) * 1.7, 2.6 + i * .64, i * .4, .86, .8, .86);
        arcade(group, (i - 1) * 1.7, i * .4 - 1.34, .45, 'roof');
      }
    } else if (index === 4) { // Spain: a sculpted cluster of warm, narrow spires.
      part(group, 'column', 'clay', 0, 1.5, 0, 2.4, 1.7, 2.4);
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7, h = 3.8 + (i % 3) * .75;
        part(group, 'column', 'ivory', Math.sin(a) * 1.65, .7 + h / 2, Math.cos(a) * 1.65, .34, h, .34);
        part(group, 'cone', 'clay', Math.sin(a) * 1.65, h + 1.25, Math.cos(a) * 1.65, .55, 1.1, .55);
      }
    } else if (index === 5) { // Italy: elliptical galleries on two inhabited levels.
      for (let level = 0; level < 2; level++) {
        const y = .8 + level * 1.9;
        part(group, 'ring', 'ivory', 0, y, 0, 3.8, 2.8, 3.8, Math.PI / 2);
        for (let i = 0; i < 20; i++) {
          const a = i * Math.PI / 10;
          part(group, 'column', 'ivory', Math.sin(a) * 3.8, y + .8, Math.cos(a) * 2.8, .16, 1.65, .16);
        }
      }
      part(group, 'ring', 'gold', 0, 4.55, 0, 3.8, 2.8, 3.8, Math.PI / 2);
    } else if (index === 6) { // Turkey: a domed civic palace and four slender towers.
      part(group, 'box', 'ivory', 0, 1.8, 0, 3.8, 2.3, 3.8);
      part(group, 'dome', 'roof', 0, 3, 0, 2.25, 1.8, 2.25);
      for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) {
        part(group, 'column', 'ivory', x, 3, z, .25, 4.7, .25);
        part(group, 'cone', 'gold', x, 5.9, z, .34, 1.2, .34);
      }
    } else { // Estonia: steep roofs, spires and pine gardens.
      part(group, 'column', 'ivory', 0, 2.7, 0, 1.25, 4.1, 1.25);
      part(group, 'cone', 'roof', 0, 6.1, 0, 1.65, 3, 1.65);
      for (const x of [-2.6, 2.6]) {
        house(group, x, 1, 3.8, 'ivory');
        for (let i = 0; i < 3; i++) tree(group, x, .7, -2.4 + i * 1.4, 1, true);
      }
    }
  });

  const resources = [];
  for (const [group, batch] of batches) for (const [material, pieces] of batch) {
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach(piece => piece.dispose());
    if (!geometry) throw new Error('Unable to assemble 3B architecture');
    geometry.computeBoundingSphere();
    const object = new THREE.Mesh(geometry, materials[material]); object.name = `${group.name}_${material}`;
    object.castShadow = material !== 'energy'; object.receiveShadow = true; group.add(object); resources.push(geometry);
  }
  Object.values(geo).forEach(geometry => geometry.dispose());
  root.updateMatrixWorld(true);
  root.userData = { artVersion: '2.1', countries: REALM_PREVIEWS.map(realm => realm.code), category: 'architectural-preview', savedWorldIndependent: true };
  let disposed = false;
  return { root, anchors, materials, countryGroups,
    dispose() { if (disposed) return; disposed = true; resources.forEach(resource => resource.dispose()); Object.values(materials).forEach(material => material.dispose()); } };
}
