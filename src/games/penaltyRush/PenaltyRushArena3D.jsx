import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createLivingLibrary, createLivingActor } from '../../world/living.js';

const FIELD_W = 22;
const FIELD_L = 44;
const FIELD_HALF_W = FIELD_W / 2;
const FIELD_HALF_L = FIELD_L / 2;
const GOAL_W = 7.32;
const GOAL_H = 2.44;
const GOAL_Z = -19.75;
const START_Z = 15.8;
const ATTACK_END_Z = -12.1;
const LATERAL = 7.7;
const KEEPER_Z = -18.35;

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const mix = (a, b, t) => a + (b - a) * t;
const expFollow = (rate, dt) => 1 - Math.exp(-rate * dt);
const validHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;

const COUNTRY_KITS = {
  fr: ['#14385f', '#f4f4f0'],
  dz: ['#1f6d43', '#f4f4f0'],
  ma: ['#8a1538', '#d8b35e'],
  tn: ['#b32631', '#f4f4f0'],
  tr: ['#b32631', '#f4f4f0'],
  it: ['#14385f', '#2f8a54'],
  es: ['#b32631', '#d8b35e'],
  ee: ['#101820', '#54c8ef'],
};

function appearanceFor(player, profile, self = false) {
  const fallback = COUNTRY_KITS[player?.countryId] || ['#08090b', '#d8b35e'];
  const kit = self ? profile?.kit || {} : player?.kit || {};
  const boots = self ? profile?.boots || {} : player?.boots || {};
  const seed = Math.abs(String(player?.countryId || '').split('').reduce((n, c) => n + c.charCodeAt(0), 0));
  return {
    shirt: validHex(kit.shirtPrimary, fallback[0]),
    trim: validHex(kit.shirtSecondary || kit.trim, fallback[1]),
    shorts: validHex(kit.shorts, '#08090b'),
    socks: validHex(kit.socks, fallback[0]),
    boots: validHex(boots.upper, '#08090b'),
    skin: ['#9a6748', '#b87b58', '#80563f', '#c18b68'][seed % 4],
    hair: ['#111315', '#2a1b13', '#0b0d0f'][seed % 3],
    number: clamp(self ? profile?.shirtNumber : player?.shirtNumber, 1, 99) || 10,
  };
}

function footballAvatar(appearance, seed = 0) {
  return {
    body:'homme',
    style:'voyageur',
    hair:seed % 5,
    color:0,
    fabricColor:appearance.shirt,
    accentColor:appearance.trim,
    trouserColor:appearance.shorts,
    bootColor:appearance.boots,
    skinColor:appearance.skin,
    hairColor:appearance.hair,
    headwear:'none',
    outer:'none',
    bag:false,
    shape:'elance',
    height:1,
    build:1.02,
    shoulders:.18,
    chest:.08,
    waist:-.08,
    hips:-.04,
    arms:.08,
    legs:.12,
    pattern:'uni',
    fabric:'satin',
    boots:0,
  };
}

function makeMaterial(color, roughness = 0.68, metalness = 0.04, emissive = '#000000', emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeNumberTexture(number, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = '900 78px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#06080a';
  ctx.strokeText(String(number), 64, 68);
  ctx.fillStyle = color;
  ctx.fillText(String(number), 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(48, 48, 2, 48, 48, 46);
  gradient.addColorStop(0, 'rgba(0,0,0,.48)');
  gradient.addColorStop(.45, 'rgba(0,0,0,.27)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.05),
    new THREE.MeshBasicMaterial({ map:texture, transparent:true, depthWrite:false, opacity:.84 }),
  );
}

function makeSegment(length, radius, material, sides = 8) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .86, radius, length, sides), material);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  pivot.userData.mesh = mesh;
  return pivot;
}

function makeArm(shirtMat, skinMat, gloveMat, side) {
  const shoulder = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.135, .145, .34, 8), shirtMat);
  sleeve.position.y = -.16;
  shoulder.add(sleeve);

  const upper = makeSegment(.49, .105, skinMat);
  upper.position.y = -.27;
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = -.49;
  upper.add(elbow);

  const fore = makeSegment(.47, .088, skinMat);
  elbow.add(fore);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), skinMat);
  hand.scale.set(.82, 1.05, .72);
  hand.position.y = -.48;
  fore.add(hand);

  const glove = new THREE.Mesh(new THREE.BoxGeometry(.24, .17, .14), gloveMat);
  glove.position.set(0, -.5, -.02);
  glove.visible = false;
  fore.add(glove);

  shoulder.rotation.z = side * .12;
  return { shoulder, upper, elbow, fore, hand, glove };
}

function makeLeg(skinMat, socksMat, bootMat, side) {
  const hip = new THREE.Group();

  const thigh = makeSegment(.68, .14, skinMat);
  hip.add(thigh);

  const knee = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), skinMat);
  knee.position.y = -.69;
  thigh.add(knee);

  const shinPivot = new THREE.Group();
  shinPivot.position.y = -.69;
  thigh.add(shinPivot);

  const shin = makeSegment(.7, .105, socksMat);
  shinPivot.add(shin);

  const boot = new THREE.Mesh(new THREE.BoxGeometry(.3, .2, .54), bootMat);
  boot.position.set(0, -.72, -.14);
  boot.rotation.x = -.08;
  shin.add(boot);

  hip.position.x = side * .23;
  return { hip, thigh, knee, shinPivot, shin, boot };
}

function createHumanoid(appearance) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const shirtMat = makeMaterial(appearance.shirt, .62);
  const trimMat = makeMaterial(appearance.trim, .52, .16);
  const shortsMat = makeMaterial(appearance.shorts, .72);
  const socksMat = makeMaterial(appearance.socks, .7);
  const bootMat = makeMaterial(appearance.boots, .48, .13);
  const skinMat = makeMaterial(appearance.skin, .78);
  const hairMat = makeMaterial(appearance.hair, .9);
  const gloveMat = makeMaterial('#e8f2f4', .42, .08, appearance.trim, .06);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(.72, .42, .43), shortsMat);
  pelvis.position.y = 1.42;
  rig.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.41, .49, 1.12, 8), shirtMat);
  torso.scale.z = .58;
  torso.position.y = 2.1;
  rig.add(torso);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.04, .18, .47), shirtMat);
  shoulders.position.y = 2.55;
  rig.add(shoulders);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(.15, .56, .025), trimMat);
  trim.position.set(0, 2.11, -.292);
  rig.add(trim);

  const backNumberTex = makeNumberTexture(appearance.number, appearance.trim);
  const numberPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(.5, .5),
    new THREE.MeshBasicMaterial({ map:backNumberTex, transparent:true, depthWrite:false }),
  );
  numberPlane.position.set(0, 2.14, .302);
  numberPlane.rotation.y = Math.PI;
  rig.add(numberPlane);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .2, 8), skinMat);
  neck.position.y = 2.75;
  rig.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(.29, 12, 9), skinMat);
  head.scale.set(.9, 1.08, .88);
  head.position.y = 3.04;
  rig.add(head);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(.055, .13, 6), skinMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 3.03, -.265);
  rig.add(nose);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 7, 0, Math.PI * 2, 0, Math.PI * .47), hairMat);
  hair.position.y = 3.11;
  rig.add(hair);

  const armL = makeArm(shirtMat, skinMat, gloveMat, -1);
  const armR = makeArm(shirtMat, skinMat, gloveMat, 1);
  armL.shoulder.position.set(-.56, 2.52, 0);
  armR.shoulder.position.set(.56, 2.52, 0);
  rig.add(armL.shoulder, armR.shoulder);

  const legL = makeLeg(skinMat, socksMat, bootMat, -1);
  const legR = makeLeg(skinMat, socksMat, bootMat, 1);
  legL.hip.position.y = 1.25;
  legR.hip.position.y = 1.25;
  rig.add(legL.hip, legR.hip);

  const shadow = makeContactShadow();
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .015;
  root.add(shadow);

  root.userData = {
    rig, torso, shoulders, head,
    armL, armR, legL, legR,
    gloveL:armL.glove, gloveR:armR.glove,
    shadow, numberTexture:backNumberTex,
  };
  return root;
}

function setKeeper(model, keeper) {
  model.userData.gloveL.visible = keeper;
  model.userData.gloveR.visible = keeper;
}

function lineBox(scene, x, z, w, d, opacity = .72) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, .025, d),
    new THREE.MeshBasicMaterial({ color:'#e6f5f0', transparent:true, opacity }),
  );
  mesh.position.set(x, .024, z);
  scene.add(mesh);
  return mesh;
}

function createPitch(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD_W, FIELD_L),
    new THREE.MeshStandardMaterial({ color:'#123a27', roughness:.92, metalness:0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const stripeDepth = FIELD_L / 12;
  for (let i = 0; i < 12; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_W, stripeDepth + .03),
      new THREE.MeshBasicMaterial({
        color:i % 2 ? '#0d3020' : '#1a4930',
        transparent:true,
        opacity:.34,
        depthWrite:false,
      }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, .006, -FIELD_HALF_L + stripeDepth / 2 + i * stripeDepth);
    scene.add(stripe);
  }

  const sideX = FIELD_HALF_W - .58;
  const topZ = FIELD_HALF_L - .55;
  lineBox(scene, 0, -topZ, FIELD_W - 1.15, .06);
  lineBox(scene, 0, topZ, FIELD_W - 1.15, .06);
  lineBox(scene, -sideX, 0, .06, FIELD_L - 1.1);
  lineBox(scene, sideX, 0, .06, FIELD_L - 1.1);
  lineBox(scene, 0, 0, FIELD_W - 1.15, .045, .5);

  const boxW = 14.1;
  const boxDepth = 8.3;
  const boxFrontZ = GOAL_Z + boxDepth;
  lineBox(scene, -boxW / 2, GOAL_Z + boxDepth / 2, .05, boxDepth);
  lineBox(scene, boxW / 2, GOAL_Z + boxDepth / 2, .05, boxDepth);
  lineBox(scene, 0, boxFrontZ, boxW, .05);

  const sixW = 7.7;
  const sixDepth = 3.7;
  lineBox(scene, -sixW / 2, GOAL_Z + sixDepth / 2, .05, sixDepth);
  lineBox(scene, sixW / 2, GOAL_Z + sixDepth / 2, .05, sixDepth);
  lineBox(scene, 0, GOAL_Z + sixDepth, sixW, .05);

  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(.1, 16),
    new THREE.MeshBasicMaterial({ color:'#edf6f2' }),
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, .03, GOAL_Z + 8.8);
  scene.add(spot);

  const center = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 2.11, 48),
    new THREE.MeshBasicMaterial({ color:'#e6f5f0', transparent:true, opacity:.45, side:THREE.DoubleSide }),
  );
  center.rotation.x = -Math.PI / 2;
  center.position.y = .025;
  scene.add(center);

  const depthGuides = new THREE.Group();
  const guideMat = new THREE.MeshBasicMaterial({ color:'#57c9eb', transparent:true, opacity:.055, depthWrite:false });
  for (let i = 1; i <= 5; i += 1) {
    const guide = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W - 1.4, .025), guideMat);
    guide.rotation.x = -Math.PI / 2;
    guide.position.set(0, .014, GOAL_Z + i * 4.2);
    depthGuides.add(guide);
  }
  scene.add(depthGuides);
}

function createGoal(scene) {
  const group = new THREE.Group();
  const frameMat = makeMaterial('#ecf8fb', .32, .12, '#7bd8f2', .12);
  const postGeo = new THREE.CylinderGeometry(.072, .072, GOAL_H, 10);
  const left = new THREE.Mesh(postGeo, frameMat);
  const right = left.clone();
  left.position.set(-GOAL_W / 2, GOAL_H / 2, GOAL_Z);
  right.position.set(GOAL_W / 2, GOAL_H / 2, GOAL_Z);
  group.add(left, right);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.072, .072, GOAL_W, 10), frameMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, GOAL_H, GOAL_Z);
  group.add(bar);

  const backZ = GOAL_Z - 1.8;
  const netPoints = [];
  for (let i = 0; i <= 14; i += 1) {
    const x = mix(-GOAL_W / 2, GOAL_W / 2, i / 14);
    netPoints.push(x, 0, backZ, x, GOAL_H, backZ);
    netPoints.push(x, GOAL_H, backZ, x, GOAL_H, GOAL_Z);
  }
  for (let i = 0; i <= 8; i += 1) {
    const y = mix(0, GOAL_H, i / 8);
    netPoints.push(-GOAL_W / 2, y, backZ, GOAL_W / 2, y, backZ);
    netPoints.push(-GOAL_W / 2, y, GOAL_Z, -GOAL_W / 2, y, backZ);
    netPoints.push(GOAL_W / 2, y, GOAL_Z, GOAL_W / 2, y, backZ);
  }

  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPoints, 3));
  const netMat = new THREE.LineBasicMaterial({ color:'#9bdbea', transparent:true, opacity:.2 });
  const net = new THREE.LineSegments(netGeo, netMat);
  group.add(net);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(GOAL_W - .2, GOAL_H - .12),
    new THREE.MeshBasicMaterial({ color:'#e8c96f', transparent:true, opacity:0, depthWrite:false }),
  );
  flash.position.set(0, GOAL_H / 2, GOAL_Z - 1.72);
  group.add(flash);

  group.userData = { net, netMat, frameMat, flash, left, right, bar };
  scene.add(group);
  return group;
}

function createStadium(scene) {
  const standMat = makeMaterial('#071012', .78, .08, '#0c2a34', .07);
  const standL = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.4, FIELD_L + 3), standMat);
  const standR = standL.clone();
  standL.position.set(-14.1, 3, 0);
  standR.position.set(14.1, 3, 0);
  scene.add(standL, standR);

  const endStand = new THREE.Mesh(new THREE.BoxGeometry(FIELD_W + 7, 7.2, 3.8), standMat);
  endStand.position.set(0, 3.4, GOAL_Z - 6.5);
  scene.add(endStand);

  const ledGeo = new THREE.BoxGeometry(.18, .62, 3.4);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 10; i += 1) {
      const gold = i % 2 === 0;
      const led = new THREE.Mesh(
        ledGeo,
        makeMaterial(gold ? '#3f3214' : '#0d3542', .45, .22, gold ? '#d9b55f' : '#54c8ef', .58),
      );
      led.position.set(side * 10.65, .42, -18 + i * 4.05);
      scene.add(led);
    }
  }

  const rand = seeded(31818);
  const positions = [];
  for (let i = 0; i < 560; i += 1) {
    const side = i % 2 ? -1 : 1;
    positions.push(
      side * (11.5 + rand() * 4.1),
      2.1 + rand() * 5.2,
      -21 + rand() * 42,
    );
  }
  for (let i = 0; i < 120; i += 1) {
    positions.push(
      -11 + rand() * 22,
      2.3 + rand() * 4,
      GOAL_Z - 5.3 - rand() * 2.1,
    );
  }
  const crowdGeo = new THREE.BufferGeometry();
  crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const crowd = new THREE.Points(
    crowdGeo,
    new THREE.PointsMaterial({ color:'#b4c9cb', size:.07, transparent:true, opacity:.48 }),
  );
  scene.add(crowd);

  const tunnel = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 2.8, 1.6),
    makeMaterial('#030506', .9, 0, '#1f667d', .05),
  );
  tunnel.position.set(0, 1.35, FIELD_HALF_L + 1.2);
  scene.add(tunnel);
}

function createBallTrail(scene) {
  const count = 18;
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color:'#f2d884', transparent:true, opacity:0 });
  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  scene.add(line);
  return { line, geo, mat, positions, history:[] };
}

function updateBallTrail(trail, position, shooting) {
  if (!shooting) {
    trail.history.length = 0;
    trail.mat.opacity = mix(trail.mat.opacity, 0, .28);
    return;
  }
  trail.history.unshift(position.clone());
  if (trail.history.length > trail.positions.length / 3) trail.history.length = trail.positions.length / 3;
  const last = trail.history.at(-1) || position;
  for (let i = 0; i < trail.positions.length / 3; i += 1) {
    const p = trail.history[i] || last;
    trail.positions[i * 3] = p.x;
    trail.positions[i * 3 + 1] = p.y;
    trail.positions[i * 3 + 2] = p.z;
  }
  trail.geo.attributes.position.needsUpdate = true;
  trail.mat.opacity = mix(trail.mat.opacity, .62, .3);
}

function createImpactFx(scene) {
  const count = 46;
  const positions = new Float32Array(count * 3);
  const velocities = Array.from({ length:count }, () => new THREE.Vector3());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color:'#e7c66e',
    size:.11,
    transparent:true,
    opacity:0,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  return { points, geo, mat, positions, velocities, active:false, age:0, kind:'goal' };
}

function triggerImpactFx(fx, kind, origin, direction = 1) {
  const rand = seeded((Date.now() & 0xffff) + (kind === 'goal' ? 7 : kind === 'save' ? 17 : 29));
  fx.active = true;
  fx.age = 0;
  fx.kind = kind;
  fx.mat.color.set(kind === 'goal' ? '#e7c66e' : kind === 'save' ? '#65d6f2' : '#f1f4f4');
  fx.mat.opacity = kind === 'goal' ? .95 : .78;
  for (let i = 0; i < fx.velocities.length; i += 1) {
    fx.positions[i * 3] = origin.x;
    fx.positions[i * 3 + 1] = origin.y;
    fx.positions[i * 3 + 2] = origin.z;
    const spread = (rand() - .5) * (kind === 'goal' ? 4.6 : 2.6);
    fx.velocities[i].set(
      spread + direction * rand() * .9,
      .7 + rand() * (kind === 'goal' ? 3.4 : 1.9),
      (rand() - .5) * 3.1,
    );
  }
  fx.geo.attributes.position.needsUpdate = true;
}

function updateImpactFx(fx, dt) {
  if (!fx.active) return;
  fx.age += dt;
  const fade = clamp(1 - fx.age / (fx.kind === 'goal' ? 1.35 : .8), 0, 1);
  fx.mat.opacity = fade * (fx.kind === 'goal' ? .9 : .7);
  for (let i = 0; i < fx.velocities.length; i += 1) {
    const v = fx.velocities[i];
    v.y -= 4.2 * dt;
    fx.positions[i * 3] += v.x * dt;
    fx.positions[i * 3 + 1] += v.y * dt;
    fx.positions[i * 3 + 2] += v.z * dt;
  }
  fx.geo.attributes.position.needsUpdate = true;
  if (fade <= 0) fx.active = false;
}

function attackerPosition(state) {
  const p = state?.positions?.attacker || {};
  return new THREE.Vector3(
    clamp(p.y, -.95, .95) * LATERAL,
    0,
    mix(START_Z, ATTACK_END_Z, clamp(p.x, 0, 1)),
  );
}

function keeperPosition(state) {
  return new THREE.Vector3(clamp(state?.positions?.keeper?.y, -.95, .95) * (GOAL_W / 2), 0, KEEPER_Z);
}

function clampAttackerWorld(position) {
  position.x = clamp(position.x, -LATERAL, LATERAL);
  position.z = clamp(position.z, ATTACK_END_Z, START_Z);
  return position;
}

function dispose(root) {
  root.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose?.());
    else obj.material?.dispose?.();
    if (obj.userData?.numberTexture) obj.userData.numberTexture.dispose?.();
  });
}

function posePlayer(model, { speed = 0, keeper = false, time = 0, action = null, eventT = 0, direction = 0 }) {
  const { rig, torso, armL, armR, legL, legR, shadow } = model.userData;
  setKeeper(model, keeper);

  const stride = Math.sin(time * (7.6 + speed * 8.8)) * Math.min(.72, speed * 1.22);
  const bend = Math.abs(stride) * .32;

  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  torso.rotation.set(0, 0, 0);

  legL.hip.rotation.set(stride, 0, 0);
  legR.hip.rotation.set(-stride, 0, 0);
  legL.shinPivot.rotation.set(Math.max(0, -stride) * .62 + bend, 0, 0);
  legR.shinPivot.rotation.set(Math.max(0, stride) * .62 + bend, 0, 0);

  armL.shoulder.rotation.set(-stride * .55, 0, -.12);
  armR.shoulder.rotation.set(stride * .55, 0, .12);
  armL.elbow.rotation.set(-.08 - Math.max(0, stride) * .24, 0, 0);
  armR.elbow.rotation.set(-.08 - Math.max(0, -stride) * .24, 0, 0);

  shadow.material.opacity = .72 - Math.min(.25, speed * .16);
  shadow.scale.set(1 + speed * .08, 1 + speed * .04, 1);

  if (keeper) {
    rig.position.y = -.06;
    torso.rotation.x = -.1;
    legL.hip.rotation.x = .15;
    legR.hip.rotation.x = .15;
    legL.hip.rotation.z = -.12;
    legR.hip.rotation.z = .12;
    armL.shoulder.rotation.z = -1.05;
    armR.shoulder.rotation.z = 1.05;
    armL.elbow.rotation.x = -.24;
    armR.elbow.rotation.x = -.24;
  }

  if (action === 'accelerate') {
    torso.rotation.x = -.18;
    rig.position.y = Math.abs(Math.sin(time * 15)) * .035;
  }

  if (action === 'feint' || action === 'cut') {
    const wave = Math.sin(eventT * Math.PI);
    torso.rotation.z = wave * .22 * (direction || 1);
    rig.rotation.y = wave * .34 * (direction || 1);
    legL.hip.rotation.z = -wave * .12;
    legR.hip.rotation.z = wave * .12;
  }

  if (action === 'shot') {
    const wind = clamp(eventT * 2.1, 0, 1);
    const strike = Math.sin(clamp(eventT * 1.18, 0, 1) * Math.PI);
    torso.rotation.x = -.16;
    torso.rotation.y = -.14 * (direction || 1);
    legR.hip.rotation.x = -.72 * wind + 1.35 * strike;
    legR.shinPivot.rotation.x = -.68 * strike;
    legL.hip.rotation.x = .22;
    armL.shoulder.rotation.z = -.72;
    armR.shoulder.rotation.z = .68;
  }

  if (action === 'keeper-preview') {
    const preview = clamp(eventT, 0, 1);
    rig.rotation.z = -direction * preview * .18;
    rig.position.x = direction * preview * .16;
    armL.shoulder.rotation.z = -1.12 - preview * .22;
    armR.shoulder.rotation.z = 1.12 + preview * .22;
    legL.hip.rotation.z = -.12 - preview * .05;
    legR.hip.rotation.z = .12 + preview * .05;
  }

  if (action === 'dive') {
    const dive = Math.sin(clamp(eventT, 0, 1) * Math.PI / 2);
    rig.rotation.z = -direction * dive * 1.12;
    rig.position.x = direction * dive * .72;
    rig.position.y = .18 + dive * .58;
    armL.shoulder.rotation.z = -1.55;
    armR.shoulder.rotation.z = 1.55;
    armL.elbow.rotation.x = 0;
    armR.elbow.rotation.x = 0;
    legL.hip.rotation.x = .38;
    legR.hip.rotation.x = -.28;
    shadow.scale.set(1.5, .75, 1);
    shadow.material.opacity = .42;
  }

  if (action === 'celebrate') {
    const jump = Math.sin(clamp(eventT, 0, 1) * Math.PI);
    rig.position.y = jump * .48;
    armL.shoulder.rotation.z = -2.45;
    armR.shoulder.rotation.z = 2.45;
    torso.rotation.y = Math.sin(eventT * Math.PI * 2) * .28;
  }
}

function makeCameraState() {
  return {
    mode:'attack',
    shake:0,
    shakeSeed:0,
    goalHold:0,
  };
}

function keeperGoalFramingDistance(aspect, verticalFov = 59) {
  const vfov = THREE.MathUtils.degToRad(verticalFov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(.35, aspect || 1));
  const horizontal = (GOAL_W / 2 + .62) / Math.tan(hfov / 2);
  const vertical = (GOAL_H / 2 + .72) / Math.tan(vfov / 2);
  return Math.max(5.35, horizontal, vertical) + .7;
}

export default function PenaltyRushArena3D({ room, profile, selfIndex, controlRef }) {
  const hostRef = useRef(null);
  const liveRef = useRef({ room, profile, selfIndex });
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    liveRef.current = { room, profile, selfIndex };
  }, [room, profile, selfIndex]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias:true,
        alpha:false,
        powerPreference:'high-performance',
        failIfMajorPerformanceCaveat:false,
      });
    } catch {
      setFallback(true);
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#061014');
    scene.fog = new THREE.Fog('#061014', 34, 62);

    const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
    camera.position.set(0, 5.1, 19);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    const ratioCap = mobile ? 1.22 : 1.5;
    let renderScale = Math.min(window.devicePixelRatio || 1, ratioCap);
    renderer.setPixelRatio(renderScale);

    renderer.domElement.className = 'penalty-arena3d-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#a5dfff', '#102316', 1.5));
    const key = new THREE.DirectionalLight('#fff0c4', 2.15);
    key.position.set(-8, 14, 9);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#55cffa', 1.15);
    rim.position.set(9, 8, -12);
    scene.add(rim);

    createPitch(scene);
    const goal = createGoal(scene);
    createStadium(scene);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(.23, 18, 14),
      new THREE.MeshStandardMaterial({ color:'#f4f3ed', roughness:.42, metalness:.03 }),
    );
    const ballWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.234, 1),
      new THREE.MeshBasicMaterial({ color:'#1b252b', wireframe:true, transparent:true, opacity:.5 }),
    );
    ball.add(ballWire);
    scene.add(ball);

    const trail = createBallTrail(scene);
    const impactFx = createImpactFx(scene);

    const playerAppearance = [0, 1].map((index) => {
      const snapshot = liveRef.current;
      const entry = snapshot.room?.players?.[index] || {};
      return appearanceFor(entry, snapshot.profile, index === snapshot.selfIndex);
    });
    const players = playerAppearance.map((appearance) => {
      const model = createHumanoid(appearance);
      scene.add(model);
      return model;
    });

    const livingLibrary = createLivingLibrary();
    const livingActors = playerAppearance.map((appearance, index) => {
      let actor;
      actor = createLivingActor(livingLibrary, {
        avatar:footballAvatar(appearance, index + appearance.number),
        scale:1.82,
        onLoad:() => {
          players[index].userData.rig.visible = false;
          actor.object.position.copy(players[index].position);
        },
        onError:() => {
          players[index].userData.rig.visible = true;
        },
      });
      scene.add(actor.object);
      return actor;
    });

    const initialState = liveRef.current.room?.state || {};
    const runtime = {
      disposed:false,
      last:performance.now(),
      lastRevision:null,
      event:null,
      playerTargets:[attackerPosition(initialState), keeperPosition(initialState)],
      speeds:[0, 0],
      ballTarget:new THREE.Vector3(),
      cameraTarget:new THREE.Vector3(),
      localAttack:attackerPosition(initialState),
      localReady:false,
      serverAttack:attackerPosition(initialState),
      serverKeeper:keeperPosition(initialState),
      camera:makeCameraState(),
      frameSamples:[],
      adaptiveClock:0,
    };

    function registerEvent(state, revision) {
      if (revision === runtime.lastRevision) return;
      runtime.lastRevision = revision;

      runtime.serverAttack.copy(attackerPosition(state));
      runtime.serverKeeper.copy(keeperPosition(state));
      if (!runtime.localReady) {
        runtime.localAttack.copy(runtime.serverAttack);
        runtime.localReady = true;
      }

      const event = state?.lastEvent;
      if (!event || event.type === 'move' || event.type === 'timeout' || event.type === 'kickoff') {
        if (event?.type === 'move') runtime.event = null;
        return;
      }

      runtime.event = {
        type:event.type,
        started:performance.now(),
        visual:event.visual || null,
        direction:Number(event?.visual?.direction || state?.keeperIntent?.direction || 0),
        triggered:false,
      };

      const attackerIndex = clamp(state?.attacker, 0, 1);
      const keeperIndex = clamp(state?.keeper, 0, 1);
      if (['goal','save','frame'].includes(event.type)) {
        livingActors[attackerIndex]?.action?.('Attack', .55);
        if (event.type === 'goal') livingActors[keeperIndex]?.action?.('Hit', .42);
        if (event.type === 'save') livingActors[keeperIndex]?.action?.('Cast', .58);
        try {
          if ('vibrate' in navigator) navigator.vibrate(event.type === 'goal' ? [18,26,42] : event.type === 'save' ? 22 : 14);
        } catch {}
      } else if (event.type === 'keeper' && event.visual?.type === 'dive') {
        livingActors[keeperIndex]?.action?.('Hit', .36);
      }
    }

    function shotBallPosition(event, now, fallbackStart) {
      const elapsed = (now - event.started) / 1000;
      const duration = event.type === 'goal' ? 1.16 : event.type === 'frame' ? .98 : .96;
      const t = clamp(elapsed / duration, 0, 1);
      const visual = event.visual || {};
      const startState = { positions:{ attacker:visual.attacker || liveRef.current.room?.state?.positions?.attacker } };
      const start = attackerPosition(startState).add(new THREE.Vector3(0, .26, -.55));
      if (!Number.isFinite(start.x)) start.copy(fallbackStart);

      const result = visual.result || {};
      const shot = visual.shot || {};
      const targetX = clamp(result.target ?? shot.targetX, -1, 1) * (GOAL_W / 2 - .16);
      const targetY = .28 + clamp(shot.targetY, .04, 1) * (GOAL_H - .38);
      const endZ = event.type === 'save' ? KEEPER_Z - .06 : GOAL_Z - .28;
      const end = new THREE.Vector3(targetX, targetY, endZ);
      const control = start.clone().lerp(end, .53);
      control.y += 1.18 + clamp(shot.power, 0, 1) * .92;

      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const cc = t * t;
      const out = new THREE.Vector3(
        a * start.x + b * control.x + cc * end.x,
        a * start.y + b * control.y + cc * end.y,
        a * start.z + b * control.z + cc * end.z,
      );

      if (event.type === 'save' && t > .72) {
        const bounce = (t - .72) / .28;
        out.y = mix(out.y, .22, bounce);
        out.z += bounce * 2.1;
        out.x += Math.sign(targetX || 1) * bounce * .75;
      } else if (event.type === 'frame' && t > .76) {
        const bounce = (t - .76) / .24;
        out.y = Math.max(.2, out.y - bounce * 1.15);
        out.x += Math.sign(targetX || 1) * bounce * 1.35;
        out.z += bounce * 1.2;
      }
      return { position:out, t, done:t >= 1, target:end };
    }

    function resize() {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    function updateAdaptiveResolution(dt) {
      runtime.frameSamples.push(dt);
      if (runtime.frameSamples.length > 45) runtime.frameSamples.shift();
      runtime.adaptiveClock += dt;
      if (runtime.adaptiveClock < 1.4 || runtime.frameSamples.length < 30) return;
      runtime.adaptiveClock = 0;

      const avg = runtime.frameSamples.reduce((sum, value) => sum + value, 0) / runtime.frameSamples.length;
      const target = 1 / 55;
      let next = renderScale;
      if (avg > target * 1.2) next = Math.max(.82, renderScale - .08);
      else if (avg < target * .78) next = Math.min(Math.min(window.devicePixelRatio || 1, ratioCap), renderScale + .05);
      if (Math.abs(next - renderScale) > .01) {
        renderScale = next;
        renderer.setPixelRatio(renderScale);
        resize();
      }
    }

    function predictLocalAttacker(state, dt, selfAttacker) {
      const server = runtime.serverAttack;
      if (!selfAttacker) return server;

      const input = controlRef?.current || null;
      const sprinting = Date.now() < Number(state?.sprintUntil || 0);
      if (input?.active) {
        const intensity = clamp(input.intensity, 0, 1);
        const lateralSpeed = 2.2 + intensity * .65;
        const forwardSpeed = (4.3 + intensity * 2.75) * (sprinting ? 1.28 : 1);
        runtime.localAttack.x += clamp(input.x, -1, 1) * lateralSpeed * dt;
        runtime.localAttack.z += clamp(input.y, -1, 1) * forwardSpeed * dt;
        clampAttackerWorld(runtime.localAttack);
      }

      const error = server.clone().sub(runtime.localAttack);
      const distance = error.length();
      if (distance > 2.2) runtime.localAttack.lerp(server, .48);
      else runtime.localAttack.addScaledVector(error, expFollow(input?.active ? 3.1 : 7.5, dt));

      return runtime.localAttack;
    }

    function setCamera(state, selfKeeper, serverAttack, serverKeeper, eventT, eventDirection, activeEvent, dt) {
      const progress = clamp(state?.positions?.attacker?.x, 0, 1);
      const desired = new THREE.Vector3();
      const target = new THREE.Vector3();
      let fov;

      if (selfKeeper) {
        runtime.camera.mode = 'keeper';
        fov = 59;
        const goalDistance = keeperGoalFramingDistance(camera.aspect, fov);
        desired.set(
          serverKeeper.x * .09,
          3.72,
          GOAL_Z - goalDistance,
        );
        target.set(
          serverAttack.x * .2,
          1.18,
          mix(-6.4, -10.2, progress),
        );
        goal.userData.netMat.opacity = mix(goal.userData.netMat.opacity, .105, .16);
      } else {
        runtime.camera.mode = 'attack';
        desired.set(
          serverAttack.x * .2,
          5.55 - progress * .62,
          19.7 - progress * 5.9,
        );
        target.set(
          serverAttack.x * .15,
          1.18,
          mix(-9.6, -12.8, progress),
        );
        fov = 48.5;
        goal.userData.netMat.opacity = mix(goal.userData.netMat.opacity, .21, .16);
      }

      if (activeEvent && ['goal', 'save', 'frame'].includes(activeEvent.type)) {
        const pulse = Math.sin(eventT * Math.PI);
        runtime.camera.shake = activeEvent.type === 'goal' ? .13 * pulse : .075 * pulse;
        desired.y -= pulse * (activeEvent.type === 'goal' ? .34 : .16);
        desired.z += selfKeeper ? pulse * .28 : -pulse * .36;
        fov -= activeEvent.type === 'goal' ? pulse * 4.4 : pulse * 2.2;
      } else {
        runtime.camera.shake *= .82;
      }

      if (runtime.camera.shake > .002) {
        const jitter = runtime.camera.shake;
        desired.x += Math.sin(performance.now() * .043) * jitter;
        desired.y += Math.cos(performance.now() * .051) * jitter * .55;
      }

      camera.position.lerp(desired, expFollow(selfKeeper ? 6.8 : 5.4, dt));
      runtime.cameraTarget.lerp(target, expFollow(selfKeeper ? 8.4 : 6.5, dt));
      camera.lookAt(runtime.cameraTarget);
      camera.fov = mix(camera.fov, fov, expFollow(5.5, dt));
      camera.updateProjectionMatrix();
    }

    function animate(now) {
      if (runtime.disposed) return;
      if (document.hidden) return;

      const dt = Math.min(.05, Math.max(.001, (now - runtime.last) / 1000));
      runtime.last = now;
      updateAdaptiveResolution(dt);

      const snapshot = liveRef.current;
      const state = snapshot.room?.state || {};
      registerEvent(state, snapshot.room?.revision);

      const attacker = clamp(state.attacker, 0, 1);
      const keeper = clamp(state.keeper, 0, 1);
      const selfAttacker = snapshot.selfIndex === attacker;
      const selfKeeper = snapshot.selfIndex === keeper;

      runtime.serverAttack.copy(attackerPosition(state));
      runtime.serverKeeper.copy(keeperPosition(state));

      const renderAttack = predictLocalAttacker(state, dt, selfAttacker);
      const keeperPreview = selfKeeper ? controlRef?.current?.keeper : null;
      const renderKeeper = runtime.serverKeeper.clone();
      if (keeperPreview?.active) {
        renderKeeper.x += clamp(keeperPreview.direction, -1, 1) * (.28 + clamp(keeperPreview.intensity, 0, 1) * .42);
        renderKeeper.x = clamp(renderKeeper.x, -GOAL_W / 2, GOAL_W / 2);
      }

      runtime.playerTargets[attacker].copy(renderAttack);
      runtime.playerTargets[keeper].lerp(renderKeeper, expFollow(selfKeeper ? 16 : 11, dt));

      players.forEach((model, index) => {
        const target = runtime.playerTargets[index];
        const before = model.position.clone();
        const follow = expFollow(index === snapshot.selfIndex ? 17 : 10, dt);
        model.position.x = mix(model.position.x, target.x, follow);
        model.position.z = mix(model.position.z, target.z, follow);

        const dx = model.position.x - before.x;
        const dz = model.position.z - before.z;
        const moved = Math.hypot(dx, dz);
        runtime.speeds[index] = mix(
          runtime.speeds[index],
          Math.min(1, moved / Math.max(.001, dt) / 6.3),
          expFollow(10, dt),
        );

        model.rotation.y = index === keeper ? Math.PI : 0;

        const actor = livingActors[index];
        if (actor?.ready) {
          actor.object.position.copy(model.position);
          const travelled = moved;
          actor.update(dt, dx, dz, travelled);
          if (index === keeper) {
            actor.face(
              runtime.playerTargets[attacker].x - actor.object.position.x,
              runtime.playerTargets[attacker].z - actor.object.position.z,
              dt,
            );
          }
        }
      });

      const activeEvent = runtime.event;
      let attackerAction = state?.lastEvent?.type;
      let keeperAction = null;
      let eventT = 0;
      let eventDirection = 0;
      const keeperPreview = selfKeeper ? controlRef?.current?.keeper : null;
      if (keeperPreview?.active && clamp(keeperPreview.intensity, 0, 1) > .35) {
        keeperAction = 'keeper-preview';
        eventDirection = clamp(keeperPreview.direction, -1, 1) || 1;
        eventT = clamp(keeperPreview.intensity, 0, 1);
      }

      const normalBall = renderAttack.clone();
      normalBall.y = .23;
      normalBall.z -= .62 + clamp(state.ballLead, 0, .75) * .78;
      normalBall.y += Math.abs(Math.sin(now * .014)) * runtime.speeds[attacker] * .075;
      runtime.ballTarget.copy(normalBall);

      let shooting = false;
      if (activeEvent) {
        const age = (now - activeEvent.started) / 1000;
        eventDirection = activeEvent.direction
          || Math.sign((state?.lastEvent?.visual?.result?.target || 0) - (state?.lastEvent?.visual?.result?.keeperCenter || 0))
          || 1;

        if (['goal', 'save', 'frame'].includes(activeEvent.type)) {
          shooting = true;
          const shot = shotBallPosition(activeEvent, now, normalBall);
          runtime.ballTarget.copy(shot.position);
          eventT = shot.t;
          attackerAction = shot.t < .52 ? 'shot' : activeEvent.type === 'goal' ? 'celebrate' : null;
          keeperAction = shot.t < .88 ? 'dive' : activeEvent.type === 'save' ? 'celebrate' : null;

          if (!activeEvent.triggered && shot.t > .69) {
            activeEvent.triggered = true;
            triggerImpactFx(impactFx, activeEvent.type, shot.position, eventDirection);
          }

          const netWave = activeEvent.type === 'goal' ? Math.sin(clamp((shot.t - .66) / .34, 0, 1) * Math.PI) : 0;
          goal.userData.net.position.z = -netWave * .34;
          goal.userData.flash.material.opacity = activeEvent.type === 'goal'
            ? Math.sin(clamp((shot.t - .63) / .37, 0, 1) * Math.PI) * .25
            : 0;
          goal.userData.frameMat.emissiveIntensity = activeEvent.type === 'frame'
            ? .12 + Math.sin(shot.t * Math.PI * 4) * .18
            : .12;

          if (shot.done) runtime.event = null;
        } else {
          eventT = clamp(age / .72, 0, 1);
          if (activeEvent.type === 'keeper') keeperAction = state?.keeperIntent?.type === 'dive' ? 'dive' : null;
          if (eventT >= 1) runtime.event = null;
        }
      } else {
        goal.userData.net.position.z = mix(goal.userData.net.position.z, 0, .18);
        goal.userData.flash.material.opacity = mix(goal.userData.flash.material.opacity, 0, .2);
        goal.userData.frameMat.emissiveIntensity = mix(goal.userData.frameMat.emissiveIntensity, .12, .15);
      }

      ball.position.lerp(runtime.ballTarget, shooting ? expFollow(22, dt) : expFollow(13, dt));
      ball.rotation.x += dt * (5 + runtime.speeds[attacker] * 10);
      ball.rotation.z += dt * 2.8;
      updateBallTrail(trail, ball.position, shooting);
      updateImpactFx(impactFx, dt);

      players.forEach((model, index) => {
        const roleKeeper = index === keeper;
        const action = index === attacker ? attackerAction : keeperAction;
        posePlayer(model, {
          speed:runtime.speeds[index],
          keeper:roleKeeper,
          time:now / 1000,
          action,
          eventT,
          direction:eventDirection || 1,
        });

        const actor = livingActors[index];
        if (actor?.ready) {
          actor.object.position.y = 0;
          actor.object.rotation.z *= .7;
          if (action === 'keeper-preview') {
            actor.object.rotation.z = -(eventDirection || 1) * clamp(eventT, 0, 1) * .12;
          } else if (action === 'dive') {
            const dive = Math.sin(clamp(eventT, 0, 1) * Math.PI / 2);
            actor.object.rotation.z = -(eventDirection || 1) * dive * .92;
            actor.object.position.x += (eventDirection || 1) * dive * .58;
            actor.object.position.y = dive * .38;
          } else if (action === 'celebrate') {
            actor.object.position.y = Math.sin(clamp(eventT, 0, 1) * Math.PI) * .24;
          }
        }
      });

      setCamera(
        state,
        selfKeeper,
        renderAttack,
        runtime.serverKeeper,
        eventT,
        eventDirection,
        activeEvent,
        dt,
      );

      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    const onContextLost = (event) => {
      event.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    return () => {
      runtime.disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      livingActors.forEach((actor) => actor?.dispose?.());
      livingLibrary.dispose();
      dispose(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [controlRef]);

  if (fallback) {
    return <div className="penalty-arena3d-fallback"><b>Mode graphique simplifié</b><span>WebGL n’est pas disponible sur cet appareil.</span></div>;
  }

  return <div ref={hostRef} className="penalty-arena3d" aria-label="Terrain 3D Penalty Rush" />;
}
