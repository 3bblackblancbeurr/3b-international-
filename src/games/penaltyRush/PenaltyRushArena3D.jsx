import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const FIELD_W = 18;
const FIELD_L = 30;
const GOAL_Z = -13.55;
const START_Z = 10.2;
const ATTACK_END_Z = -9.1;
const LATERAL = 6.4;

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const mix = (a, b, t) => a + (b - a) * t;
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
  return {
    shirt: validHex(kit.shirtPrimary, fallback[0]),
    trim: validHex(kit.shirtSecondary || kit.trim, fallback[1]),
    shorts: validHex(kit.shorts, '#08090b'),
    socks: validHex(kit.socks, fallback[0]),
    boots: validHex(boots.upper, '#08090b'),
    skin: ['#9a6748', '#b87b58', '#80563f', '#c18b68'][Math.abs(String(player?.countryId || '').split('').reduce((n, c) => n + c.charCodeAt(0), 0)) % 4],
  };
}

function makeMaterial(color, roughness = 0.68, metalness = 0.04, emissive = '#000000', emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
}

function limb(length, radius, material) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .84, radius, length, 7), material);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  return pivot;
}

function createHumanoid(appearance) {
  const root = new THREE.Group();
  const shirtMat = makeMaterial(appearance.shirt, .62);
  const trimMat = makeMaterial(appearance.trim, .55, .18);
  const shortsMat = makeMaterial(appearance.shorts, .72);
  const socksMat = makeMaterial(appearance.socks, .7);
  const bootMat = makeMaterial(appearance.boots, .52, .16);
  const skinMat = makeMaterial(appearance.skin, .78);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.12, .44), shirtMat);
  torso.position.y = 2.02;
  torso.scale.x = .92;
  root.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(.18, .42, .035), trimMat);
  chest.position.set(0, 2.08, -.238);
  root.add(chest);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.08, .16, .5), shirtMat);
  shoulders.position.y = 2.48;
  root.add(shoulders);

  const shorts = new THREE.Mesh(new THREE.BoxGeometry(.78, .54, .48), shortsMat);
  shorts.position.y = 1.22;
  root.add(shorts);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.15, .17, .22, 8), skinMat);
  neck.position.y = 2.7;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(.31, 12, 9), skinMat);
  head.scale.set(.9, 1.08, .88);
  head.position.y = 3.02;
  root.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(.315, 10, 7, 0, Math.PI * 2, 0, Math.PI * .47), makeMaterial('#111315', .9));
  hair.position.y = 3.08;
  root.add(hair);

  const armL = limb(.92, .115, skinMat);
  const armR = limb(.92, .115, skinMat);
  armL.position.set(-.59, 2.45, 0);
  armR.position.set(.59, 2.45, 0);
  armL.rotation.z = -.12;
  armR.rotation.z = .12;
  root.add(armL, armR);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(.14, .13, .3, 7), shirtMat);
  const sleeveR = sleeveL.clone();
  sleeveL.position.y = -.12;
  sleeveR.position.y = -.12;
  armL.add(sleeveL);
  armR.add(sleeveR);

  const gloveMat = makeMaterial('#d7eef4', .48, .1, appearance.trim, .08);
  const gloveL = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), gloveMat);
  const gloveR = gloveL.clone();
  gloveL.position.y = -.94;
  gloveR.position.y = -.94;
  armL.add(gloveL);
  armR.add(gloveR);

  const legL = limb(1.05, .145, socksMat);
  const legR = limb(1.05, .145, socksMat);
  legL.position.set(-.24, 1.03, 0);
  legR.position.set(.24, 1.03, 0);
  root.add(legL, legR);

  const bootGeo = new THREE.BoxGeometry(.28, .2, .48);
  const bootL = new THREE.Mesh(bootGeo, bootMat);
  const bootR = new THREE.Mesh(bootGeo, bootMat);
  bootL.position.set(0, -1.02, -.12);
  bootR.position.set(0, -1.02, -.12);
  legL.add(bootL);
  legR.add(bootR);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(.58, 20),
    new THREE.MeshBasicMaterial({ color:'#000000', transparent:true, opacity:.28, depthWrite:false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = .015;
  root.add(blob);

  root.userData = { torso, head, armL, armR, legL, legR, gloveL, gloveR, blob };
  return root;
}

function setKeeper(model, keeper) {
  model.userData.gloveL.visible = keeper;
  model.userData.gloveR.visible = keeper;
}

function lineBox(scene, x, z, w, d) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, .025, d),
    new THREE.MeshBasicMaterial({ color:'#d9f4ef', transparent:true, opacity:.65 }),
  );
  mesh.position.set(x, .024, z);
  scene.add(mesh);
  return mesh;
}

function createPitch(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD_W, FIELD_L),
    new THREE.MeshStandardMaterial({ color:'#123a27', roughness:.94, metalness:0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  for (let i = 0; i < 10; i += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_W / 10, FIELD_L),
      new THREE.MeshBasicMaterial({ color:i % 2 ? '#0e3022' : '#17442e', transparent:true, opacity:.34, depthWrite:false }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-FIELD_W / 2 + FIELD_W / 20 + i * FIELD_W / 10, .006, 0);
    scene.add(stripe);
  }

  lineBox(scene, 0, -14.45, 16.3, .055);
  lineBox(scene, 0, 14.45, 16.3, .055);
  lineBox(scene, -8.15, 0, .055, 28.9);
  lineBox(scene, 8.15, 0, .055, 28.9);
  lineBox(scene, 0, 0, 16.3, .045);
  lineBox(scene, -6.15, -9.3, .045, 10.3);
  lineBox(scene, 6.15, -9.3, .045, 10.3);
  lineBox(scene, 0, -4.15, 12.3, .045);
  lineBox(scene, -3.25, -12.15, .045, 4.6);
  lineBox(scene, 3.25, -12.15, .045, 4.6);
  lineBox(scene, 0, -9.85, 6.55, .045);

  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(.09, 16),
    new THREE.MeshBasicMaterial({ color:'#edf6f2' }),
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, .03, -10.5);
  scene.add(spot);

  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, .025, 5, 42, Math.PI * 1.1),
    new THREE.MeshBasicMaterial({ color:'#d9f4ef', transparent:true, opacity:.62 }),
  );
  arc.rotation.set(Math.PI / 2, 0, -.05);
  arc.position.set(0, .032, -8.7);
  scene.add(arc);
}

function createGoal(scene) {
  const group = new THREE.Group();
  const white = makeMaterial('#e8f7fa', .38, .08, '#7bd8f2', .12);
  const postGeo = new THREE.CylinderGeometry(.075, .075, 2.9, 10);
  const left = new THREE.Mesh(postGeo, white);
  const right = left.clone();
  left.position.set(-3.65, 1.45, GOAL_Z);
  right.position.set(3.65, 1.45, GOAL_Z);
  group.add(left, right);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 7.3, 10), white);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 2.9, GOAL_Z);
  group.add(bar);

  const netPoints = [];
  const backZ = GOAL_Z - 1.55;
  for (let i = 0; i <= 12; i += 1) {
    const x = mix(-3.65, 3.65, i / 12);
    netPoints.push(x, 0, backZ, x, 2.9, backZ);
    netPoints.push(x, 2.9, backZ, x, 2.9, GOAL_Z);
  }
  for (let i = 0; i <= 7; i += 1) {
    const y = mix(0, 2.9, i / 7);
    netPoints.push(-3.65, y, backZ, 3.65, y, backZ);
    netPoints.push(-3.65, y, GOAL_Z, -3.65, y, backZ);
    netPoints.push(3.65, y, GOAL_Z, 3.65, y, backZ);
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPoints, 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color:'#98deee', transparent:true, opacity:.25 }));
  group.add(net);
  group.userData.net = net;

  scene.add(group);
  return group;
}

function createStadium(scene) {
  const wallMat = makeMaterial('#071012', .75, .1, '#0d3340', .08);
  const standL = new THREE.Mesh(new THREE.BoxGeometry(4, 5.5, 32), wallMat);
  const standR = standL.clone();
  standL.position.set(-11.2, 2.6, 0);
  standR.position.set(11.2, 2.6, 0);
  scene.add(standL, standR);

  const ledGeo = new THREE.BoxGeometry(.16, .62, 3.2);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 7; i += 1) {
      const gold = i % 2 === 0;
      const led = new THREE.Mesh(
        ledGeo,
        makeMaterial(gold ? '#3f3214' : '#0d3542', .45, .22, gold ? '#d9b55f' : '#54c8ef', .65),
      );
      led.position.set(side * 8.55, .42, -11.5 + i * 3.8);
      scene.add(led);
    }
  }

  const positions = [];
  for (let i = 0; i < 420; i += 1) {
    const side = i % 2 ? -1 : 1;
    positions.push(side * (9.5 + Math.random() * 3.2), 2.2 + Math.random() * 4.4, -14 + Math.random() * 28);
  }
  const crowdGeo = new THREE.BufferGeometry();
  crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const crowd = new THREE.Points(crowdGeo, new THREE.PointsMaterial({ color:'#a9c5c8', size:.075, transparent:true, opacity:.5 }));
  scene.add(crowd);
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
  return new THREE.Vector3(clamp(state?.positions?.keeper?.y, -.95, .95) * 3.65, 0, -12.25);
}

function dispose(root) {
  root.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose?.());
    else obj.material?.dispose?.();
  });
}

function posePlayer(model, { speed = 0, keeper = false, time = 0, action = null, eventT = 0, direction = 0 }) {
  const { torso, armL, armR, legL, legR } = model.userData;
  setKeeper(model, keeper);
  const stride = Math.sin(time * (8 + speed * 9)) * Math.min(.72, speed * 1.35);
  legL.rotation.x = stride;
  legR.rotation.x = -stride;
  armL.rotation.x = -stride * .62;
  armR.rotation.x = stride * .62;
  armL.rotation.z = -.12;
  armR.rotation.z = .12;
  torso.rotation.z *= .82;
  torso.rotation.y *= .82;

  if (keeper) {
    armL.rotation.z = -1.02;
    armR.rotation.z = 1.02;
    legL.rotation.z = -.08;
    legR.rotation.z = .08;
  }

  if (action === 'accelerate') {
    torso.rotation.x = -.16;
  } else {
    torso.rotation.x *= .75;
  }

  if (action === 'feint' || action === 'cut') {
    torso.rotation.z = Math.sin(eventT * Math.PI) * .22 * (direction || 1);
    torso.rotation.y = Math.sin(eventT * Math.PI) * .28 * (direction || 1);
  }

  if (action === 'shot') {
    legR.rotation.x = -Math.sin(Math.min(1, eventT * 1.2) * Math.PI) * 1.4;
    armL.rotation.z = -.65;
    armR.rotation.z = .55;
    torso.rotation.x = -.12;
  }

  if (action === 'dive') {
    model.rotation.z = -direction * Math.sin(Math.min(1, eventT) * Math.PI / 2) * 1.08;
    armL.rotation.z = -1.5;
    armR.rotation.z = 1.5;
  } else {
    model.rotation.z *= .82;
  }

  if (action === 'celebrate') {
    const jump = Math.sin(Math.min(1, eventT) * Math.PI);
    model.position.y = jump * .45;
    armL.rotation.z = -2.35;
    armR.rotation.z = 2.35;
  } else if (action !== 'dive') {
    model.position.y *= .76;
  }
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
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
    } catch {
      setFallback(true);
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#061014');
    scene.fog = new THREE.Fog('#061014', 25, 49);

    const camera = new THREE.PerspectiveCamera(47, 1, .1, 90);
    camera.position.set(0, 6.2, 15.5);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.7));
    renderer.domElement.className = 'penalty-arena3d-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#9bdfff', '#102014', 1.55));
    const key = new THREE.DirectionalLight('#fff0c4', 2.35);
    key.position.set(-7, 13, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#55cffa', 1.25);
    rim.position.set(8, 7, -9);
    scene.add(rim);

    createPitch(scene);
    const goal = createGoal(scene);
    createStadium(scene);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(.23, 16, 12),
      new THREE.MeshStandardMaterial({ color:'#f4f3ed', roughness:.46, metalness:.03 }),
    );
    const ballWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.234, 1),
      new THREE.MeshBasicMaterial({ color:'#182025', wireframe:true, transparent:true, opacity:.58 }),
    );
    ball.add(ballWire);
    scene.add(ball);

    const players = [0, 1].map((index) => {
      const snapshot = liveRef.current;
      const entry = snapshot.room?.players?.[index] || {};
      const model = createHumanoid(appearanceFor(entry, snapshot.profile, index === snapshot.selfIndex));
      scene.add(model);
      return model;
    });

    const runtime = {
      disposed:false,
      frame:0,
      last:performance.now(),
      lastRevision:null,
      event:null,
      playerTargets:[new THREE.Vector3(), new THREE.Vector3()],
      previousTargets:[new THREE.Vector3(), new THREE.Vector3()],
      speeds:[0, 0],
      ballTarget:new THREE.Vector3(),
      cameraTarget:new THREE.Vector3(),
    };

    function registerEvent(state, revision) {
      if (revision === runtime.lastRevision) return;
      runtime.lastRevision = revision;
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
      };
    }

    function shotBallPosition(event, now, fallbackStart) {
      const elapsed = (now - event.started) / 1000;
      const duration = event.type === 'goal' ? 1.05 : .92;
      const t = clamp(elapsed / duration, 0, 1);
      const visual = event.visual || {};
      const startState = { positions:{ attacker:visual.attacker || liveRef.current.room?.state?.positions?.attacker } };
      const start = attackerPosition(startState).add(new THREE.Vector3(0, .28, -.48));
      if (!Number.isFinite(start.x)) start.copy(fallbackStart);
      const result = visual.result || {};
      const shot = visual.shot || {};
      const targetX = clamp(result.target ?? shot.targetX, -1, 1) * 3.45;
      const targetY = .48 + clamp(shot.targetY, .04, 1) * 2.05;
      const endZ = event.type === 'save' ? -12.28 : GOAL_Z - .22;
      const end = new THREE.Vector3(targetX, targetY, endZ);
      const control = start.clone().lerp(end, .52);
      control.y += 1.25 + clamp(shot.power, 0, 1) * .75;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      const out = new THREE.Vector3(
        a * start.x + b * control.x + c * end.x,
        a * start.y + b * control.y + c * end.y,
        a * start.z + b * control.z + c * end.z,
      );
      if (event.type === 'save' && t > .72) {
        const bounce = (t - .72) / .28;
        out.y = mix(out.y, .22, bounce);
        out.z += bounce * 1.45;
        out.x += Math.sign(targetX || 1) * bounce * .55;
      } else if (event.type === 'frame' && t > .78) {
        const bounce = (t - .78) / .22;
        out.y = Math.max(.2, out.y - bounce * .9);
        out.x += Math.sign(targetX || 1) * bounce * 1.15;
        out.z += bounce * .9;
      }
      return { position:out, t, done:t >= 1 };
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

    function animate(now) {
      if (runtime.disposed) return;
      runtime.frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      const dt = Math.min(.05, Math.max(.001, (now - runtime.last) / 1000));
      runtime.last = now;
      const snapshot = liveRef.current;
      const state = snapshot.room?.state || {};
      registerEvent(state, snapshot.room?.revision);

      const attacker = clamp(state.attacker, 0, 1);
      const keeper = clamp(state.keeper, 0, 1);
      const serverAttack = attackerPosition(state);
      const serverKeeper = keeperPosition(state);
      const prediction = snapshot.selfIndex === attacker ? controlRef?.current || null : null;
      if (prediction?.active) {
        serverAttack.x += clamp(prediction.x, -1, 1) * .22;
        serverAttack.z -= Math.max(0, -clamp(prediction.y, -1, 1)) * .34;
      }

      runtime.playerTargets[attacker].copy(serverAttack);
      runtime.playerTargets[keeper].copy(serverKeeper);

      players.forEach((model, index) => {
        const target = runtime.playerTargets[index];
        const before = model.position.clone();
        const follow = 1 - Math.pow(.0016, dt);
        model.position.x = mix(model.position.x, target.x, follow);
        model.position.z = mix(model.position.z, target.z, follow);
        const moved = before.distanceTo(model.position);
        runtime.speeds[index] = mix(runtime.speeds[index], Math.min(1, moved / Math.max(.001, dt) / 4.8), .24);
        model.rotation.y = index === keeper ? Math.PI : 0;
      });

      const activeEvent = runtime.event;
      let attackerAction = state?.lastEvent?.type;
      let keeperAction = null;
      let eventT = 0;
      let eventDirection = 0;

      const normalBall = serverAttack.clone();
      normalBall.y = .24;
      normalBall.z -= .55 + clamp(state.ballLead, 0, .75) * .55;
      normalBall.y += Math.abs(Math.sin(now * .012)) * runtime.speeds[attacker] * .08;
      runtime.ballTarget.copy(normalBall);

      if (activeEvent) {
        const age = (now - activeEvent.started) / 1000;
        eventDirection = activeEvent.direction || Math.sign(state?.lastEvent?.visual?.result?.target - state?.lastEvent?.visual?.result?.keeperCenter || 1);
        if (['goal', 'save', 'frame'].includes(activeEvent.type)) {
          const shot = shotBallPosition(activeEvent, now, normalBall);
          runtime.ballTarget.copy(shot.position);
          eventT = shot.t;
          attackerAction = shot.t < .5 ? 'shot' : activeEvent.type === 'goal' ? 'celebrate' : null;
          if (activeEvent.type === 'save') keeperAction = shot.t < .84 ? 'dive' : 'celebrate';
          else if (activeEvent.type === 'goal') keeperAction = shot.t < .78 ? 'dive' : null;
          else keeperAction = shot.t < .78 ? 'dive' : null;
          goal.userData.net.position.z = activeEvent.type === 'goal' ? -Math.sin(shot.t * Math.PI) * .18 : 0;
          if (shot.done) runtime.event = null;
        } else {
          eventT = clamp(age / .7, 0, 1);
          if (activeEvent.type === 'keeper') keeperAction = state?.keeperIntent?.type === 'dive' ? 'dive' : null;
          if (eventT >= 1) runtime.event = null;
        }
      }

      ball.position.lerp(runtime.ballTarget, activeEvent && ['goal','save','frame'].includes(activeEvent.type) ? .72 : .34);
      ball.rotation.x += dt * (4 + runtime.speeds[attacker] * 8);
      ball.rotation.z += dt * 2.2;

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
      });

      const selfKeeper = snapshot.selfIndex === keeper;
      const progress = clamp(state?.positions?.attacker?.x, 0, 1);
      const desiredCamera = selfKeeper
        ? new THREE.Vector3(serverKeeper.x * .18, 4.35, -17.4)
        : new THREE.Vector3(serverAttack.x * .15, 5.7 - progress * .45, 15.7 - progress * 3.4);
      if (activeEvent && ['goal','save','frame'].includes(activeEvent.type)) {
        desiredCamera.x += eventDirection * .35 * Math.sin(eventT * Math.PI);
        desiredCamera.y -= .35 * Math.sin(eventT * Math.PI);
      }
      camera.position.lerp(desiredCamera, 1 - Math.pow(.012, dt));
      runtime.cameraTarget.set(
        selfKeeper ? serverAttack.x * .22 : serverAttack.x * .18,
        1.22,
        selfKeeper ? -1.2 : -8.8 + progress * -1.4,
      );
      camera.lookAt(runtime.cameraTarget);
      camera.fov = mix(camera.fov, activeEvent ? 43 : 47, .08);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
    }

    runtime.frame = requestAnimationFrame(animate);
    const onContextLost = (event) => {
      event.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    return () => {
      runtime.disposed = true;
      cancelAnimationFrame(runtime.frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
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
