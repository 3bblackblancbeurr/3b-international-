import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildingById, BUILDING_LIBRARY } from './city-data.js';

const GOLD = new THREE.Color('#d7b56d');
const BLUE = new THREE.Color('#2ac9ff');
const BLACK = new THREE.Color('#05070b');

function makeBuilding(item, entry, materials) {
  const group = new THREE.Group();
  const definition = buildingById(entry.buildingId);
  const x = entry.x * 4;
  const z = entry.z * 4;
  const height = 3.2 * definition.height;
  const width = 2.8 * definition.footprint[0];
  const depth = 2.8 * definition.footprint[1];
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.body.clone());
  body.position.y = height / 2;
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(width * .82, .16, depth * .82), materials.gold);
  cap.position.y = height + .12;
  group.add(cap);

  const stripCount = Math.max(2, Math.round(height / 2));
  for (let i = 1; i < stripCount; i += 1) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width + .03, .035, depth + .03), materials.blue);
    strip.position.y = i * height / stripCount;
    group.add(strip);
  }

  if (definition.category === 'nature') {
    body.scale.y = .12;
    body.position.y = .18;
    for (let i = 0; i < 5; i += 1) {
      const tree = new THREE.Mesh(new THREE.ConeGeometry(.38, 1.35, 8), materials.green);
      tree.position.set((i % 3 - 1) * .7, .85, (Math.floor(i / 3) - .5) * .8);
      group.add(tree);
    }
  }

  if (definition.rarity === 'unique' || definition.rarity === 'ultimate') {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(width * .32, .08, 8, 48), definition.rarity === 'unique' ? materials.white : materials.orange);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = height + .8;
    group.add(crown);
  }

  group.position.set(x, 0, z);
  group.userData = { id: item, definition };
  return group;
}

export default function NexusCityScene({ city = [], started = false, selectedBuilding = BUILDING_LIBRARY[0]?.id, onPlace }) {
  const canvasRef = useRef(null);
  const onPlaceRef = useRef(onPlace);
  const selectedRef = useRef(selectedBuilding);
  onPlaceRef.current = onPlace;
  selectedRef.current = selectedBuilding;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02050b');
    scene.fog = new THREE.FogExp2('#06111c', .012);
    const camera = new THREE.PerspectiveCamera(48, 1, .1, 350);
    camera.position.set(42, 36, 54);
    camera.lookAt(0, 4, 0);

    const ambient = new THREE.HemisphereLight('#7fdfff', '#120d09', 1.05);
    const key = new THREE.DirectionalLight('#ffe5b0', 3.2);
    key.position.set(24, 42, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
    key.shadow.camera.updateProjectionMatrix();
    const rim = new THREE.PointLight('#27c7ff', 35, 90, 2);
    rim.position.set(-28, 16, -22);
    scene.add(ambient, key, rim);

    const materials = {
      body: new THREE.MeshStandardMaterial({ color: BLACK, roughness: .4, metalness: .55 }),
      gold: new THREE.MeshStandardMaterial({ color: GOLD, roughness: .28, metalness: .82, emissive: '#3f2b0a', emissiveIntensity: .2 }),
      blue: new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: .9 }),
      road: new THREE.MeshStandardMaterial({ color: '#10151e', roughness: .72, metalness: .22 }),
      ground: new THREE.MeshStandardMaterial({ color: '#071019', roughness: .96, metalness: .04 }),
      green: new THREE.MeshStandardMaterial({ color: '#284c37', roughness: .8 }),
      white: new THREE.MeshBasicMaterial({ color: '#f7fbff' }),
      orange: new THREE.MeshBasicMaterial({ color: '#ff7540' }),
    };

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    for (let lane = -6; lane <= 6; lane += 3) {
      const roadX = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 96), materials.road);
      roadX.rotation.x = -Math.PI / 2;
      roadX.position.set(lane * 4, .015, 0);
      const roadZ = roadX.clone();
      roadZ.rotation.z = Math.PI / 2;
      roadZ.position.set(0, .017, lane * 4);
      scene.add(roadX, roadZ);
    }

    const grid = new THREE.GridHelper(96, 24, '#2ac9ff', '#173142');
    grid.position.y = .04;
    grid.material.transparent = true;
    grid.material.opacity = started ? .34 : .12;
    scene.add(grid);

    const nexus = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2 + i * .7, .11, 12, 96), i === 1 ? materials.blue : materials.gold);
      ring.rotation.set(Math.PI / 2 + i * .27, i * .42, i * .12);
      ring.position.y = 7.2;
      nexus.add(ring);
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 2), new THREE.MeshStandardMaterial({ color: '#132235', emissive: '#1ebeff', emissiveIntensity: 2, metalness: .6, roughness: .2 }));
    core.position.y = 7.2;
    nexus.add(core);
    nexus.position.set(0, 0, -18);
    scene.add(nexus);

    const previewCity = [
      { buildingId: 'tour-matrix', x: -4, z: -2 },
      { buildingId: 'hall-heritage', x: 3, z: -1 },
      { buildingId: 'maison-3b', x: -5, z: 4 },
      { buildingId: 'atelier-3b', x: 4, z: 4 },
      { buildingId: 'jardin-3b', x: 0, z: 3 },
      { buildingId: 'spire-champagne', x: 0, z: 0 },
    ];
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);
    const entries = city.length ? city : previewCity;
    entries.forEach((entry, index) => cityGroup.add(makeBuilding(index, entry, materials)));

    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(480 * 3);
    for (let i = 0; i < 480; i += 1) {
      positions[i * 3] = (Math.random() - .5) * 110;
      positions[i * 3 + 1] = 1 + Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - .5) * 110;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ color: '#2ac9ff', size: .08, transparent: true, opacity: .42 }));
    scene.add(particles);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const onPointer = event => {
      if (!started || !onPlaceRef.current) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const x = Math.max(-6, Math.min(6, Math.round(hit.x / 4)));
      const z = Math.max(-6, Math.min(6, Math.round(hit.z / 4)));
      onPlaceRef.current({ buildingId: selectedRef.current, x, z });
    };
    canvas.addEventListener('pointerup', onPointer);

    let frame;
    const clock = new THREE.Clock();
    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const render = () => {
      const t = clock.getElapsedTime();
      nexus.rotation.y = t * .16;
      core.rotation.x = t * .45;
      core.rotation.y = t * .62;
      particles.rotation.y = t * .008;
      if (!started) {
        camera.position.x = Math.cos(t * .05) * 54;
        camera.position.z = Math.sin(t * .05) * 54;
        camera.lookAt(0, 4.5, 0);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerup', onPointer);
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose?.();
        if (object.material) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(material => material.dispose?.());
        }
      });
      particlesGeo.dispose();
      renderer.dispose();
    };
  }, [city, started]);

  return <canvas ref={canvasRef} className="nexus-city-canvas" aria-label="Aperçu 3D de ta ville dans le Nexus" />;
}
