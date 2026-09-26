import React, { useEffect, useRef, useState } from 'react';
import * as THREE from './three-lite.js';
import { penaltySfx } from './audio.js';

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
const KEEPER_FORWARD_Z = GOAL_Z + 4.25;

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const mix = (a, b, t) => a + (b - a) * t;
const expFollow = (rate, dt) => 1 - Math.exp(-rate * dt);
const wrapAngle = (value) => Math.atan2(Math.sin(value), Math.cos(value));
const followAngle = (current, target, rate, dt) => current + wrapAngle(target - current) * expFollow(rate, dt);
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
  const visual = self ? profile?.appearance || {} : player?.appearance || {};
  const seed = Math.abs(String(player?.countryId || '').split('').reduce((n, c) => n + c.charCodeAt(0), 0));
  return {
    shirt: validHex(kit.shirtPrimary, fallback[0]),
    trim: validHex(kit.shirtSecondary || kit.trim, fallback[1]),
    shorts: validHex(kit.shorts, '#08090b'),
    socks: validHex(kit.socks, fallback[0]),
    boots: validHex(boots.upper, '#08090b'),
    skin: validHex(visual.skinColor, ['#ad7655','#c88d63','#8d5d45','#714735'][seed % 4]),
    hair: validHex(visual.hairHex, ['#111315','#2a1b13','#5c3825'][seed % 3]),
    hairStyle: String(visual.hairStyle || 'short'),
    faceShape: String(visual.faceShape || 'balanced'),
    facialHair: String(visual.facialHair || 'none'),
    build: String(visual.build || 'athletic'),
    heightCm: clamp(visual.heightCm || 178, 165, 198),
    dominantFoot: String(self ? profile?.dominantFoot : player?.dominantFoot || 'right'),
    number: clamp(self ? profile?.shirtNumber : player?.shirtNumber, 1, 99) || 10,
  };
}

function footballAvatar(appearance, seed = 0) {
  const hairIndex={shaved:0,buzz:0,short:1,fade:2,curls:3,long:3,afro:4,braids:4}[appearance.hairStyle] ?? seed % 5;
  const shape=appearance.build==='strong'?'solide':appearance.build==='slim'?'elance':'equilibre';
  const build=appearance.build==='strong'?1.05:appearance.build==='slim'?.96:1;
  const faceTuning={
    square:{face:.24,jaw:.38,nose:.04},round:{face:.3,jaw:-.18,nose:0},angular:{face:-.16,jaw:.32,nose:.08},
    long:{face:-.25,jaw:.04,nose:.1},oval:{face:-.08,jaw:-.08,nose:0},balanced:{face:0,jaw:0,nose:0},
  }[appearance.faceShape]||{face:0,jaw:0,nose:0};
  return {
    body:'homme',
    style:'voyageur',
    hair:hairIndex,
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
    shape,
    height:clamp((appearance.heightCm||178)/178,.93,1.08),
    build,
    shoulders:appearance.build==='strong'?.24:appearance.build==='slim'?.08:.16,
    chest:appearance.build==='strong'?.18:appearance.build==='slim'?.02:.09,
    waist:appearance.build==='slim'?-.16:-.06,
    hips:-.04,
    arms:appearance.build==='strong'?.16:.07,
    legs:appearance.build==='strong'?.13:.08,
    face:faceTuning.face,
    jaw:faceTuning.jaw,
    nose:faceTuning.nose,
    beard:appearance.facialHair==='beard'?.9:appearance.facialHair==='goatee'?.55:appearance.facialHair==='stubble'?.24:0,
    mustache:appearance.facialHair==='goatee'?.36:appearance.facialHair==='beard'?.45:0,
    hairLength:appearance.hairStyle==='long'?.95:appearance.hairStyle==='braids'?.82:appearance.hairStyle==='afro'?.68:.35,
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

function makeWorldPanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, '#06141d');
  gradient.addColorStop(.52, '#0b2632');
  gradient.addColorStop(1, '#120f0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = 'rgba(84,220,255,.24)';
  ctx.lineWidth = 2;
  for (let x = 60; x < 1024; x += 86) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 120, 512); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#49dfff';
  ctx.fillStyle = '#f3dda0';
  ctx.font = '900 190px Arial, sans-serif';
  ctx.fillText('3B', 512, 245);
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#e6c66d';
  ctx.fillStyle = '#76e8ff';
  ctx.font = '800 54px Arial, sans-serif';
  ctx.fillText('MONDE DU 3B · NEXUS', 512, 334);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(237,226,198,.82)';
  ctx.font = '700 29px Arial, sans-serif';
  ctx.fillText('8 PORTES · 8 VALEURS · UN MÊME HÉRITAGE', 512, 396);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeGateLabelTexture(code) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(4,13,18,.9)';
  ctx.fillRect(0, 0, 160, 80);
  ctx.strokeStyle = 'rgba(228,198,112,.62)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 152, 72);
  ctx.fillStyle = '#f1d78f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px Arial, sans-serif';
  ctx.fillText(code, 80, 40);
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

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.4, .48, 1.12, 12), shirtMat);
  const buildScale = appearance.build === 'strong' ? 1.1 : appearance.build === 'slim' ? .93 : 1;
  torso.scale.set(buildScale,1,.58*buildScale);
  torso.position.y = 2.1;
  rig.add(torso);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.02, .16, .45), shirtMat);
  shoulders.position.y = 2.54;
  rig.add(shoulders);
  for (const side of [-1, 1]) {
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(.19, 8, 6), shirtMat);
    shoulderCap.scale.set(1.08, .78, 1);
    shoulderCap.position.set(side * .49, 2.52, 0);
    rig.add(shoulderCap);
  }

  const collar = new THREE.Mesh(new THREE.TorusGeometry(.15, .025, 6, 16), trimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 2.69, -.015);
  rig.add(collar);

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
  const faceScale = {
    oval:[.88,1.12,.86], square:[.98,1.03,.93], round:[.98,1.02,.96],
    angular:[.91,1.08,.84], long:[.86,1.18,.84], balanced:[.9,1.08,.88],
  }[appearance.faceShape] || [.9,1.08,.88];
  head.scale.set(...faceScale);
  head.position.y = 3.04;
  rig.add(head);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(.052, .125, 6), skinMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 3.03, -.265);
  rig.add(nose);

  const eyeMat = makeMaterial('#151719', .76);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 5), eyeMat);
    eye.position.set(side * .09, 3.075, -.265);
    eye.scale.z = .55;
    rig.add(eye);
  }

  const hair = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 7, 0, Math.PI * 2, 0, Math.PI * .47), hairMat);
  hair.position.y = 3.11;
  const hairStyle = appearance.hairStyle || 'short';
  if (hairStyle === 'shaved') hair.scale.set(1,.18,1);
  if (hairStyle === 'buzz') hair.scale.set(1.01,.45,1.01);
  if (hairStyle === 'fade') hair.scale.set(.94,.72,.94);
  if (hairStyle === 'curls') hair.scale.set(1.08,1.02,1.08);
  if (hairStyle === 'afro') hair.scale.set(1.34,1.38,1.34);
  if (hairStyle === 'long') hair.scale.set(1.04,1.18,1.08);
  rig.add(hair);
  if (hairStyle === 'braids' || hairStyle === 'long') {
    const strands = hairStyle === 'braids' ? 6 : 4;
    for (let i = 0; i < strands; i += 1) {
      const side = i % 2 ? -1 : 1;
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(.028,.042,hairStyle === 'braids' ? .55 : .72,6),hairMat);
      strand.position.set(side*(.13+(i%3)*.055),2.83,-.12+(i%3)*.06);
      strand.rotation.z=side*.08;
      rig.add(strand);
    }
  }
  if (appearance.facialHair && appearance.facialHair !== 'none') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(.2,8,6,0,Math.PI*2,Math.PI*.48,Math.PI*.42),hairMat);
    beard.scale.set(appearance.facialHair === 'beard' ? 1.08 : .72, appearance.facialHair === 'stubble' ? .42 : .72, .82);
    beard.position.set(0,2.94,-.19);
    rig.add(beard);
  }

  const armL = makeArm(shirtMat, skinMat, gloveMat, -1);
  const armR = makeArm(shirtMat, skinMat, gloveMat, 1);
  armL.shoulder.position.set(-.56, 2.52, 0);
  armR.shoulder.position.set(.56, 2.52, 0);
  rig.add(armL.shoulder, armR.shoulder);

  const legL = makeLeg(skinMat, socksMat, bootMat, -1);
  const legR = makeLeg(skinMat, socksMat, bootMat, 1);
  for (const side of [-1, 1]) {
    const shortCuff = new THREE.Mesh(new THREE.CylinderGeometry(.18, .16, .3, 10), shortsMat);
    shortCuff.position.set(side * .23, 1.19, 0);
    rig.add(shortCuff);
  }
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
  root.scale.setScalar(.56);
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
    new THREE.MeshStandardMaterial({ color:'#1d6842', roughness:.88, metalness:0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stripeDepth = FIELD_L / 12;
  for (let i = 0; i < 12; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_W, stripeDepth + .03),
      new THREE.MeshBasicMaterial({
        color:i % 2 ? '#19593a' : '#27764b',
        transparent:true,
        opacity:.42,
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

  const keeperApron = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD_W + 4, 10),
    new THREE.MeshStandardMaterial({ color:'#19583a', roughness:.92, metalness:0 }),
  );
  keeperApron.rotation.x = -Math.PI / 2;
  keeperApron.position.set(0, -.002, GOAL_Z - 5);
  scene.add(keeperApron);
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

function createStadium(scene, mobile = false) {
  const concrete = makeMaterial('#18252a', .82, .1, '#17333d', .08);
  const seatDark = makeMaterial('#123441', .74, .05, '#1a5364', .12);
  const seatGold = makeMaterial('#5b4821', .68, .12, '#e0bf68', .28);
  const fascia = makeMaterial('#102229', .5, .24, '#52cce9', .24);
  const roofMat = makeMaterial('#1a2428', .48, .42, '#33464c', .1);

  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 4; tier += 1) {
      const width = 3.2 + tier * .72;
      const height = 1.18;
      const depth = FIELD_L + 1.8 - tier * .7;
      const stand = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), concrete);
      stand.position.set(side * (12.25 + tier * .72), .58 + tier * 1.02, -.15);
      scene.add(stand);

      const seats = new THREE.Mesh(
        new THREE.BoxGeometry(.24, .22, depth - .7),
        tier % 2 ? seatGold : seatDark,
      );
      seats.position.set(side * (10.72 + tier * .84), 1.08 + tier * 1.02, -.15);
      scene.add(seats);
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.1, .22, FIELD_L + 4.2), roofMat);
    roof.position.set(side * 14.25, 5.95, -.2);
    roof.rotation.z = side * -.055;
    scene.add(roof);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(.12, .78, FIELD_L - 2.2), fascia);
    rail.position.set(side * 10.55, .54, .15);
    scene.add(rail);
  }

  const ledGeo = new THREE.BoxGeometry(.14, .7, 3.45);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 11; i += 1) {
      const gold = i % 3 === 0;
      const led = new THREE.Mesh(
        ledGeo,
        makeMaterial(gold ? '#55451e' : '#164a59', .38, .24, gold ? '#efca6e' : '#65d9f2', .82),
      );
      led.position.set(side * 10.45, .46, -19.4 + i * 3.88);
      scene.add(led);
    }
  }

  const rand = seeded(31818);
  const positions = [];
  const crowdCount = mobile ? 520 : 980;
  for (let i = 0; i < crowdCount; i += 1) {
    const side = i % 2 ? -1 : 1;
    const tier = Math.floor(rand() * 4);
    positions.push(
      side * (10.9 + tier * 1.08 + rand() * .82),
      1.45 + tier * 1.02 + rand() * .72,
      -21.2 + rand() * 42.4,
    );
  }
  const crowdGeo = new THREE.BufferGeometry();
  crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.Points(
    crowdGeo,
    new THREE.PointsMaterial({ color:'#d7e8e8', size:.075, transparent:true, opacity:.66 }),
  ));

  for (const side of [-1, 1]) {
    for (const z of (mobile ? [-16] : [-16, 15])) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.11, .17, 10.5, 8), roofMat);
      mast.position.set(side * 15.2, 5.2, z);
      scene.add(mast);
      const lamp = new THREE.PointLight('#eaf7ff', 1.6, 31, 2);
      lamp.position.set(side * 14.6, 9.7, z);
      scene.add(lamp);
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, .46, .24),
        makeMaterial('#d7e8ea', .28, .35, '#eefcff', .62),
      );
      bank.position.copy(lamp.position);
      bank.rotation.y = side > 0 ? -.28 : .28;
      scene.add(bank);
    }
  }

  const tunnel = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 2.9, 1.8),
    makeMaterial('#101a1e', .76, .06, '#4ebcd7', .14),
  );
  tunnel.position.set(0, 1.42, FIELD_HALF_L + 1.28);
  scene.add(tunnel);
}

function createPremiumMatchDecor(scene, mobile = false) {
  const cyan = makeMaterial('#173b46', .42, .28, '#59d6ef', .58);
  const gold = makeMaterial('#48391a', .4, .32, '#e5c56c', .52);
  const dark = makeMaterial('#0a1519', .82, .08, '#18343b', .12);
  const boardGeo = new THREE.BoxGeometry(2.25, .34, .1);
  const posts = mobile ? 5 : 8;
  for (const side of [-1, 1]) {
    for (let i = 0; i < posts; i += 1) {
      const z = -16.6 + i * (33.2 / Math.max(1, posts - 1));
      const board = new THREE.Mesh(boardGeo, i % 3 === 0 ? gold : cyan);
      board.position.set(side * 10.18, .38, z);
      board.rotation.y = Math.PI / 2;
      scene.add(board);
    }
  }
  for (const side of [-1, 1]) {
    const arch = new THREE.Group();
    const upright = new THREE.BoxGeometry(.13, 3.5, .13);
    const left = new THREE.Mesh(upright, dark);
    const right = left.clone();
    left.position.set(-1.65, 1.75, 0);
    right.position.set(1.65, 1.75, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.42, .13, .13), side < 0 ? cyan : gold);
    top.position.y = 3.45;
    arch.add(left, right, top);
    arch.position.set(side * 7.4, 0, FIELD_HALF_L + .72);
    arch.rotation.y = side * .04;
    scene.add(arch);
  }
  if (!mobile) {
    for (const side of [-1, 1]) {
      const glow = new THREE.PointLight(side < 0 ? '#55d7f2' : '#e6c66d', .78, 9, 2);
      glow.position.set(side * 8.7, 2.15, 8);
      scene.add(glow);
    }
  }
}

function createThreeBGoalWorld(scene, mobile = false) {
  const root = new THREE.Group();
  root.name = '3B_WORLD_BEHIND_GOAL';
  const cyan = makeMaterial('#153d49', .38, .3, '#58d9f4', .78);
  const gold = makeMaterial('#493b1c', .34, .42, '#e4c267', .7);
  const dark = makeMaterial('#071014', .72, .18, '#163442', .16);

  const skyline = new THREE.Group();
  const rand = seeded(3181818);
  const towerCount = mobile ? 10 : 16;
  for (let i = 0; i < towerCount; i += 1) {
    const side = i < towerCount / 2 ? -1 : 1;
    const lane = i % Math.ceil(towerCount / 2);
    const x = side * (5.3 + lane * 1.35 + rand() * .45);
    const height = 3.8 + rand() * 6.3;
    const width = .75 + rand() * .9;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.2 + rand() * .7), dark.clone());
    tower.position.set(x, height / 2 - .15, GOAL_Z - 7.8 - rand() * 2.8);
    tower.material.emissiveIntensity = .08 + rand() * .2;
    skyline.add(tower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(width * .72, .08, 1.28), i % 3 === 0 ? gold : cyan);
    crown.position.set(x, height + .02, tower.position.z);
    skyline.add(crown);
  }
  root.add(skyline);

  const ringBack = new THREE.Mesh(
    new THREE.TorusGeometry(5.15, .055, 7, mobile ? 54 : 96),
    makeMaterial('#143a48', .24, .46, '#4edaf5', .95),
  );
  ringBack.position.set(0, 4.55, GOAL_Z - 7.05);
  root.add(ringBack);

  const ringGold = new THREE.Mesh(
    new THREE.TorusGeometry(4.35, .035, 6, mobile ? 48 : 84),
    makeMaterial('#3f3216', .2, .5, '#e6c66e', .88),
  );
  ringGold.position.set(0, 4.55, GOAL_Z - 6.98);
  root.add(ringGold);

  const panelTexture = makeWorldPanelTexture();
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 3.4),
    new THREE.MeshBasicMaterial({ map:panelTexture, transparent:true, opacity:.94, depthWrite:false }),
  );
  panel.position.set(0, 5.0, GOAL_Z - 7.32);
  panel.userData.numberTexture = panelTexture;
  root.add(panel);

  const gateCodes = ['EE','TR','TN','IT','FR','DZ','ES','MA'];
  const gateGroup = new THREE.Group();
  const gateSpacing = 2.75;
  gateCodes.forEach((code, index) => {
    const x = (index - 3.5) * gateSpacing;
    const z = GOAL_Z - 5.35 - Math.abs(index - 3.5) * .5;
    const material = index % 2 ? cyan : gold;
    const gate = new THREE.Group();

    const postGeo = new THREE.BoxGeometry(.12, 2.15, .18);
    const left = new THREE.Mesh(postGeo, material);
    const right = left.clone();
    left.position.set(-.62, 1.08, 0);
    right.position.set(.62, 1.08, 0);
    gate.add(left, right);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.36, .12, .18), material);
    top.position.set(0, 2.08, 0);
    gate.add(top);

    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.14, 1.82),
      new THREE.MeshBasicMaterial({ color:index % 2 ? '#46d8f3' : '#e3bf62', transparent:true, opacity:.055, side:THREE.DoubleSide, depthWrite:false }),
    );
    inner.position.set(0, 1.05, -.02);
    gate.add(inner);

    const labelTexture = makeGateLabelTexture(code);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(.78, .39),
      new THREE.MeshBasicMaterial({ map:labelTexture, transparent:true, depthWrite:false }),
    );
    label.position.set(0, 1.68, .11);
    label.userData.numberTexture = labelTexture;
    gate.add(label);

    gate.position.set(x, 0, z);
    gate.rotation.y = -x * .018;
    gateGroup.add(gate);
  });
  root.add(gateGroup);

  const pylons = [];
  for (const side of [-1, 1]) {
    for (let level = 0; level < 3; level += 1) {
      const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(.08, .13, 3.3 + level * 1.15, 6),
        level % 2 ? gold : cyan,
      );
      pylon.position.set(side * (4.9 + level * 2.6), 1.8 + level * .55, GOAL_Z - 5.7 - level);
      root.add(pylon);
      pylons.push(pylon);
    }
  }

  const dustCount = mobile ? 45 : 90;
  const dustPositions = [];
  for (let i = 0; i < dustCount; i += 1) {
    dustPositions.push(
      -12 + rand() * 24,
      1.2 + rand() * 9,
      GOAL_Z - 5.2 - rand() * 7.5,
    );
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color:'#79ddf4', size:.045, transparent:true, opacity:.42, depthWrite:false }),
  );
  root.add(dust);

  const worldLight = new THREE.PointLight('#5bdcf5', mobile ? 1.3 : 2.0, 17, 2);
  worldLight.position.set(0, 5.1, GOAL_Z - 5.8);
  root.add(worldLight);

  root.userData = { ringBack, ringGold, panel, worldLight, pylons };
  scene.add(root);
  return root;
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
  return { line, geo, mat, positions, history:Array.from({ length:count }, () => new THREE.Vector3()), historyCount:0 };
}

function updateBallTrail(trail, position, shooting) {
  if (!shooting) {
    trail.historyCount = 0;
    trail.mat.opacity = mix(trail.mat.opacity, 0, .28);
    return;
  }
  const count = trail.history.length;
  const active = Math.min(count, trail.historyCount + 1);
  for (let i = active - 1; i > 0; i -= 1) trail.history[i].copy(trail.history[i - 1]);
  trail.history[0].copy(position);
  trail.historyCount = active;
  const last = trail.history[Math.max(0, active - 1)] || position;
  for (let i = 0; i < count; i += 1) {
    const p = i < active ? trail.history[i] : last;
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

function attackerPosition(state, target = new THREE.Vector3()) {
  const p = state?.positions?.attacker || {};
  return target.set(
    clamp(p.y, -.95, .95) * LATERAL,
    0,
    mix(START_Z, ATTACK_END_Z, clamp(p.x, 0, 1)),
  );
}

function keeperPosition(state, target = new THREE.Vector3()) {
  const keeper = state?.positions?.keeper || {};
  return target.set(
    clamp(keeper.y, -.95, .95) * (GOAL_W / 2),
    0,
    mix(KEEPER_Z, KEEPER_FORWARD_Z, clamp(keeper.x, 0, .82) / .82),
  );
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
    obj.material?.map?.dispose?.();
  });
}

function posePlayer(model, { speed = 0, keeper = false, time = 0, action = null, eventT = 0, direction = 0, lean = 0, sprint = false }) {
  const { rig, torso, armL, armR, legL, legR, shadow } = model.userData;
  setKeeper(model, keeper);

  const stride = Math.sin(time * (7.6 + speed * 8.8)) * Math.min(.72, speed * 1.22);
  const bend = Math.abs(stride) * .32;

  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  torso.rotation.set(sprint ? -.08 : 0, 0, -lean * .085);

  legL.hip.rotation.set(stride, 0, 0);
  legR.hip.rotation.set(-stride, 0, 0);
  legL.shinPivot.rotation.set(Math.max(0, -stride) * .62 + bend, 0, 0);
  legR.shinPivot.rotation.set(Math.max(0, stride) * .62 + bend, 0, 0);

  armL.shoulder.rotation.set(-stride * (sprint ? .68 : .55), 0, -.12 - lean * .04);
  armR.shoulder.rotation.set(stride * (sprint ? .68 : .55), 0, .12 - lean * .04);
  armL.elbow.rotation.set(-.08 - Math.max(0, stride) * .24, 0, 0);
  armR.elbow.rotation.set(-.08 - Math.max(0, -stride) * .24, 0, 0);

  shadow.material.opacity = .72 - Math.min(.25, speed * .16);
  shadow.scale.set(1 + speed * .08, 1 + speed * .04, 1);

  if (keeper) {
    const keeperStep = Math.sin(time * (8.4 + speed * 9.2)) * Math.min(.36, speed * .64);
    rig.position.y = -.06 + Math.abs(keeperStep) * .018;
    torso.rotation.x = -.1;
    torso.rotation.z = -lean * .11;
    legL.hip.rotation.x = .13 + keeperStep;
    legR.hip.rotation.x = .13 - keeperStep;
    legL.hip.rotation.z = -.12;
    legR.hip.rotation.z = .12;
    legL.shinPivot.rotation.x = Math.max(0, -keeperStep) * .38;
    legR.shinPivot.rotation.x = Math.max(0, keeperStep) * .38;
    armL.shoulder.rotation.z = -1.05 - keeperStep * .12;
    armR.shoulder.rotation.z = 1.05 - keeperStep * .12;
    armL.elbow.rotation.x = -.24;
    armR.elbow.rotation.x = -.24;
  }

  if (action === 'accelerate') {
    torso.rotation.x = -.18;
    rig.position.y = Math.abs(Math.sin(time * 15)) * .035;
  }

  if (action === 'feint' || action === 'cut') {
    const wave = Math.sin(eventT * Math.PI);
    const snap = action === 'cut' ? 1.18 : .9;
    torso.rotation.z = wave * .22 * snap * (direction || 1);
    rig.rotation.y = wave * .34 * snap * (direction || 1);
    rig.position.x = wave * .08 * snap * (direction || 1);
    legL.hip.rotation.z = -wave * .14;
    legR.hip.rotation.z = wave * .14;
    if (action === 'feint') {
      const step = Math.sin(clamp(eventT, 0, 1) * Math.PI * 2);
      legR.hip.rotation.x += Math.max(0, step) * .72;
      legR.hip.rotation.z += (direction || 1) * wave * .28;
      legR.shinPivot.rotation.x += Math.abs(step) * .34;
      rig.position.y += Math.abs(step) * .025;
    } else {
      legL.hip.rotation.x -= wave * .2;
      legR.hip.rotation.x += wave * .32;
      torso.rotation.x = -.08 - wave * .07;
    }
  }

  if (action === 'rhythm') {
    const spin = clamp(eventT, 0, 1);
    const ease = spin * spin * (3 - 2 * spin);
    rig.rotation.y = (direction || 1) * ease * Math.PI * 1.72;
    rig.position.y = Math.sin(spin * Math.PI) * .055;
    torso.rotation.x = -.09;
    armL.shoulder.rotation.z = -.52;
    armR.shoulder.rotation.z = .52;
  }

  if (action === 'shot') {
    const wind = clamp(eventT * 2.1, 0, 1);
    const strike = Math.sin(clamp(eventT * 1.18, 0, 1) * Math.PI);
    torso.rotation.x = -.16 + strike * .08;
    torso.rotation.y = -.14 * (direction || 1);
    rig.rotation.y = strike * .08 * (direction || 1);
    legR.hip.rotation.x = -.82 * wind + 1.48 * strike;
    legR.shinPivot.rotation.x = -.74 * strike;
    legL.hip.rotation.x = .22;
    legL.shinPivot.rotation.x = .18 * strike;
    rig.position.y = Math.sin(strike * Math.PI) * .035;
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
    const reach = Math.sin(clamp(eventT, 0, 1) * Math.PI * .72);
    rig.rotation.z = -direction * dive * 1.18;
    rig.rotation.x = -.08 * reach;
    rig.position.x = direction * dive * .82;
    rig.position.y = .16 + reach * .66;
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

function keeperGoalFramingDistance(aspect, verticalFov = 72) {
  const vfov = THREE.MathUtils.degToRad(verticalFov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(.35, aspect || 1));
  const horizontal = (GOAL_W / 2 + .62) / Math.tan(hfov / 2);
  const vertical = (GOAL_H / 2 + .72) / Math.tan(vfov / 2);
  return Math.max(3.8, horizontal, vertical) + .45;
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
    scene.background = new THREE.Color('#0b1b22');
    scene.fog = new THREE.Fog('#0b1b22', 44, 76);

    const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
    camera.position.set(0, 5.1, 19);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const ratioCap = mobile ? 1.22 : 1.5;
    let renderScale = Math.min(window.devicePixelRatio || 1, ratioCap);
    renderer.setPixelRatio(renderScale);

    renderer.domElement.className = 'penalty-arena3d-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#c8ebff', '#1f4b31', 2.05));
    const key = new THREE.DirectionalLight('#fff2cf', 3.05);
    key.position.set(-9, 16, 11);
    key.castShadow = !mobile;
    if (!mobile) {
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -16;
      key.shadow.camera.right = 16;
      key.shadow.camera.top = 18;
      key.shadow.camera.bottom = -10;
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 58;
      key.shadow.bias = -0.00035;
    }
    scene.add(key);
    const fill = new THREE.DirectionalLight('#c6e7ff', 1.18);
    fill.position.set(10, 10, 16);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#66d8ff', 1.55);
    rim.position.set(9, 10, -12);
    scene.add(rim);

    createPitch(scene);
    const goal = createGoal(scene);
    createStadium(scene, mobile);
    createPremiumMatchDecor(scene, mobile);
    const goalWorld = createThreeBGoalWorld(scene, mobile);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(.11, 18, 14),
      new THREE.MeshStandardMaterial({ color:'#f4f3ed', roughness:.42, metalness:.03 }),
    );
    const ballWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.112, 1),
      new THREE.MeshBasicMaterial({ color:'#1b252b', wireframe:true, transparent:true, opacity:.5 }),
    );
    ball.add(ballWire);
    ball.castShadow = !mobile;
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
      model.scale.setScalar(.56 * (appearance.heightCm / 178));
      model.traverse((node) => { if (node.isMesh) node.castShadow = !mobile; });
      scene.add(model);
      return model;
    });

    const livingActors = [null, null];
    let livingLibrary = null;
    let premiumActorsTimer = 0;
    let premiumActorsIdle = 0;
    let premiumActorsAttempts = 0;

    const initialState = liveRef.current.room?.state || {};
    const runtime = {
      disposed:false,
      last:performance.now(),
      lastRevision:null,
      event:null,
      playerTargets:[attackerPosition(initialState), keeperPosition(initialState)],
      speeds:[0, 0],
      yaws:[0, Math.PI],
      inputSmooth:{ x:0, y:0, intensity:0 },
      ballTarget:new THREE.Vector3(),
      cameraTarget:new THREE.Vector3(),
      cameraDesired:new THREE.Vector3(),
      cameraLook:new THREE.Vector3(),
      normalBall:new THREE.Vector3(),
      error:new THREE.Vector3(),
      playerBefore:[new THREE.Vector3(), new THREE.Vector3()],
      shotStart:new THREE.Vector3(),
      shotControl:new THREE.Vector3(),
      shotResult:{ position:new THREE.Vector3(), target:new THREE.Vector3(), t:0, done:false },
      localAttack:attackerPosition(initialState),
      localKeeper:keeperPosition(initialState),
      localReady:false,
      localKeeperReady:false,
      serverAttack:attackerPosition(initialState),
      serverKeeper:keeperPosition(initialState),
      camera:makeCameraState(),
      frameSamples:[],
      adaptiveClock:0,
    };

    async function loadPremiumActors() {
      if (mobile || runtime.disposed || livingLibrary) return;
      try {
        const { createLivingLibrary, createLivingActor } = await import('../../world/living.js');
        if (runtime.disposed) return;
        livingLibrary = createLivingLibrary();
        playerAppearance.forEach((appearance, index) => {
          let actor;
          actor = createLivingActor(livingLibrary, {
            avatar:footballAvatar(appearance, index + appearance.number),
            scale:1,
            onLoad:() => {
              if (runtime.disposed || !actor?.object) return;
              const box = new THREE.Box3().setFromObject(actor.object);
              const height = Math.max(.1, box.max.y - box.min.y);
              const targetHeight = clamp((playerAppearance[index]?.heightCm || 178) / 100, 1.65, 1.98);
              actor.object.scale.multiplyScalar(targetHeight / height);
              actor.object.updateMatrixWorld(true);
              const fitted = new THREE.Box3().setFromObject(actor.object);
              actor.object.userData.groundOffset = -fitted.min.y;
              actor.object.traverse((node) => { if (node.isMesh) node.castShadow = !mobile; });
              players[index].userData.rig.visible = false;
              actor.object.position.copy(players[index].position);
              actor.object.position.y = actor.object.userData.groundOffset || 0;
            },
            onError:() => {
              players[index].userData.rig.visible = true;
            },
          });
          livingActors[index] = actor;
          scene.add(actor.object);
        });
      } catch {
        players.forEach((player) => { player.userData.rig.visible = true; });
      }
    }

    function schedulePremiumActors(delay = 2800) {
      if (mobile || runtime.disposed || livingLibrary || premiumActorsAttempts >= 4) return;
      premiumActorsTimer = window.setTimeout(() => {
        const launch = () => {
          if (runtime.disposed || livingLibrary) return;
          const samples = runtime.frameSamples;
          const avgFrame = samples.length
            ? samples.reduce((sum, value) => sum + value, 0) / samples.length
            : 0;
          if (document.hidden || (samples.length >= 30 && avgFrame > 1 / 48)) {
            premiumActorsAttempts += 1;
            schedulePremiumActors(1800);
            return;
          }
          loadPremiumActors();
        };
        if ('requestIdleCallback' in window) {
          premiumActorsIdle = window.requestIdleCallback(launch, { timeout:6000 });
        } else {
          launch();
        }
      }, delay);
    }

    if (!mobile) schedulePremiumActors();

    function registerEvent(state, revision) {
      if (revision === runtime.lastRevision) return;
      runtime.lastRevision = revision;

      attackerPosition(state, runtime.serverAttack);
      keeperPosition(state, runtime.serverKeeper);
      if (!runtime.localReady) {
        runtime.localAttack.copy(runtime.serverAttack);
        runtime.localReady = true;
      }
      if (!runtime.localKeeperReady) {
        runtime.localKeeper.copy(runtime.serverKeeper);
        runtime.localKeeperReady = true;
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
        penaltySfx('kick', event?.visual?.shot?.power || .7);
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
      const start = attackerPosition(startState, runtime.shotStart);
      start.y += .26;
      start.z -= .55;
      if (!Number.isFinite(start.x)) start.copy(fallbackStart);

      const result = visual.result || {};
      const shot = visual.shot || {};
      const targetX = clamp(result.target ?? shot.targetX, -1, 1) * (GOAL_W / 2 - .16);
      const targetY = .28 + clamp(shot.targetY, .04, 1) * (GOAL_H - .38);
      const endZ = event.type === 'goal' ? GOAL_Z - 1.42 : event.type === 'frame' ? GOAL_Z - .06 : KEEPER_Z - .06;
      const end = runtime.shotResult.target.set(targetX, targetY, endZ);
      const control = runtime.shotControl.copy(start).lerp(end, .53);
      control.y += 1.18 + clamp(shot.power, 0, 1) * .92;

      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const cc = t * t;
      const curve = clamp(shot.curve, -1, 1);
      const lateralBend = Math.sin(t * Math.PI) * curve * (1.05 + clamp(shot.power, 0, 1) * .75);
      const out = runtime.shotResult.position.set(
        a * start.x + b * control.x + cc * end.x + lateralBend,
        a * start.y + b * control.y + cc * end.y,
        a * start.z + b * control.z + cc * end.z,
      );

      if (event.type === 'save' && t > .72) {
        const bounce = (t - .72) / .28;
        out.y = mix(out.y, .22, bounce);
        out.z += bounce * 2.1;
        out.x += Math.sign(targetX || 1) * bounce * .75;
      } else if (event.type === 'goal' && t > .76) {
        const catchT = (t - .76) / .24;
        out.z -= Math.sin(catchT * Math.PI) * .16;
        out.y = mix(out.y, Math.max(.2, targetY * .74), catchT * .34);
      } else if (event.type === 'frame' && t > .76) {
        const bounce = (t - .76) / .24;
        out.y = Math.max(.2, out.y - bounce * 1.15);
        out.x += Math.sign(targetX || 1) * bounce * 1.35;
        out.z += bounce * 1.2;
      }
      runtime.shotResult.t = t;
      runtime.shotResult.done = t >= 1;
      return runtime.shotResult;
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
      const active = Boolean(input?.active);
      const follow = expFollow(active ? 30 : 38, dt);
      runtime.inputSmooth.x = mix(runtime.inputSmooth.x, active ? clamp(input.x, -1, 1) : 0, follow);
      runtime.inputSmooth.y = mix(runtime.inputSmooth.y, active ? clamp(input.y, -1, 1) : 0, follow);
      runtime.inputSmooth.intensity = mix(runtime.inputSmooth.intensity, active ? clamp(input.intensity, 0, 1) : 0, expFollow(active ? 24 : 34, dt));
      if (active || runtime.inputSmooth.intensity > .025) {
        const intensity = runtime.inputSmooth.intensity;
        const lateralSpeed = 4.15 + intensity * 2.35;
        const forwardSpeed = (5.15 + intensity * 3.05) * (sprinting ? 1.22 : 1);
        const drive = .2 + intensity * .8;
        runtime.localAttack.x += runtime.inputSmooth.x * lateralSpeed * drive * dt;
        runtime.localAttack.z += runtime.inputSmooth.y * forwardSpeed * drive * dt;
        clampAttackerWorld(runtime.localAttack);
      }

      const error = runtime.error.copy(server).sub(runtime.localAttack);
      const distance = error.length();
      if (distance > 4.4) runtime.localAttack.lerp(server, .26);
      else runtime.localAttack.addScaledVector(error, expFollow(input?.active ? .35 : 12.5, dt));

      return runtime.localAttack;
    }

    function predictLocalKeeper(dt, selfKeeper) {
      const server = runtime.serverKeeper;
      if (!selfKeeper) return server;
      const input = controlRef?.current?.keeper || null;
      if (input?.active) {
        const intensity = clamp(input.intensity, 0, 1);
        const lateralSpeed = 7.35 + intensity * 3.45;
        const depthSpeed = 3.5 + intensity * 2.35;
        const drive = .22 + intensity * .78;
        runtime.localKeeper.x += clamp(input.direction, -1, 1) * lateralSpeed * drive * dt;
        runtime.localKeeper.z += clamp(input.forward, -1, 1) * depthSpeed * drive * dt;
        runtime.localKeeper.x = clamp(runtime.localKeeper.x, -GOAL_W / 2 + .16, GOAL_W / 2 - .16);
        runtime.localKeeper.z = clamp(runtime.localKeeper.z, KEEPER_Z, KEEPER_FORWARD_Z);
      }
      const errorX = server.x - runtime.localKeeper.x;
      const errorZ = server.z - runtime.localKeeper.z;
      if (Math.hypot(errorX, errorZ) > 2.65) runtime.localKeeper.lerp(server, .22);
      else {
        const reconcile = expFollow(input?.active ? .2 : 16, dt);
        runtime.localKeeper.x += errorX * reconcile;
        runtime.localKeeper.z += errorZ * reconcile;
      }
      runtime.localKeeper.y = 0;
      return runtime.localKeeper;
    }

    function setCamera(state, selfKeeper, serverAttack, serverKeeper, eventT, eventDirection, activeEvent, dt) {
      const progress = clamp(state?.positions?.attacker?.x, 0, 1);
      const desired = runtime.cameraDesired;
      const target = runtime.cameraLook;
      let fov;

      const attackerIndex = clamp(state?.attacker, 0, 1);
      const pace = runtime.speeds[attackerIndex] || 0;
      const leadX = selfKeeper ? 0 : runtime.inputSmooth.x * pace;

      if (selfKeeper) {
        runtime.camera.mode = 'keeper';
        fov = 72;
        const goalDistance = keeperGoalFramingDistance(camera.aspect, fov);
        const keeperDepth = clamp((serverKeeper.z - KEEPER_Z) / Math.max(.01, KEEPER_FORWARD_Z - KEEPER_Z), 0, 1);
        desired.set(
          serverKeeper.x * .56,
          2.18 + keeperDepth * .08,
          GOAL_Z - goalDistance - keeperDepth * .22,
        );
        target.set(
          mix(serverKeeper.x * .52, serverAttack.x * .34, .7),
          1.04,
          mix(GOAL_Z + 6.5, GOAL_Z + 10.4, 1 - progress),
        );
        goal.userData.netMat.opacity = mix(goal.userData.netMat.opacity, .075, .32);
        goal.userData.frameMat.emissiveIntensity = Math.max(goal.userData.frameMat.emissiveIntensity, .18);
      } else {
        runtime.camera.mode = 'attack';
        desired.set(
          serverAttack.x * .2 + leadX * .32,
          5.55 - progress * .62 + pace * .08,
          19.7 - progress * 5.9 + pace * .18,
        );
        target.set(
          serverAttack.x * .15 + leadX * .48,
          1.18,
          mix(-9.6, -12.8, progress) - pace * .18,
        );
        fov = 48.5 + pace * 2.15;
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

      camera.position.lerp(desired, expFollow(selfKeeper ? 18 : 8.5, dt));
      runtime.cameraTarget.lerp(target, expFollow(selfKeeper ? 20 : 10, dt));
      camera.lookAt(runtime.cameraTarget);
      camera.fov = mix(camera.fov, fov, expFollow(selfKeeper ? 15 : 8, dt));
      camera.updateProjectionMatrix();
    }

    function animate(now) {
      if (runtime.disposed) return;
      if (document.hidden) return;

      const dt = Math.min(.05, Math.max(.001, (now - runtime.last) / 1000));
      runtime.last = now;
      updateAdaptiveResolution(dt);

      if (goalWorld?.userData) {
        const pulse = .72 + Math.sin(now * .0014) * .16;
        goalWorld.userData.ringBack.material.emissiveIntensity = .78 + pulse * .28;
        goalWorld.userData.ringGold.material.emissiveIntensity = .66 + (1 - pulse) * .34;
        goalWorld.userData.panel.material.opacity = .88 + Math.sin(now * .0011) * .05;
        goalWorld.userData.worldLight.intensity = (mobile ? 1.2 : 1.85) + pulse * .36;
      }

      const snapshot = liveRef.current;
      const state = snapshot.room?.state || {};
      registerEvent(state, snapshot.room?.revision);

      const attacker = clamp(state.attacker, 0, 1);
      const keeper = clamp(state.keeper, 0, 1);
      const selfAttacker = snapshot.selfIndex === attacker;
      const selfKeeper = snapshot.selfIndex === keeper;

      attackerPosition(state, runtime.serverAttack);
      keeperPosition(state, runtime.serverKeeper);

      const renderAttack = predictLocalAttacker(state, dt, selfAttacker);
      const keeperPreview = selfKeeper ? controlRef?.current?.keeper : null;
      const renderKeeper = predictLocalKeeper(dt, selfKeeper);

      runtime.playerTargets[attacker].copy(renderAttack);
      runtime.playerTargets[keeper].lerp(renderKeeper, expFollow(selfKeeper ? 34 : 12, dt));

      players.forEach((model, index) => {
        const target = runtime.playerTargets[index];
        const before = runtime.playerBefore[index].copy(model.position);
        const follow = expFollow(index === snapshot.selfIndex ? 30 : 12, dt);
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

        if (index === keeper) {
          runtime.yaws[index] = followAngle(runtime.yaws[index], Math.PI, 14, dt);
        } else if (moved > .00025) {
          const desiredYaw = Math.atan2(-dx, -dz);
          runtime.yaws[index] = followAngle(runtime.yaws[index], desiredYaw, index === snapshot.selfIndex ? 18 : 10, dt);
        }
        model.rotation.y = runtime.yaws[index];

        const actor = livingActors[index];
        if (actor?.ready) {
          actor.object.position.copy(model.position);
          actor.object.position.y = actor.object.userData.groundOffset || 0;
          const travelled = moved;
          actor.update(dt, dx, dz, travelled);
          if (index === keeper) {
            actor.face(
              runtime.playerTargets[attacker].x - actor.object.position.x,
              runtime.playerTargets[attacker].z - actor.object.position.z,
              dt,
            );
          } else if (moved > .00025) {
            actor.face(dx, dz, dt);
          }
        }
      });

      const activeEvent = runtime.event;
      let attackerAction = state?.lastEvent?.type;
      let keeperAction = null;
      let eventT = 0;
      let eventDirection = 0;
      if (keeperPreview?.active && clamp(keeperPreview.intensity, 0, 1) > .35) {
        keeperAction = 'keeper-preview';
        eventDirection = clamp(keeperPreview.direction, -1, 1) || 1;
        eventT = clamp(keeperPreview.intensity, 0, 1);
      }

      const normalBall = runtime.normalBall.copy(renderAttack);
      const attackSpeed = runtime.speeds[attacker];
      const touchPhase = Math.sin(now * (.012 + attackSpeed * .006));
      const inputSide = selfAttacker ? runtime.inputSmooth.x : 0;
      normalBall.x += touchPhase * (.035 + attackSpeed * .055) + inputSide * .045;
      normalBall.y = .11 + Math.abs(Math.sin(now * .016)) * attackSpeed * .032;
      normalBall.z -= .27 + clamp(state.ballLead, 0, .75) * .52 + attackSpeed * .055;
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
            penaltySfx(activeEvent.type, activeEvent.visual?.shot?.power || .7);
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
      const spinCurve = shooting ? clamp(activeEvent?.visual?.shot?.curve, -1, 1) : 0;
      ball.rotation.x += dt * (5 + runtime.speeds[attacker] * 10);
      ball.rotation.y += dt * spinCurve * 16;
      ball.rotation.z += dt * (2.8 + Math.abs(spinCurve) * 7);
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
          lean:index === attacker ? clamp((selfAttacker ? runtime.inputSmooth.x : 0) * runtime.speeds[index], -1, 1) : 0,
          sprint:index === attacker && Date.now() < Number(state?.sprintUntil || 0),
        });

        const actor = livingActors[index];
        if (actor?.ready) {
          actor.object.position.y = actor.object.userData.groundOffset || 0;
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
        renderKeeper,
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
      clearTimeout(premiumActorsTimer);
      if (premiumActorsIdle && 'cancelIdleCallback' in window) window.cancelIdleCallback(premiumActorsIdle);
      livingActors.forEach((actor) => actor?.dispose?.());
      livingLibrary?.dispose?.();
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
