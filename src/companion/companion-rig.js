import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { STAR_POSITIONS, sanitizeConstellation } from './constellation.js';

// Physical material pigments belong to the character, independently of interface themes.
const PIGMENT = Object.freeze({ carbon: 0x14171c, textile: 0x202329, seam: 0x43464a, black: 0x05080b, gold: 0xd6bc82, lightGold: 0xf0ddaf, hood: 0xc6b697, lining: 0x897b66, ivory: 0xe5d5b5, blue: 0x3ba7ff });

function canvasTexture(draw, width = 128, height = width) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Disposes shared resources exactly once, including textures used by several materials. */
export function disposeCompanionResources(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((item) => {
    if (item.geometry) geometries.add(item.geometry);
    for (const material of item.material ? (Array.isArray(item.material) ? item.material : [item.material]) : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  return { geometries: geometries.size, materials: materials.size, textures: textures.size };
}

/** A fully jointed model; no sprite, downloaded mesh, or external texture is required. */
export function createCompanionRig() {
  const root = new THREE.Group();
  root.name = '3B articulated streetwear companion';
  root.position.y = 1.50;
  const geometryCache = new Map();
  const fabric = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = 'rgb(118,118,118)'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 3) {
      ctx.strokeStyle = i % 2 ? 'rgb(143,143,143)' : 'rgb(99,99,99)';
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i-w/2, h); ctx.stroke();
    }
  });
  if (fabric) { fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping; fabric.repeat.set(5, 5); }
  const standard = (color, roughness = .6, metalness = .1, other = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...other });
  const materials = {
    cloth: standard(PIGMENT.carbon, .76, .08, { bumpMap: fabric, bumpScale: .008 }),
    textile: standard(PIGMENT.textile, .90, .03, { bumpMap: fabric, bumpScale: .007 }),
    seam: standard(PIGMENT.seam, .70, .15),
    black: standard(PIGMENT.black, .38, .45),
    gold: standard(PIGMENT.gold, .27, .76),
    ivory: standard(PIGMENT.ivory, .42, .17),
    hood: standard(PIGMENT.hood, .88, .025, { bumpMap: fabric, bumpScale: .005, side: THREE.DoubleSide }),
    lining: standard(PIGMENT.lining, .93, .02),
    visor: new THREE.MeshPhysicalMaterial({ color: PIGMENT.black, metalness: .28, roughness: .07, clearcoat: 1, clearcoatRoughness: .06 }),
    glass: new THREE.MeshPhysicalMaterial({ color: PIGMENT.gold, transparent: true, opacity: .22, metalness: .30, roughness: .14, clearcoat: 1, depthWrite: false }),
    light: standard(PIGMENT.lightGold, .3, .15, { emissive: PIGMENT.gold, emissiveIntensity: 2.3 }),
    blue: standard(PIGMENT.blue, .25, .1, { emissive: PIGMENT.blue, emissiveIntensity: 1.6, transparent: true, opacity: .86, depthWrite: false }),
  };
  const geo = (key, make) => { if (!geometryCache.has(key)) geometryCache.set(key, make()); return geometryCache.get(key); };
  const mesh = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const item = new THREE.Mesh(geometry, material); item.position.set(x, y, z); parent.add(item); return item;
  };
  const box = (parent, w, h, d, radius, material, x = 0, y = 0, z = 0) => mesh(parent, geo(`box:${w}:${h}:${d}:${radius}`, () => new RoundedBoxGeometry(w, h, d, 2, radius)), material, x, y, z);
  const sphere = (parent, x, y, z, sx, sy, sz, material) => {
    const item = mesh(parent, geo('sphere', () => new THREE.SphereGeometry(1, 20, 14)), material, x, y, z); item.scale.set(sx, sy, sz); return item;
  };
  const cylinder = (parent, radius, length, material, x = 0, y = 0, z = 0) => mesh(parent, geo(`cylinder:${radius}:${length}`, () => new THREE.CylinderGeometry(radius, radius, length, 14)), material, x, y, z);
  const group = (parent, name, x = 0, y = 0, z = 0) => { const item = new THREE.Group(); item.name = name; item.position.set(x, y, z); parent.add(item); return item; };
  const curve = (parent, points, radius, material) => {
    const spline = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return mesh(parent, new THREE.TubeGeometry(spline, Math.max(8, points.length*4), radius, 5, false), material);
  };
  const plate = (parent, points, depth, material, z) => {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]); points.slice(1).forEach((p) => shape.lineTo(...p)); shape.closePath();
    const item = mesh(parent, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .015, bevelThickness: .012, bevelSegments: 2, steps: 1, curveSegments: 8 }), material, 0, 0, z);
    return item;
  };

  const torso = group(root, 'waist / jacket', 0, .12);
  box(torso, .65, .84, .36, .13, materials.black, 0, .43, 0);
  box(torso, .73, .15, .38, .06, materials.cloth, 0, -.01, .005);
  box(torso, .16, .105, .045, .017, materials.gold, .01, .012, .219);
  box(torso, .10, .063, .015, .008, materials.black, .01, .012, .249);
  box(torso, .14, .43, .045, .024, materials.textile, -.29, -.23, .20).rotation.z = -.10;
  box(torso, .115, .067, .055, .010, materials.gold, -.31, -.42, .20);
  for (const side of [-1, 1]) {
    box(torso, .30, .86, .36, .10, materials.cloth, side*.35, .43, -.012).rotation.z = -side*.065;
    plate(torso, [[side*.15, .88], [side*.46, .77], [side*.44, .01], [side*.23, -.10], [side*.16, .32], [side*.27, .67]], .085, materials.cloth, .12);
    plate(torso, [[side*.17, .84], [side*.33, .87], [side*.40, .61], [side*.18, .38], [side*.23, .64]], .038, materials.textile, .24);
    curve(torso, [[side*.19, .82, .29], [side*.27, .58, .30], [side*.23, .25, .30], [side*.26, -.06, .26]], .010, materials.gold);
    box(torso, .19, .035, .043, .008, materials.gold, side*.32, .17, .294).rotation.z = side*.55;
    curve(torso, [[side*.40, .61, .24], [side*.41, .36, .25], [side*.41, .08, .23]], .007, materials.seam);
  }
  // Chest chamber: actual transparent lens, inset gold bezel, and rotating faceted core.
  box(torso, .36, .39, .13, .073, materials.gold, 0, .43, .21);
  box(torso, .29, .32, .14, .055, materials.black, 0, .43, .24);
  const crystal = mesh(torso, new THREE.OctahedronGeometry(.095, 0), materials.light, 0, .44, .341);
  crystal.scale.y = 1.52;
  box(torso, .28, .31, .032, .040, materials.glass, 0, .43, .362);
  const chestPin = cylinder(torso, .021, .039, materials.gold, -.13, .26, .34); chestPin.rotation.x = Math.PI/2;
  const chestPin2 = chestPin.clone(); chestPin2.position.x = .13; torso.add(chestPin2);

  const necklace = group(torso, 'chain 3B');
  const linkGeo = new THREE.TorusGeometry(.028, .009, 5, 9);
  const links = new THREE.InstancedMesh(linkGeo, materials.gold, 19);
  const matrix = new THREE.Object3D();
  for (let i = 0; i < 19; i++) {
    const x = (i/18-.5)*.52;
    matrix.position.set(x, .77+Math.pow(x/.26, 2)*.15, .266-Math.pow(x/.26, 2)*.07);
    matrix.rotation.set(0, i%2 ? .86 : -.38, x*-2.2); matrix.scale.set(.78, 1, 1); matrix.updateMatrix(); links.setMatrixAt(i, matrix.matrix);
  }
  necklace.add(links);
  const wordmark = canvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.font = '900 93px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgb(240,221,175)'; ctx.fillText('3B', w/2, h/2+5);
  }, 192, 128);
  const pendantMaterial = new THREE.MeshStandardMaterial({ color: PIGMENT.gold, map: wordmark, transparent: true, metalness: .58, roughness: .30, side: THREE.DoubleSide, depthWrite: false });
  mesh(necklace, new THREE.PlaneGeometry(.23, .153), pendantMaterial, 0, .68, .335);
  cylinder(torso, .125, .19, materials.black, 0, 1.01, -.02);
  cylinder(torso, .137, .029, materials.gold, 0, 1.04, -.02);

  const head = group(torso, 'neck / hood / head', 0, 1.09, -.015);
  sphere(head, 0, .24, -.13, .48, .55, .36, materials.hood);
  sphere(head, 0, .22, .075, .361, .416, .28, materials.visor);
  for (const side of [-1, 1]) {
    const ear = cylinder(head, .11, .11, materials.gold, side*.354, .28, -.002); ear.rotation.z = Math.PI/2;
    const innerEar = cylinder(head, .075, .12, materials.black, side*.359, .28, -.002); innerEar.rotation.z = Math.PI/2;
  }
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(0, .82); hoodShape.bezierCurveTo(.34, .81, .49, .58, .50, .25); hoodShape.bezierCurveTo(.52, .04, .54, -.15, .58, -.25); hoodShape.lineTo(.37, -.29); hoodShape.lineTo(.29, -.11); hoodShape.quadraticCurveTo(0, -.29, -.29, -.11); hoodShape.lineTo(-.37, -.29); hoodShape.lineTo(-.58, -.25); hoodShape.bezierCurveTo(-.54, -.15, -.52, .04, -.50, .25); hoodShape.bezierCurveTo(-.49, .58, -.34, .81, 0, .82);
  const opening = new THREE.Path(); opening.moveTo(0, .68); opening.bezierCurveTo(-.28, .65, -.38, .48, -.38, .23); opening.bezierCurveTo(-.37, -.07, -.18, -.13, 0, -.14); opening.bezierCurveTo(.18, -.13, .37, -.07, .38, .23); opening.bezierCurveTo(.38, .48, .28, .65, 0, .68); hoodShape.holes.push(opening);
  mesh(head, new THREE.ExtrudeGeometry(hoodShape, { depth: .038, bevelEnabled: true, bevelSize: .028, bevelThickness: .028, bevelSegments: 3, curveSegments: 18 }), materials.hood, 0, 0, .11);
  curve(head, [[-.41, -.19, .19], [-.39, .27, .19], [-.27, .59, .19], [0, .73, .15], [.27, .59, .19], [.39, .27, .19], [.41, -.19, .19]], .009, materials.ivory);
  curve(head, [[-.01, .79, .1], [-.02, .77, -.09], [0, .66, -.36]], .006, materials.lining);
  plate(head, [[-.28, -.015], [-.19, -.17], [0, -.23], [.19, -.17], [.28, -.015], [.18, -.085], [0, -.13], [-.18, -.085]], .038, materials.ivory, .24);
  const eyeL = sphere(head, -.126, .272, .327, .066, .100, .014, materials.light);
  const eyeR = sphere(head, .126, .272, .327, .066, .100, .014, materials.light);
  eyeL.rotation.z = -.19; eyeR.rotation.z = .19;
  const browL = box(head, .106, .013, .014, .006, materials.gold, -.124, .411, .292);
  const browR = box(head, .106, .013, .014, .006, materials.gold, .124, .411, .292);
  const mouth = group(head, 'voice equalizer', 0, .060, .345);
  const mouthBars = [];
  for (let i = 0; i < 5; i++) mouthBars.push(box(mouth, .015, .042, .009, .004, materials.light, (i-2)*.025, 0, 0));
  sphere(head, -.19, .47, .243, .042, .023, .004, new THREE.MeshBasicMaterial({ color: PIGMENT.ivory, transparent: true, opacity: .30 }));

  const arms = {};
  const fingerJoints = [];
  for (const [label, side] of [['L', -1], ['R', 1]]) {
    const shoulder = group(torso, `${label} shoulder`, side*.525, .82, 0);
    sphere(shoulder, 0, -.015, 0, .17, .17, .18, materials.black);
    box(shoulder, .326, .49, .345, .12, materials.cloth, side*.026, -.233, -.005);
    box(shoulder, .22, .10, .055, .026, materials.textile, side*.058, -.30, .176).rotation.z = side*.14;
    curve(shoulder, [[side*.13, -.10, .12], [side*.16, -.27, .12], [side*.12, -.45, .1]], .007, materials.seam);
    const elbow = group(shoulder, `${label} elbow`, side*.025, -.50);
    sphere(elbow, 0, 0, 0, .11, .10, .11, materials.black);
    box(elbow, .286, .395, .303, .099, materials.cloth, 0, -.19, .009);
    for (let i = 0; i < 3; i++) curve(elbow, [[-.105, -.105-i*.075, .107], [0, -.14-i*.072, .156], [.10, -.11-i*.075, .12]], .006, materials.seam);
    cylinder(elbow, .132, .065, materials.textile, 0, -.40, .004);
    cylinder(elbow, .103, .048, materials.gold, 0, -.452, .006);
    const wrist = group(elbow, `${label} wrist`, 0, -.484, .008);
    box(wrist, .145, .17, .095, .028, materials.black, 0, -.075, .02);
    box(wrist, .132, .104, .028, .018, materials.gold, 0, -.055, .077);
    for (let i = 0; i < 4; i++) {
      const finger = group(wrist, `${label} finger ${i}`, (i-1.5)*.037, -.139, .02);
      const length = i === 0 || i === 3 ? .062 : .073;
      box(finger, .029, length, .033, .010, materials.gold, 0, -length*.5, .006);
      const distal = group(finger, `${label} fingertip ${i}`, 0, -length, .004);
      sphere(distal, 0, 0, 0, .016, .016, .016, materials.black);
      box(distal, .026, .053, .029, .010, materials.gold, 0, -.024, .008);
      fingerJoints.push({ finger, distal, index: i });
    }
    const thumb = box(wrist, .042, .102, .045, .014, materials.gold, side*.10, -.09, .01); thumb.rotation.z = side*.48;
    if (label === 'L') {
      const watch = cylinder(elbow, .094, .026, materials.gold, 0, -.359, .162); watch.rotation.x = Math.PI/2;
      const face = cylinder(elbow, .074, .030, materials.black, 0, -.359, .177); face.rotation.x = Math.PI/2;
      box(elbow, .006, .068, .006, .002, materials.ivory, -.01, -.34, .195).rotation.z = -.42;
      box(elbow, .048, .006, .006, .002, materials.gold, .014, -.365, .195);
    } else {
      box(shoulder, .285, .286, .048, .048, materials.gold, 0, -.11, .177);
      box(shoulder, .245, .243, .024, .037, materials.visor, 0, -.11, .208);
    }
    arms[label] = { shoulder, elbow, wrist };
  }

  const starNodes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), materials.light, 8);
  const constellationGeo = new THREE.BufferGeometry();
  constellationGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8*2*3), 3));
  const constellationLines = new THREE.LineSegments(constellationGeo, new THREE.LineBasicMaterial({ color: PIGMENT.gold, transparent: true, opacity: .8 }));
  arms.R.shoulder.add(starNodes, constellationLines);
  const starPoint = (index) => [ (STAR_POSITIONS[index][0]-50)*.002, -.11+(50-STAR_POSITIONS[index][1])*.002, .232 ];
  function setBond(value) {
    const selection = sanitizeConstellation(value);
    const nodes = selection.length ? selection : [0, 1, 3, 5, 6];
    for (let i = 0; i < 8; i++) {
      matrix.position.set(...starPoint(i)); matrix.rotation.set(0, 0, 0); matrix.scale.setScalar(nodes.includes(i) ? .008 : .0035); matrix.updateMatrix(); starNodes.setMatrixAt(i, matrix.matrix);
    }
    starNodes.instanceMatrix.needsUpdate = true;
    const path = nodes.length === 8 ? [...nodes, nodes[0]] : nodes;
    const positions = constellationGeo.attributes.position;
    for (let i = 0; i < path.length-1; i++) { positions.setXYZ(i*2, ...starPoint(path[i])); positions.setXYZ(i*2+1, ...starPoint(path[i+1])); }
    constellationGeo.setDrawRange(0, Math.max(0, path.length-1)*2); positions.needsUpdate = true;
  }
  setBond([]);

  const legs = {};
  for (const [label, side] of [['L', -1], ['R', 1]]) {
    const hip = group(root, `${label} hip`, side*.237, -.035, .01);
    box(hip, .423, .612, .409, .115, materials.cloth, side*.012, -.265, 0);
    const pocket = box(hip, .215, .28, .061, .026, materials.textile, side*.132, -.27, .169); pocket.rotation.z = -side*.08;
    box(hip, .221, .067, .074, .023, materials.cloth, side*.132, -.162, .178).rotation.z = -side*.08;
    box(hip, .042, .21, .019, .005, materials.black, side*.177, -.36, .213);
    box(hip, .050, .039, .025, .007, materials.gold, side*.174, -.438, .215);
    curve(hip, [[side*.18, -.02, .05], [side*.205, -.27, .02], [side*.169, -.55, .015]], .007, materials.seam);
    const knee = group(hip, `${label} knee`, 0, -.615, 0);
    sphere(knee, 0, 0, 0, .115, .10, .12, materials.black);
    box(knee, .335, .55, .35, .109, materials.cloth, 0, -.237, 0);
    box(knee, .243, .145, .025, .028, materials.textile, 0, -.06, .178).rotation.z = side*.08;
    curve(knee, [[-.13, -.34, .10], [0, -.36, .18], [.13, -.32, .10]], .009, materials.seam);
    cylinder(knee, .137, .070, materials.textile, 0, -.50, 0);
    const ankle = group(knee, `${label} ankle / sneaker`, 0, -.535, .025);
    cylinder(ankle, .108, .13, materials.gold, 0, -.035, 0);
    box(ankle, .381, .203, .571, .088, materials.black, 0, -.13, .125);
    box(ankle, .412, .109, .658, .041, materials.ivory, 0, -.245, .144);
    box(ankle, .421, .042, .67, .018, materials.black, 0, -.292, .144);
    box(ankle, .358, .088, .198, .036, materials.ivory, 0, -.146, .366);
    box(ankle, .223, .209, .173, .029, materials.textile, 0, -.015, .05).rotation.x = -.30;
    box(ankle, .104, .084, .034, .014, materials.ivory, 0, .058, .15).rotation.x = -.15;
    for (let i = 0; i < 3; i++) box(ankle, .315, .029, .047, .011, materials.ivory, 0, -.056-i*.029, .055+i*.10).rotation.z = side*.075;
    plate(ankle, [[side*.191, -.05], [side*.202, -.13], [side*.207, -.23], [side*.10, -.20]], .27, materials.gold, -.092);
    legs[label] = { hip, knee, ankle };
  }

  const object = group(arms.R.wrist, 'pocket crystal', 0, -.21, .14);
  const objectCrystal = mesh(object, new THREE.OctahedronGeometry(.13, 0), materials.light, 0, -.075, .025); objectCrystal.scale.y = 1.4;
  const objectRing = mesh(object, new THREE.TorusGeometry(.17, .008, 5, 32), materials.gold, 0, -.075, .025); objectRing.rotation.x = .45;
  const hologram = group(arms.L.wrist, 'palm hologram', 0, -.18, .20);
  const holoGlobe = mesh(hologram, new THREE.IcosahedronGeometry(.18, 1), new THREE.MeshBasicMaterial({ color: PIGMENT.blue, wireframe: true, transparent: true, opacity: .82, depthWrite: false }), 0, -.07, .10);
  const holoRing = mesh(hologram, new THREE.TorusGeometry(.255, .006, 4, 40), materials.blue, 0, -.07, .10); holoRing.rotation.x = .8;
  const holoRing2 = holoRing.clone(); holoRing2.rotation.y = 1.15; hologram.add(holoRing2);

  function applyPose(pose, time = 0) {
    root.position.set(pose.rootX, 1.50+pose.rootY, 0);
    root.rotation.set(pose.rootPitch, pose.rootYaw, pose.rootZ);
    torso.rotation.set(pose.torsoX, pose.torsoY, pose.torsoZ);
    head.rotation.set(pose.headX, pose.headY, pose.headZ);
    for (const label of ['L', 'R']) {
      arms[label].shoulder.rotation.set(pose[`shoulder${label}X`], pose[`shoulder${label}Y`], pose[`shoulder${label}Z`]);
      arms[label].elbow.rotation.set(pose[`elbow${label}`], 0, pose[`elbow${label}Z`]);
      arms[label].wrist.rotation.set(pose[`wrist${label}X`], 0, pose[`wrist${label}Z`]);
      legs[label].hip.rotation.set(pose[`hip${label}X`], 0, pose[`hip${label}Z`]);
      legs[label].knee.rotation.x = pose[`knee${label}`];
      legs[label].ankle.rotation.x = pose[`ankle${label}`];
    }
    eyeL.scale.y = .100*pose.eyeL; eyeR.scale.y = .100*pose.eyeR;
    browL.rotation.z = pose.browL; browR.rotation.z = pose.browR;
    mouthBars.forEach((bar, index) => { bar.scale.y = Math.max(.13, pose.mouth*(.45+Math.abs(Math.sin(time*15+index*1.4))*.75)); });
    fingerJoints.forEach(({ finger, distal, index }) => { finger.rotation.x = -.07-pose.fingers*(.6+index*.08); distal.rotation.x = -pose.fingers*.65; });
    materials.light.emissiveIntensity = 1.7*pose.glow;
    crystal.rotation.y = time*.65; crystal.rotation.z = Math.sin(time*.7)*.12;
    necklace.rotation.z = -pose.torsoZ*.45;
    object.visible = pose.object > .005; object.scale.setScalar(Math.max(.001, pose.object)); objectCrystal.rotation.y = pose.propSpin; objectRing.rotation.z = -pose.propSpin*.65;
    hologram.visible = pose.hologram > .005; hologram.scale.setScalar(Math.max(.001, pose.hologram)); holoGlobe.rotation.y = pose.propSpin; holoRing.rotation.z = -pose.propSpin; holoRing2.rotation.z = pose.propSpin;
  }
  let disposed = false;
  return { root, head, torso, arms, legs, applyPose, setBond, dispose() { if (disposed) return; disposed = true; return disposeCompanionResources(root); } };
}

export function frameCompanionCamera(camera, pose, aspect) {
  const halfHeight = 2.055*pose.cameraScale;
  camera.left = -halfHeight*aspect; camera.right = halfHeight*aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
  camera.position.set(0, 2.05+pose.cameraLift, 8);
  camera.lookAt(0, 1.86+pose.cameraLift, 0); camera.updateProjectionMatrix();
}

export function createCompanionRenderer(canvas, { width = 118, height = 163, dpr = 1.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power', depth: true, stencil: false });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.30;
  const scene = new THREE.Scene();
  const rig = createCompanionRig();
  scene.add(rig.root);
  const camera = new THREE.OrthographicCamera(-1, 1, 2, -2, .1, 25);
  camera.position.set(0, 2.05, 8);
  camera.lookAt(0, 1.86, 0);
  scene.add(new THREE.HemisphereLight(0xd7e5ff, 0x706252, 2.05));
  const key = new THREE.DirectionalLight(0xffe7c5, 3.8); key.position.set(-3, 5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb2d4ff, 2.6); fill.position.set(3, 3, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffce86, 4.6); rim.position.set(0, 5, -3); scene.add(rim);
  let pmrem = null; let environment = null;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .05, .1, 100);
    scene.environment = environment.texture;
    scene.environmentIntensity = .72;
    room.dispose();
  } catch { /* Directional studio lighting still works without an environment map. */ }
  finally { pmrem?.dispose(); }
  const shadowTexture = canvasTexture((ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w*.48);
    gradient.addColorStop(0, 'rgba(0,0,0,.40)'); gradient.addColorStop(.45, 'rgba(0,0,0,.20)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.05), new THREE.MeshBasicMaterial({ map: shadowTexture, color: 0x000000, transparent: true, depthWrite: false, opacity: .8 }));
  shadow.rotation.x = -Math.PI/2; shadow.position.set(0, .014, .08); scene.add(shadow);
  let aspect = width/height;
  let disposed = false;
  return {
    rig,
    renderer,
    resize(nextWidth, nextHeight, pixelRatio = dpr) {
      if (disposed) return;
      aspect = nextWidth/nextHeight;
      renderer.setPixelRatio(pixelRatio); renderer.setSize(nextWidth, nextHeight, false);
    },
    render(pose, time) {
      if (disposed) return null;
      rig.applyPose(pose, time);
      frameCompanionCamera(camera, pose, aspect);
      shadow.material.opacity = .72*Math.max(.1, 1-Math.max(0, pose.rootY)*1.8);
      renderer.render(scene, camera);
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
    },
    dispose({ contextLost = false } = {}) {
      if (disposed) return;
      disposed = true;
      rig.dispose();
      shadow.geometry.dispose(); shadow.material.dispose(); shadowTexture?.dispose();
      scene.environment = null; environment?.dispose();
      renderer.renderLists.dispose(); renderer.dispose();
      if (!contextLost) renderer.forceContextLoss();
      scene.clear();
    },
  };
}
