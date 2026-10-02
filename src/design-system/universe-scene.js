import * as THREE from 'three';
import { goldMasterTokens } from './tokens.js';

// A lightweight architectural preview, independent of the saved playable world.
// Shared geometries, capped pixel ratio, 30 fps, no textures or post-processing.
export function createUniversePreview(host, onLost) {
  const colors = goldMasterTokens.colors;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.tabIndex = -1;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.obsidian);
  scene.fog = new THREE.FogExp2(colors.obsidian, .015);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 220);
  const target = new THREE.Vector3(0, 3, 0), look = target.clone(), goal = new THREE.Vector3(32, 29, 44);
  camera.position.copy(goal);
  scene.add(new THREE.HemisphereLight(colors.champagneHighlight, colors.matrix, 1.6));
  const sun = new THREE.DirectionalLight(colors.champagneHighlight, 3.8); sun.position.set(12, 24, 8); scene.add(sun);
  const fill = new THREE.DirectionalLight(colors.champagneHighlight, 1.4); fill.position.set(-18, 14, 30); scene.add(fill);
  const blue = new THREE.PointLight(colors.matrix, 120, 60); blue.position.set(0, 10, -4); scene.add(blue);
  const metal = new THREE.MeshStandardMaterial({ color: colors.champagne, metalness: .22, roughness: .28 });
  const stone = new THREE.MeshStandardMaterial({ color: colors.carbon, metalness: .35, roughness: .65 });
  const light = new THREE.MeshBasicMaterial({ color: colors.matrix });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: colors.matrix, metalness: .68, roughness: .28, transparent: true, opacity: .3 });
  const box = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(1, 1, 1, 32);
  const ringGeometry = new THREE.TorusGeometry(5, .22, 8, 64, Math.PI * 1.77);
  const mesh = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.scale.set(sx, sy, sz); scene.add(object); return object;
  };
  mesh(cylinder, stone, 0, -.5, 0, 13, 1, 13);
  mesh(cylinder, metal, 0, .05, 0, 8, .12, 8);
  mesh(cylinder, stone, 0, .17, 0, 7.8, .2, 7.8);
  const ring = mesh(ringGeometry, metal, 0, 6.4, 0); ring.rotation.z = .38;
  const inner = mesh(ringGeometry, light, 0, 6.4, -.1, .93, .93, .93); inner.rotation.z = -.34;
  const water = mesh(cylinder, waterMaterial, 0, -.86, 0, 78, .06, 78);
  const realms = [];
  for (let index = 0; index < 8; index++) {
    const angle = index / 8 * Math.PI * 2, x = Math.sin(angle) * 24, z = Math.cos(angle) * 24;
    realms.push(new THREE.Vector3(x, 4, z));
    mesh(cylinder, stone, x, -.6, z, 6, 2.4, 6);
    mesh(cylinder, metal, x, .65, z, 6, .1, 6);
    const bridge = mesh(box, stone, x / 2, .1, z / 2, 2, .45, 14); bridge.rotation.y = angle;
    const stripe = mesh(box, light, x / 2, .35, z / 2, .05, .025, 14); stripe.rotation.y = angle;
    for (let building = 0; building < 5; building++) {
      const a = building / 5 * Math.PI * 2, height = 2.5 + ((index * 7 + building * 3) % 9) * .65;
      const bx = x + Math.cos(a) * 3.2, bz = z + Math.sin(a) * 3.2;
      mesh(box, stone, bx, height / 2 + .7, bz, 1.8, height, 1.6);
      mesh(box, metal, bx, height + .76, bz, 1.9, .12, 1.7);
      mesh(box, light, bx + .91, height / 2 + .7, bz, .035, height * .75, .25);
    }
    mesh(box, metal, x - 1.1, 3.2, z, .16, 5, .35);
    mesh(box, metal, x + 1.1, 3.2, z, .16, 5, .35);
    mesh(box, metal, x, 5.7, z, 2.4, .15, .35);
  }
  const people = new THREE.InstancedMesh(box, metal, 20); scene.add(people);
  const dummy = new THREE.Object3D();
  const positions = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) { positions[i * 3] = Math.sin(i * 91.7) * 45; positions[i * 3 + 1] = (i % 17) * 1.4; positions[i * 3 + 2] = Math.cos(i * 32.3) * 45; }
  const particlesGeometry = new THREE.BufferGeometry(); particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({ color: colors.champagne, size: .085, transparent: true, opacity: .45 });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial); scene.add(particles);
  const resize = new ResizeObserver(() => { const width = host.clientWidth, height = host.clientHeight; if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }); resize.observe(host);
  let raf = 0, paused = false, disposed = false, contextLost = false, last = 0, selected = -1;
  const frame = time => {
    if (disposed || paused) return;
    raf = requestAnimationFrame(frame);
    if (time - last < 1000 / 30) return;
    const dt = Math.min((time - last) / 1000, .05); last = time;
    const elapsed = time / 1000;
    camera.position.lerp(goal, 1 - Math.exp(-dt * 2.5)); look.lerp(target, 1 - Math.exp(-dt * 2.5)); camera.lookAt(look);
    ring.rotation.z = .38 + Math.sin(elapsed * .16) * .05;
    inner.rotation.z = -.34 + Math.sin(elapsed * .11) * .06;
    particles.rotation.y = elapsed * .005;
    waterMaterial.opacity = .26 + Math.sin(elapsed * .4) * .035;
    sun.intensity = 3.4 + Math.sin(elapsed * .035) * .45;
    for (let i = 0; i < 20; i++) {
      const angle = i / 20 * Math.PI * 2 + elapsed * .022, radius = 9.5 + (i % 3) * .55;
      dummy.position.set(Math.sin(angle) * radius, .68, Math.cos(angle) * radius); dummy.scale.set(.16, .62, .16); dummy.rotation.y = angle; dummy.updateMatrix(); people.setMatrixAt(i, dummy.matrix);
    }
    people.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };
  const lost = event => { event.preventDefault(); contextLost = true; paused = true; cancelAnimationFrame(raf); onLost?.(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  raf = requestAnimationFrame(frame);
  return {
    select(index) {
      selected = index;
      if (!realms[selected]) { target.set(0, 3, 0); goal.set(32, 29, 44); return; }
      target.copy(realms[selected]);
      const direction = realms[selected].clone().setY(0).normalize();
      goal.copy(target).addScaledVector(direction, 16); goal.y = 14;
    },
    pause(value) { if (paused === value || disposed || contextLost) return; paused = value; cancelAnimationFrame(raf); if (!paused) { last = performance.now(); raf = requestAnimationFrame(frame); } },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); resize.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      [box, cylinder, ringGeometry, particlesGeometry, metal, stone, light, waterMaterial, particlesMaterial].forEach(resource => resource.dispose());
      people.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
