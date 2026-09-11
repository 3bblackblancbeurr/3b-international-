import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadOriginsAssets, createOriginsActor } from './actor.js';
import { buildOriginsEnvironment } from './environment.js';
import { createOriginsEffects } from './effects.js';
import { createOriginsCamera, updateOriginsCamera } from './motion.js';

export async function createOriginsScene(canvas, game, { onProgress, onStats, quality = 'auto' } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor('#07121e');
  let assets;
  try {
    assets = await loadOriginsAssets(onProgress);
  } catch (e) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw e;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07121e');
  scene.fog = new THREE.FogExp2('#07121e', 0.013);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.2, 235),
    follow = createOriginsCamera(),
    clock = { elapsed: 0 };
  scene.add(new THREE.HemisphereLight('#b6d9f0', '#26364a', 2.4));
  const sun = new THREE.DirectionalLight('#e8dcc7', 3.6);
  sun.position.set(-12, 26, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.08;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#4a9bcf', 1.3);
  fill.position.set(12, 12, 28);
  scene.add(fill);
  const environment = buildOriginsEnvironment(scene, assets, game.level),
    effects = createOriginsEffects(scene),
    hero = createOriginsActor(assets, 'hero');
  scene.add(hero.object);
  const actors = new Map(),
    telegraphs = new Map(),
    bars = new Map(),
    shadows = [],
    ownedGeo = [],
    ownedMat = [];
  const ownGeo = (g) => (ownedGeo.push(g), g),
    ownMat = (m) => (ownedMat.push(m), m);
  const coneGeo = ownGeo(new THREE.CircleGeometry(1, 36, -1.05, 2.1)),
    rimGeo = ownGeo(new THREE.RingGeometry(0.975, 1, 40, 1, -1.05, 2.1)),
    waveGeo = ownGeo(new THREE.RingGeometry(0.97, 1, 72));
  const contactGeo = ownGeo(new THREE.CircleGeometry(1, 32));
  function contact(actor, r = 1) {
    const material = ownMat(
        new THREE.MeshBasicMaterial({
          color: '#01050c',
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        }),
      ),
      m = new THREE.Mesh(contactGeo, material);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(r, r, 1);
    m.position.y = 0.025;
    scene.add(m);
    shadows.push({ actor, mesh: m });
  }
  contact(hero, 0.58);
  for (const e of game.enemies) {
    if (e.kind === 'corrupt') {
      const group = new THREE.Group(),
        core = new THREE.Mesh(
          ownGeo(new THREE.OctahedronGeometry(0.65, 1)),
          ownMat(
            new THREE.MeshStandardMaterial({
              color: '#131e30',
              metalness: 0.7,
              roughness: 0.26,
              emissive: '#276b94',
              emissiveIntensity: 0.5,
            }),
          ),
        );
      group.add(core);
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(
          ownGeo(new THREE.TorusGeometry(0.85, 0.018, 4, 36)),
          ownMat(new THREE.MeshBasicMaterial({ color: '#7ac5e8' })),
        );
        m.rotation.x = (i * Math.PI) / 3;
        m.rotation.y = i;
        rings.push(m);
        group.add(m);
      }
      scene.add(group);
      actors.set(e.id, {
        object: group,
        update(dt, s, t) {
          group.position.set(s.x, 1.5 + Math.sin(t * 2) * 0.15, s.z);
          core.rotation.y = t * 0.5;
          rings.forEach((r, i) => (r.rotation.z = t * (i % 2 ? -0.4 : 0.6)));
          group.scale.setScalar(s.hp <= 0 ? Math.max(0.01, s.death / 1.5) : 1);
        },
        dispose() {
          group.removeFromParent();
        },
      });
    } else {
      const actor = createOriginsActor(assets, e.kind);
      scene.add(actor.object);
      actors.set(e.id, actor);
      contact(actor, e.r * 0.95);
    }
    const group = new THREE.Group(),
      surface = new THREE.Mesh(
        coneGeo,
        ownMat(
          new THREE.MeshBasicMaterial({
            color: '#e88b87',
            transparent: true,
            opacity: 0.13,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      ),
      edge = new THREE.Mesh(
        rimGeo,
        ownMat(
          new THREE.MeshBasicMaterial({
            color: '#f7a3a0',
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      ),
      circle = new THREE.Mesh(waveGeo, edge.material);
    surface.rotation.x = edge.rotation.x = circle.rotation.x = -Math.PI / 2;
    group.add(surface, edge, circle);
    group.position.y = 0.06;
    scene.add(group);
    telegraphs.set(e.id, { group, surface, edge, circle });
    const bg = new THREE.Mesh(
        ownGeo(new THREE.PlaneGeometry(1.3, 0.07)),
        ownMat(
          new THREE.MeshBasicMaterial({
            color: '#07111b',
            transparent: true,
            opacity: 0.9,
            depthTest: false,
          }),
        ),
      ),
      fg = new THREE.Mesh(
        bg.geometry,
        ownMat(
          new THREE.MeshBasicMaterial({
            color: e.kind === 'boss' ? '#d8c091' : '#b3cbdf',
            depthTest: false,
          }),
        ),
      );
    const bar = new THREE.Group();
    fg.position.z = 0.003;
    bar.add(bg, fg);
    scene.add(bar);
    bars.set(e.id, { object: bar, fg });
  }
  const boltGeo = ownGeo(new THREE.SphereGeometry(0.13, 8, 6)),
    boltMat = ownMat(new THREE.MeshBasicMaterial({ color: '#ffb6b0' })),
    bolts = new THREE.InstancedMesh(boltGeo, boltMat, 32);
  bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bolts.frustumCulled = false;
  scene.add(bolts);
  const dummy = new THREE.Object3D();
  const trailGeo = ownGeo(new THREE.TorusGeometry(2, 0.026, 4, 32, 2.35)),
    trails = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      trailGeo,
      ownMat(
        new THREE.MeshBasicMaterial({
          color: '#f4e6cf',
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    m.visible = false;
    scene.add(m);
    trails.push({ mesh: m, life: 0, total: 1 });
  }
  const heroRing = new THREE.Mesh(
    ownGeo(new THREE.RingGeometry(0.56, 0.61, 48)),
    ownMat(
      new THREE.MeshBasicMaterial({
        color: '#c8e6f5',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  heroRing.rotation.x = -Math.PI / 2;
  scene.add(heroRing);
  const composer = new EffectComposer(renderer),
    renderPass = new RenderPass(scene, camera),
    bloom = new UnrealBloomPass(new THREE.Vector2(800, 600), 0.27, 0.45, 0.95),
    output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  let width = 1,
    height = 1,
    lastEvent = 0,
    dead = false,
    mode = quality,
    ratio = 1,
    adaptive = 1,
    statsTime = 0,
    frames = 0,
    totalFrame = 0,
    slow = 0,
    fast = 0;
  function resize() {
    if (dead) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const mobile = width < 700,
      cap = mode === 'economy' ? 1 : mode === 'ultra' ? 1.75 : mobile ? 1.15 : 1.35,
      pixels = mode === 'economy' ? 750000 : mode === 'ultra' ? 2600000 : 1400000;
    ratio = Math.max(
      0.55,
      Math.min(devicePixelRatio || 1, cap, Math.sqrt(pixels / (width * height))) * adaptive,
    );
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.shadowMap.enabled = mode !== 'economy' && (!mobile || mode === 'ultra');
    effects.setQuality(mode === 'economy' || mobile, ratio);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  function render(g, dt, paused = false) {
    if (dead) return;
    game = g;
    const step = paused ? 0 : Math.min(0.05, dt),
      animationStep = g.mode === 'dead' ? Math.min(0.05, dt) : step * (g.slow > 0 ? 0.55 : 1);
    clock.elapsed += step;
    updateOriginsCamera(follow, g, step, camera.aspect);
    const portal =
      g.mode === 'gate'
        ? Math.min(1, g.gateTime / 2)
        : g.zone === 4
          ? Math.min(1, (g.player.z - 94) / 14)
          : 0;
    const shot = g.mode === 'intro' ? 1 - Math.min(1, g.introTime / 3.6) : 0,
      shake = !g.reducedMotion && !paused ? Math.min(0.09, g.shake) * 0.65 : 0;
    camera.position.set(
      follow.x + Math.sin(clock.elapsed * 53) * shake,
      follow.height + portal * 3 + shot * 4,
      follow.z - portal * 4 - shot * 5,
    );
    camera.lookAt(follow.lookX, 1.5 + portal * 5, follow.lookZ + portal * 5 + shot * 5);
    if (paused && g.time === 0 && g.mode === 'intro') {
      camera.position.set(-13, 9, 78);
      camera.lookAt(2, 10, 110);
    }
    sun.position.set(g.player.x - 12, 26, g.player.z - 8);
    sun.target.position.set(g.player.x, 0, g.player.z + 3);
    const p = { ...g.player };
    if (!paused && g.renderAlpha !== undefined) {
      p.x = g.player.previousX + (g.player.x - g.player.previousX) * g.renderAlpha;
      p.z = g.player.previousZ + (g.player.z - g.player.previousZ) * g.renderAlpha;
    }
    hero.update(animationStep, p, clock.elapsed);
    for (const e of g.enemies) {
      const actor = actors.get(e.id),
        near = Math.abs(e.z - g.player.z) < 38,
        visible = near && (e.hp > 0 || e.death > 0);
      actor.object.visible = visible;
      if (visible) actor.update(animationStep, e, clock.elapsed);
      const telegraph = telegraphs.get(e.id);
      telegraph.group.visible = near && e.hp > 0 && e.state === 'windup';
      if (telegraph.group.visible) {
        const range =
          e.kind === 'boss'
            ? e.move === 'wave'
              ? 6.5
              : 4.1
            : e.kind === 'corrupt'
              ? 8
              : e.kind === 'sentinel'
                ? 3.2
                : 2.3;
        telegraph.group.position.set(e.x, 0.065, e.z);
        telegraph.group.rotation.y = e.attackAngle;
        telegraph.surface.rotation.z = telegraph.edge.rotation.z = -Math.PI / 2;
        telegraph.group.scale.set(range, 1, range);
        telegraph.circle.visible = e.move === 'wave';
        telegraph.surface.visible = telegraph.edge.visible = e.move !== 'wave';
        telegraph.surface.material.opacity = 0.07 + (1 - e.timer / e.windup) * 0.17;
        telegraph.edge.material.opacity = 0.5 + (1 - e.timer / e.windup) * 0.4;
      }
      const bar = bars.get(e.id);
      bar.object.visible =
        visible && e.hp > 0 && e.kind !== 'boss' && (e.hp < e.maxHp || e.state === 'windup');
      if (bar.object.visible) {
        bar.object.position.set(e.x, e.kind === 'sentinel' ? 3.3 : 2.7, e.z);
        bar.object.quaternion.copy(camera.quaternion);
        bar.fg.scale.x = e.hp / e.maxHp;
        bar.fg.position.x = -(1 - e.hp / e.maxHp) * 0.65;
      }
    }
    for (const s of shadows) {
      s.mesh.visible = s.actor.object.visible;
      s.mesh.position.x = s.actor.object.position.x;
      s.mesh.position.z = s.actor.object.position.z;
    }
    bolts.count = g.projectiles.length;
    g.projectiles.forEach((b, i) => {
      dummy.position.set(b.x, 0.85, b.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bolts.setMatrixAt(i, dummy.matrix);
    });
    bolts.instanceMatrix.needsUpdate = true;
    heroRing.position.set(p.x, 0.07, p.z);
    heroRing.material.color.set(p.counter > 0 ? '#61ceff' : p.charge >= 0.65 ? '#eed7a6' : '#8aabbf');
    heroRing.scale.setScalar(p.dodge > 0 ? 1.2 : 1);
    for (const e of g.events)
      if (e.id > lastEvent) {
        lastEvent = e.id;
        if (!g.reducedMotion) effects.event(e);
        if (['light', 'heavy', 'charged', 'counter', 'aerial'].includes(e.type)) {
          const trail = trails.find((t) => t.life <= 0) || trails[0];
          trail.life = trail.total = e.type === 'light' ? 0.2 : 0.36;
          trail.mesh.visible = true;
          trail.mesh.position.set(e.x, 1, e.z);
          trail.mesh.rotation.set(-Math.PI / 2, 0, -g.player.facing + 0.2);
          trail.mesh.scale.setScalar(e.type === 'charged' ? 1.5 : e.type === 'heavy' ? 1.25 : 1);
          trail.mesh.material.color.set(e.type === 'charged' ? '#6acfff' : '#ead7b3');
        }
        if (e.type === 'matrix') hero.action('matrix', 0.8);
        if (['rune', 'seal', 'stone'].includes(e.type)) hero.action('interact', 0.65);
      }
    for (const t of trails) {
      t.life -= animationStep;
      t.mesh.visible = t.life > 0 && !g.reducedMotion;
      t.mesh.material.opacity = Math.max(0, t.life / t.total) * 0.8;
    }
    effects.update(animationStep);
    environment.update(g, clock.elapsed, g.reducedMotion);
    if (mode === 'ultra' && !g.reducedMotion) composer.render();
    else renderer.render(scene, camera);
    if (!paused && step > 0) {
      frames++;
      totalFrame += dt;
      statsTime += dt;
      if (statsTime > 1) {
        const fps = Math.round(frames / totalFrame);
        onStats?.({
          fps,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          resolution: Math.round(ratio * 100),
          quality: mode,
        });
        if (mode === 'auto') {
          slow = fps < 45 ? slow + statsTime : 0;
          fast = fps > 57 ? fast + statsTime : 0;
          if (slow > 2.5 && adaptive > 0.65) {
            adaptive = Math.max(0.65, adaptive - 0.12);
            slow = 0;
            resize();
          } else if (fast > 10 && adaptive < 1) {
            adaptive = Math.min(1, adaptive + 0.06);
            fast = 0;
            resize();
          }
        }
        frames = totalFrame = statsTime = 0;
      }
    }
  }
  return {
    render,
    setQuality(value) {
      mode = ['auto', 'economy', 'standard', 'ultra'].includes(value) ? value : 'auto';
      adaptive = 1;
      resize();
    },
    setYaw(value) {
      follow.yaw = THREE.MathUtils.clamp(value, -0.55, 0.55);
    },
    get yaw() {
      return follow.yaw;
    },
    get stats() {
      return {
        drawCalls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        contextLost: renderer.getContext().isContextLost(),
      };
    },
    dispose() {
      if (dead) return;
      dead = true;
      ro.disconnect();
      sun.shadow.dispose();
      hero.dispose();
      actors.forEach((a) => a.dispose());
      effects.dispose();
      environment.dispose();
      ownedGeo.forEach((g) => g.dispose());
      ownedMat.forEach((m) => m.dispose());
      bloom.dispose();
      output.dispose();
      renderPass.dispose();
      composer.dispose();
      assets.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
    },
  };
}
