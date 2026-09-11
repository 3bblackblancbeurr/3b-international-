import * as THREE from 'three';
import { rng } from '../core.js';
import { ZONES } from './level.js';
import { createOriginsActor } from './actor.js';

const GOLD = '#d5bd8a',
  BLUE = '#54bce9';
export function buildOriginsEnvironment(scene, assets, level) {
  const root = new THREE.Group();
  root.name = '3B Origins · monumental ruins';
  scene.add(root);
  const ownedGeometry = new Set(),
    ownedMaterial = new Set(),
    ownedTextures = new Set(),
    random = rng(7737),
    animations = [],
    objectViews = new Map();
  const geo = (g) => (ownedGeometry.add(g), g),
    mat = (m) => (ownedMaterial.add(m), m);
  const surface = (color, opts = {}) =>
    mat(new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  const stoneMap = assets.textures.stone.clone();
  stoneMap.repeat.set(2, 3);
  ownedTextures.add(stoneMap);
  const stone = surface('#556474', { map: stoneMap, roughness: 0.86 }),
    darkStone = surface('#263747', { map: stoneMap, roughness: 0.82 }),
    black = surface('#091722', { metalness: 0.65, roughness: 0.33 }),
    gold = surface(GOLD, { metalness: 0.72, roughness: 0.32 }),
    energy = mat(new THREE.MeshBasicMaterial({ color: BLUE, toneMapped: false }));
  function mesh(geometry, material, x = 0, y = 0, z = 0, parent = root) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function instances(geometry, material, transforms) {
    const m = new THREE.InstancedMesh(geometry, material, transforms.length),
      dummy = new THREE.Object3D();
    transforms.forEach((p, i) => {
      dummy.position.set(p.x, p.y || 0, p.z);
      dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      dummy.scale.set(p.sx || p.s || 1, p.sy || p.s || 1, p.sz || p.s || 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    return m;
  }
  // The continuous traversable floor has real openings: the collision map uses the same holes.
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-13, 6);
  floorShape.lineTo(13, 6);
  floorShape.lineTo(13, -117);
  floorShape.lineTo(-13, -117);
  floorShape.closePath();
  for (const pit of level.pits) {
    const h = new THREE.Path(),
      x = pit.x - pit.w / 2,
      z = -pit.z - pit.d / 2;
    h.moveTo(x, z);
    h.lineTo(x + pit.w, z);
    h.lineTo(x + pit.w, z + pit.d);
    h.lineTo(x, z + pit.d);
    h.closePath();
    floorShape.holes.push(h);
  }
  const floorGeo = geo(new THREE.ShapeGeometry(floorShape)),
    uv = floorGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 5, uv.getY(i) / 5);
  const floorMat = surface('#455367', {
    map: assets.textures.floor,
    normalMap: assets.textures.normal,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.87,
  });
  const floor = mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const under = mesh(
    geo(new THREE.PlaneGeometry(28, 124)),
    surface('#061425', { emissive: '#0b416d', emissiveIntensity: 0.5 }),
    0,
    -1.6,
    54,
  );
  under.rotation.x = -Math.PI / 2;
  const columnGeo = geo(
    new THREE.LatheGeometry(
      [
        [1, 0],
        [1, 0.15],
        [0.8, 0.2],
        [0.8, 0.38],
        [0.58, 0.48],
        [0.51, 3.9],
        [0.62, 4.05],
        [0.8, 4.18],
        [0.8, 4.38],
        [1, 4.43],
        [1, 4.6],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      16,
    ),
  );
  const columns = level.obstacles
    .filter((o) => o.id.includes('pillar'))
    .map((o) => ({ x: o.x, z: o.z, sx: o.r, sz: o.r, sy: o.id.includes('gate') ? 1.75 : 1.15 }));
  instances(columnGeo, stone, columns);
  const bandGeo = geo(new THREE.TorusGeometry(0.64, 0.045, 5, 24)),
    bandPositions = [];
  for (const o of columns)
    for (const y of [0.6, 3.7])
      bandPositions.push({ x: o.x, z: o.z, y: y * o.sy, rx: Math.PI / 2, s: o.sx });
  instances(bandGeo, gold, bandPositions);
  function archShape(w, h, thickness) {
    const shape = new THREE.Shape(),
      r = w / 2,
      spring = h - r;
    shape.moveTo(-r, 0);
    shape.lineTo(-r, spring);
    shape.absarc(0, spring, r, Math.PI, 0, true);
    shape.lineTo(r, 0);
    shape.lineTo(r - thickness, 0);
    shape.lineTo(r - thickness, spring);
    shape.absarc(0, spring, r - thickness, 0, Math.PI, false);
    shape.lineTo(-r + thickness, 0);
    shape.closePath();
    return shape;
  }
  const archGeo = geo(
    new THREE.ExtrudeGeometry(archShape(9, 9, 0.85), {
      depth: 1,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.1,
      curveSegments: 24,
    }),
  );
  instances(archGeo, stone, [
    { x: -19, z: 9, ry: 0.23, sy: 1.2 },
    { x: 19, z: 25, ry: -0.3 },
    { x: -19, z: 49, ry: 0.15, sy: 1.4 },
    { x: 20, z: 64, ry: -0.2, sy: 1.3 },
    { x: -20, z: 89, ry: 0.25, sy: 1.2 },
  ]);
  for (const o of level.obstacles.filter((o) => o.id.includes('debris'))) {
    const m = mesh(columnGeo, stone, o.x, 0.55, o.z);
    m.rotation.z = Math.PI / 2;
    m.scale.set(0.45, 0.42, 0.45);
  }
  // Authored rock silhouettes are instanced at the edges; none of these meshes is a character placeholder.
  for (let variant = 0; variant < 4; variant++) {
    const rock = geo(new THREE.IcosahedronGeometry(1, 1)),
      pos = rock.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i),
        n = 0.92 + 0.12 * Math.sin(x * 9 + y * 5 + z * 7 + variant);
      pos.setXYZ(i, x * n, y * n, z * n);
    }
    rock.computeVertexNormals();
    const positions = [];
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1;
      positions.push({
        x: side * (20 + random() * 10),
        y: -1.4,
        z: -8 + random() * 138,
        sx: 2 + random() * 4,
        sy: 2 + random() * 7,
        sz: 2 + random() * 5,
        ry: random() * 6,
      });
    }
    instances(rock, variant % 2 ? darkStone : stone, positions);
  }
  // Champagne inlays connect the five distinct spaces and make movement direction readable.
  const strip = geo(new THREE.BoxGeometry(0.035, 0.018, 1)),
    inlays = [];
  for (let z = -3; z < 111; z += 2)
    for (const x of [-11.6, 11.6]) inlays.push({ x, y: 0.035, z, sz: 1.2 });
  instances(strip, gold, inlays);
  const crackGeo = geo(new THREE.BoxGeometry(0.055, 0.018, 1));
  for (const pit of level.pits) {
    const g = new THREE.Group();
    g.position.set(pit.x, -0.18, pit.z);
    root.add(g);
    for (let i = 0; i < 7; i++) {
      const m = mesh(crackGeo, energy, (random() - 0.5) * pit.w, 0, (random() - 0.5) * pit.d, g);
      m.rotation.y = random() * 3;
      m.scale.z = 0.5 + random() * 2;
    }
    animations.push({ kind: 'crack', object: g });
  }
  const circle = new THREE.Group();
  circle.position.set(0, 0.045, 79);
  root.add(circle);
  for (const radius of [7.8, 8.25, 9.1]) {
    const m = mesh(
      geo(new THREE.RingGeometry(radius - 0.025, radius, 100, 1, 0.15, Math.PI * 1.82)),
      radius === 8.25 ? energy : gold,
      0,
      0,
      0,
      circle,
    );
    m.rotation.x = -Math.PI / 2;
    m.castShadow = false;
  }
  const rayGeo = geo(new THREE.BoxGeometry(0.045, 0.015, 1.5));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const m = mesh(rayGeo, gold, Math.sin(a) * 8.6, 0, Math.cos(a) * 8.6, circle);
    m.rotation.y = a;
  }
  const pedestalGeo = geo(
    new THREE.LatheGeometry(
      [
        [0.7, 0],
        [0.7, 0.12],
        [0.55, 0.2],
        [0.43, 0.7],
        [0.56, 0.78],
        [0.56, 0.9],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  );
  function glyph(symbol) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = '#bceaff';
    c.lineWidth = 3;
    c.shadowColor = '#7cd5ff';
    c.shadowBlur = 9;
    c.beginPath();
    c.arc(64, 64, 48, 0.2, Math.PI * 1.85);
    c.stroke();
    c.fillStyle = '#d9f4ff';
    c.font = '500 39px Georgia';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(
      { broken: '3B', sun: '☉', moon: '☾', star: '✧', inscription: '≡', cache: '3B' }[symbol] || '✧',
      64,
      65,
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    ownedTextures.add(texture);
    return texture;
  }
  for (const o of level.objects) {
    if (o.kind === 'gate') continue;
    const g = new THREE.Group();
    g.position.set(o.x, 0, o.z);
    root.add(g);
    if (o.kind === 'stone') {
      const stone = mesh(geo(new THREE.DodecahedronGeometry(0.8, 1)), darkStone, 0, 0.45, 0, g);
      stone.scale.set(1.1, 0.75, 0.8);
      objectViews.set(o.id, { object: g, kind: o.kind });
      continue;
    }
    mesh(pedestalGeo, o.kind === 'cache' ? black : darkStone, 0, 0, 0, g);
    const ring = mesh(geo(new THREE.TorusGeometry(0.46, 0.024, 5, 32)), gold, 0, 0.88, 0, g);
    ring.rotation.x = Math.PI / 2;
    const material = mat(
        new THREE.SpriteMaterial({
          map: glyph(o.symbol || o.kind),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
      icon = new THREE.Sprite(material);
    icon.position.y = 1.6;
    icon.scale.setScalar(1.1);
    g.add(icon);
    objectViews.set(o.id, { object: g, icon, kind: o.kind, hidden: o.hidden });
  }
  const pickups = [];
  const gemGeo = geo(new THREE.OctahedronGeometry(0.28, 0));
  for (const item of level.pickups) {
    const m = mesh(gemGeo, energy, item.x, 0.65, item.z);
    pickups.push({ item, mesh: m });
  }
  const gate = new THREE.Group();
  gate.position.set(0, 0, 112);
  root.add(gate);
  const outer = mesh(
    geo(
      new THREE.ExtrudeGeometry(archShape(23, 29, 2.1), {
        depth: 2.4,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.22,
        bevelThickness: 0.2,
        curveSegments: 48,
      }),
    ),
    darkStone,
    0,
    0,
    0,
    gate,
  );
  mesh(
    geo(
      new THREE.ExtrudeGeometry(archShape(19, 26, 0.24), {
        depth: 0.2,
        bevelEnabled: true,
        bevelSize: 0.07,
        bevelThickness: 0.06,
        bevelSegments: 2,
        curveSegments: 48,
      }),
    ),
    gold,
    0,
    0,
    -0.3,
    gate,
  );
  const leaves = [];
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(side * 8.8, 0);
    shape.lineTo(side * 8.8, 15);
    shape.absarc(0, 15, 8.8, side < 0 ? Math.PI : 0, Math.PI / 2, side < 0);
    shape.lineTo(0, 0);
    shape.closePath();
    const hinge = new THREE.Group();
    hinge.position.set(side * 8.8, 0, 0.2);
    gate.add(hinge);
    mesh(
      geo(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.6,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.08,
          bevelThickness: 0.08,
          curveSegments: 36,
        }),
      ),
      black,
      -side * 8.8,
      0,
      0,
      hinge,
    );
    leaves.push({ side, hinge });
  }
  const gateLines = new THREE.Group();
  gate.add(gateLines);
  for (const r of [4.8, 5.2, 6.4])
    mesh(
      geo(new THREE.TorusGeometry(r, 0.055, 6, 100, Math.PI * 1.84)),
      r === 5.2 ? energy : gold,
      0,
      12,
      -0.45,
      gateLines,
    ).rotation.z = 0.25;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const socket = mesh(
      geo(new THREE.OctahedronGeometry(0.32, 0)),
      gold,
      Math.sin(a) * 5.7,
      12 + Math.cos(a) * 5.7,
      -0.58,
      gateLines,
    );
    socket.rotation.z = a;
    socket.userData.socket = i;
  }
  const bar = geo(new THREE.BoxGeometry(0.04, 1, 0.025));
  for (let i = 0; i < 16; i++) {
    const x = (i - 7.5) * 0.9;
    const line = mesh(bar, energy, x, 4 + Math.abs(x) * 0.25, -0.49, gateLines);
    line.scale.y = 5 + Math.sin(i * 3) * 2;
  }
  gateLines.position.y = 12;
  for (const child of gateLines.children) child.position.y -= 12;
  const sealMaterial = mat(
      new THREE.SpriteMaterial({
        map: glyph('broken'),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    ),
    seal = new THREE.Sprite(sealMaterial);
  seal.position.set(0, 12, -0.8);
  seal.scale.set(5.5, 5.5, 1);
  gate.add(seal);
  const voidMat = mat(
      new THREE.MeshBasicMaterial({
        color: '#05101c',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    ),
    voidPlane = mesh(geo(new THREE.PlaneGeometry(17, 23)), voidMat, 0, 11.5, -0.6, gate);
  const beamMaterial = mat(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uStrength: { value: 0 } },
        vertexShader:
          'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:
          'varying vec2 vUv;uniform float uTime;uniform float uStrength;void main(){float x=abs(vUv.x-.5)*2.;float edge=1.-smoothstep(.15,1.,x);float vertical=smoothstep(0.,.15,vUv.y)*(1.-smoothstep(.78,1.,vUv.y));float threads=pow(.5+.5*sin(vUv.x*137.+sin(vUv.x*32.)*4.+uTime*.35),14.);float core=pow(edge,7.);float alpha=(edge*.13+threads*.45*edge+core*.48)*vertical*uStrength;vec3 color=mix(vec3(.13,.48,.72),vec3(.78,.96,1.),core);gl_FragColor=vec4(color,alpha);}',
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    ),
    beam = mesh(geo(new THREE.PlaneGeometry(19, 30)), beamMaterial, 0, 14, -0.9, gate);
  beam.castShadow = false;
  const mystery = createOriginsActor(assets, 'boss'),
    silhouette = mystery.object;
  gate.add(silhouette);
  silhouette.scale.setScalar(2.8);
  silhouette.position.set(0, 3, -1.1);
  silhouette.rotation.y = Math.PI;
  const shadowMat = mat(new THREE.MeshBasicMaterial({ color: '#020509' }));
  silhouette.traverse((o) => {
    if (o.isMesh) {
      o.material = shadowMat;
      o.castShadow = false;
    }
  });
  silhouette.visible = false;
  const barriers = [];
  for (const z of [18, 40, 65, 92]) {
    const group = new THREE.Group();
    group.position.z = z;
    root.add(group);
    const veil = mesh(
      geo(new THREE.PlaneGeometry(24.7, 3.2)),
      mat(
        new THREE.MeshBasicMaterial({
          color: BLUE,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
      0,
      1.6,
      0,
      group,
    );
    veil.castShadow = false;
    for (const y of [0.08, 1.15, 2.3, 3.2]) {
      const line = mesh(geo(new THREE.BoxGeometry(24.7, 0.016, 0.018)), energy, 0, y, 0, group);
      line.castShadow = false;
    }
    const lock = new THREE.Sprite(
      mat(
        new THREE.SpriteMaterial({
          map: glyph('broken'),
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        }),
      ),
    );
    lock.position.set(0, 2, 0);
    lock.scale.setScalar(1.5);
    group.add(lock);
    barriers.push({ z, group, veil });
  }
  const motesCount = 90,
    positions = new Float32Array(motesCount * 3);
  for (let i = 0; i < motesCount; i++) {
    positions[i * 3] = (random() - 0.5) * 30;
    positions[i * 3 + 1] = 0.2 + random() * 9;
    positions[i * 3 + 2] = random() * 125;
  }
  const dustGeo = geo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMat = mat(
      new THREE.PointsMaterial({
        size: 0.035,
        color: '#87b5d3',
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    ),
    dust = new THREE.Points(dustGeo, dustMat);
  root.add(dust);
  return {
    root,
    gate,
    objectViews,
    update(g, time, reduced = false) {
      for (const [id, view] of objectViews) {
        view.object.visible = !(view.hidden && !g.moved.has('loose-stone'));
        if (view.kind === 'stone' && g.moved.has(id)) view.object.position.x = -10.3;
        if (view.icon) {
          const active = g.activated.has(id) || g.opened.has(id);
          view.icon.material.color.set(active ? '#e3c387' : '#a6e2fc');
          view.icon.material.opacity = active ? 0.35 : 0.9;
          view.icon.position.y =
            1.6 + (reduced ? 0 : Math.sin(time * 1.5 + view.object.position.x) * 0.08);
        }
      }
      for (const barrier of barriers) {
        barrier.group.visible = g.barriers().includes(barrier.z);
        barrier.veil.material.opacity = 0.045 + (reduced ? 0 : Math.sin(time * 1.5) * 0.015);
      }
      for (const { item, mesh } of pickups) {
        mesh.visible = !g.picked.has(item.id);
        if (!reduced) {
          mesh.rotation.y = time * 0.7;
          mesh.position.y = 0.7 + Math.sin(time * 2 + item.x) * 0.12;
        }
      }
      for (const a of animations) a.object.position.y = -0.18 + Math.sin(time * 2) * 0.025;
      dust.position.x = reduced ? 0 : Math.sin(time * 0.13) * 2;
      const t = g.mode === 'gate' || g.won ? g.gateTime : 0;
      gateLines.rotation.z = t > 1.4 ? Math.min(0.28, (t - 1.4) * 0.08) : 0;
      beamMaterial.uniforms.uTime.value = time;
      beamMaterial.uniforms.uStrength.value = t > 2.8 ? Math.min(1, (t - 2.8) * 0.8) : 0;
      voidMat.opacity = t > 2.4 ? 0.8 : 0;
      for (const leaf of leaves)
        leaf.hinge.rotation.y = leaf.side * (t > 2.5 ? Math.min(1.3, (t - 2.5) * 0.52) : 0);
      seal.material.opacity = t > 2.8 ? Math.max(0, 1 - (t - 2.8)) : 0.7;
      silhouette.visible = t > 4.05 && t < 4.6;
      outer.material.emissive.set('#174c68');
      outer.material.emissiveIntensity = t > 0 ? Math.min(0.35, t * 0.09) : 0.025;
    },
    dispose() {
      root.traverse((o) => {
        if (o.isSprite) ownedGeometry.add(o.geometry);
      });
      mystery.dispose();
      root.removeFromParent();
      ownedGeometry.forEach((g) => g.dispose());
      ownedMaterial.forEach((m) => m.dispose());
      ownedTextures.forEach((t) => t.dispose());
    },
  };
}
