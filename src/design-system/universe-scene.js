import * as THREE from 'three';
import { goldMasterTokens } from './tokens.js';
import { buildUniverseArchitecture } from './universe-architecture.js';

const waterVertex = 'uniform float uTime; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.23+uTime*.5)*cos(p.y*.19+uTime*.35)*.12;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}';
const waterFragment = 'uniform float uTime;uniform vec3 uDeep;uniform vec3 uLight;varying vec2 vUv;void main(){vec2 p=vUv*400.;float r=sin(p.y*3.+sin(p.x*.38+uTime*.3)+sin(p.x*.83-uTime*.2));float g=pow(1.-abs(r),18.)*(.5+.5*sin(p.x*.24+uTime*.1));gl_FragColor=vec4(mix(uDeep,uLight,.035+g*.1),1.);}';
const fallFragment = 'uniform float uTime;uniform vec3 uLight;varying vec2 vUv;void main(){float edge=smoothstep(0.,.1,vUv.x)*smoothstep(0.,.1,1.-vUv.x);float s=.42+.22*sin(vUv.x*95.+sin(vUv.y*18.+uTime*3.));float f=.7+.3*sin(vUv.y*45.+uTime*7.+vUv.x*18.);gl_FragColor=vec4(uLight,edge*s*f*smoothstep(0.,.13,vUv.y));}';

export function createUniversePreview(host, onLost) {
  const c = goldMasterTokens.colors;
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.domElement.tabIndex = -1; host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const sky = new THREE.Color(c.carbon).lerp(new THREE.Color(c.matrix), .025);
  scene.background = sky; scene.fog = new THREE.FogExp2(sky, .014);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 240);
  const target = new THREE.Vector3(0, 3, 0), look = target.clone(), goal = new THREE.Vector3(40, 34, 55);
  camera.position.copy(goal);
  scene.add(new THREE.HemisphereLight(c.text, c.matrix, .9));
  const sun = new THREE.DirectionalLight(c.champagneHighlight, 4); sun.position.set(18, 35, 8); scene.add(sun);
  const fill = new THREE.DirectionalLight(c.matrix, 1); fill.position.set(-20, 12, -20); scene.add(fill);
  const architecture = buildUniverseArchitecture(); scene.add(architecture.root);
  let raf = 0, paused = false, disposed = false, contextLost = false, last = 0, elapsed = 0;
  const textures = [];
  // Existing CC0 material surfaces, no third-party network dependency.
  const loader = new THREE.TextureLoader();
  for (const [property, filename] of [['map', 'plastered_wall_02_Diffuse.jpg'], ['normalMap', 'plastered_wall_02_nor_gl.jpg'], ['roughnessMap', 'plastered_wall_02_Rough.jpg']]) {
    const texture = loader.load('/world/paris/textures/' + filename, loaded => {
      if (disposed) { loaded.dispose(); return; }
      loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping; loaded.repeat.set(2, 2); loaded.anisotropy = 2;
      if (property === 'map') loaded.colorSpace = THREE.SRGBColorSpace;
      for (const name of ['stone', 'ivory']) { architecture.materials[name][property] = loaded; architecture.materials[name].normalScale.set(.22, .22); architecture.materials[name].needsUpdate = true; }
    }, undefined, () => { /* Untextured surfaces remain available offline. */ });
    textures.push(texture);
  }
  const timeUniform = { value: 0 };
  const waterMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: timeUniform, uDeep: { value: new THREE.Color(c.carbon).lerp(new THREE.Color(c.matrix), .06) }, uLight: { value: new THREE.Color(c.matrix) } }, vertexShader: waterVertex, fragmentShader: waterFragment });
  const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 36, 36);
  const water = new THREE.Mesh(waterGeometry, waterMaterial); water.rotation.x = -Math.PI / 2; water.position.y = -8.1; scene.add(water);
  const fallMaterial = new THREE.ShaderMaterial({ uniforms: { uTime: timeUniform, uLight: { value: new THREE.Color(c.text).lerp(new THREE.Color(c.matrix), .25) } }, vertexShader: waterVertex, fragmentShader: fallFragment, side: THREE.DoubleSide, transparent: true, depthWrite: false });
  const fallGeometry = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 4; i++) {
    const angle = (i + .5) * Math.PI / 2;
    const fall = new THREE.Mesh(fallGeometry, fallMaterial); fall.position.set(Math.sin(angle) * 16.7, -4, Math.cos(angle) * 16.7); fall.rotation.y = angle; fall.scale.set(2.6, 8.1, 1); scene.add(fall);
  }
  const bodyGeometry = new THREE.CapsuleGeometry(.11, .28, 2, 6), headGeometry = new THREE.SphereGeometry(.095, 6, 4);
  const bodies = new THREE.InstancedMesh(bodyGeometry, architecture.materials.roof, 48), heads = new THREE.InstancedMesh(headGeometry, architecture.materials.clay, 48);
  scene.add(bodies, heads); bodies.frustumCulled = false; heads.frustumCulled = false;
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage); heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const positions = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) { positions[i * 3] = Math.sin(i * 91.7) * 45; positions[i * 3 + 1] = (i % 17) * .9; positions[i * 3 + 2] = Math.cos(i * 32.3) * 45; }
  const mistGeometry = new THREE.BufferGeometry(); mistGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mistMaterial = new THREE.PointsMaterial({ color: c.champagne, size: .07, transparent: true, opacity: .35, depthWrite: false });
  const mist = new THREE.Points(mistGeometry, mistMaterial); scene.add(mist);
  const resize = new ResizeObserver(() => { const width = host.clientWidth, height = host.clientHeight; if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }); resize.observe(host);
  const frame = time => {
    if (disposed || paused) return;
    raf = requestAnimationFrame(frame);
    if (time - last < 1000 / 30) return;
    const dt = Math.min((time - last) / 1000, .05); last = time; elapsed += dt; timeUniform.value = elapsed;
    camera.position.lerp(goal, 1 - Math.exp(-dt * 2.4)); look.lerp(target, 1 - Math.exp(-dt * 2.4)); camera.lookAt(look);
    sun.intensity = 2.3 + Math.sin(elapsed * .035) * .3;
    architecture.materials.energy.emissiveIntensity = 1.45 + Math.sin(elapsed * .6) * .12; mist.rotation.y = elapsed * .003;
    for (let i = 0; i < 48; i++) {
      const angle = i / 48 * Math.PI * 2 + elapsed * (i % 2 ? .024 : -.021), radius = 9.1 + (i % 5) * 1.1;
      dummy.position.set(Math.sin(angle) * radius, .36 + Math.abs(Math.sin(elapsed * 4 + i)) * .025, Math.cos(angle) * radius);
      dummy.rotation.set(0, angle, 0); dummy.scale.setScalar(.9 + (i % 3) * .06); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y += .31; dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
    renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
  };
  const lost = event => { event.preventDefault(); contextLost = true; paused = true; cancelAnimationFrame(raf); onLost?.(); };
  renderer.domElement.addEventListener('webglcontextlost', lost); raf = requestAnimationFrame(frame);
  return {
    select(index) {
      if (!architecture.anchors[index]) { target.set(0, 3, 0); goal.set(40, 34, 55); return; }
      target.copy(architecture.anchors[index]);
      const outward = target.clone().setY(0).normalize(), side = new THREE.Vector3(outward.z, 0, -outward.x);
      goal.copy(target).addScaledVector(outward, 13).addScaledVector(side, 9); goal.y = 12;
    },
    pause(value) { if (paused === value || disposed || contextLost) return; paused = value; cancelAnimationFrame(raf); if (!paused) { last = performance.now(); raf = requestAnimationFrame(frame); } },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf); resize.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      architecture.dispose(); textures.forEach(texture => texture.dispose());
      [waterGeometry, waterMaterial, fallGeometry, fallMaterial, bodyGeometry, headGeometry, mistGeometry, mistMaterial].forEach(resource => resource.dispose());
      bodies.dispose(); heads.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
