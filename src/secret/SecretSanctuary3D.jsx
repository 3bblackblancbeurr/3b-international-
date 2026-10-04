import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,.95)");
  gradient.addColorStop(.16, "rgba(255,255,255,.38)");
  gradient.addColorStop(.48, "rgba(255,255,255,.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function damp(current, target, speed, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
}

export default function SecretSanctuary3D({
  stage,
  config,
  rings,
  archiveDraft,
  chamberNumber,
  chamberValue,
  showSequence,
  onCountrySelect,
  onRingStep,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const countryHandlerRef = useRef(onCountrySelect);
  const ringHandlerRef = useRef(onRingStep);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    stateRef.current = {
      stage,
      rings,
      archiveDraft,
      chamberNumber,
      chamberValue,
      showSequence,
    };
    countryHandlerRef.current = onCountrySelect;
    ringHandlerRef.current = onRingStep;
  }, [stage, rings, archiveDraft, chamberNumber, chamberValue, showSequence, onCountrySelect, onRingStep]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof window === "undefined") return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setUnavailable(true);
      return undefined;
    }

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const pixelRatioCap = window.innerWidth <= 700 ? 1.35 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "ps-v2-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010407, 0.065);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
    scene.environment = environmentTarget.texture;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 0.55, 8.8);

    const signalColor = new THREE.Color(config?.signalColor?.hex || "#78ced8");
    const gold = new THREE.Color("#c9a85e");
    const paleGold = new THREE.Color("#ead59a");
    const cyan = new THREE.Color("#88dbe4");
    const blackMetal = new THREE.Color("#04090d");

    const ambient = new THREE.HemisphereLight(0x354e58, 0x010203, 0.24);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(signalColor, 8.5, 17, 2.15);
    keyLight.position.set(0.35, 1.45, 3.15);
    scene.add(keyLight);

    const goldLight = new THREE.PointLight(gold, 5.4, 15, 2.15);
    goldLight.position.set(-4.2, 1.65, 1.15);
    scene.add(goldLight);

    const rimLight = new THREE.DirectionalLight(0xa7cbd1, 0.78);
    rimLight.position.set(4.8, 5.4, -4.5);
    scene.add(rimLight);

    const lowFill = new THREE.PointLight(0x24353d, 2.4, 13, 2.2);
    lowFill.position.set(3.2, -1.4, 2.2);
    scene.add(lowFill);

    const sanctuary = new THREE.Group();
    sanctuary.position.y = 0.08;
    scene.add(sanctuary);

    const architecture = new THREE.Group();
    sanctuary.add(architecture);

    const pillarGeometry = new THREE.BoxGeometry(0.34, 1, 0.48);
    const pillarMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x030608,
      metalness: 0.88,
      roughness: 0.28,
      clearcoat: 0.32,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.48,
    });
    for (let index = 0; index < 15; index += 1) {
      const angle = THREE.MathUtils.degToRad(-112 + index * 16);
      const radius = 6.1 + Math.sin(index * 1.7) * 0.28;
      const height = 3.3 + (index % 4) * 0.54;
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.scale.y = height;
      pillar.position.set(Math.sin(angle) * radius, -0.5 + height * 0.5, -2.6 + Math.cos(angle) * 1.25);
      pillar.rotation.y = -angle;
      architecture.add(pillar);
    }

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.25, 0.22, 96),
      new THREE.MeshPhysicalMaterial({
        color: 0x03080b,
        metalness: 0.9,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.075,
        envMapIntensity: 0.72,
      }),
    );
    floor.position.set(0, -2.16, 0);
    sanctuary.add(floor);

    const floorInlay = new THREE.Mesh(
      new THREE.RingGeometry(2.05, 5.9, 96),
      new THREE.MeshBasicMaterial({
        color: signalColor,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    floorInlay.rotation.x = -Math.PI / 2;
    floorInlay.position.y = -2.035;
    sanctuary.add(floorInlay);

    const glowTexture = makeGlowTexture();
    const floorGlow = glowTexture
      ? new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture,
          color: signalColor,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }))
      : null;
    if (floorGlow) {
      floorGlow.scale.set(8.5, 3.1, 1);
      floorGlow.position.set(0, -1.55, 0.2);
      sanctuary.add(floorGlow);
    }

    const ringGroup = new THREE.Group();
    ringGroup.position.set(0, 0.08, 0);
    sanctuary.add(ringGroup);

    const ringMeshes = [];
    [2.18, 2.66, 3.14].forEach((radius, index) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: index === 1 ? gold : blackMetal,
        emissive: index === 1 ? gold : signalColor,
        emissiveIntensity: index === 1 ? 0.085 : 0.13,
        metalness: 0.96,
        roughness: index === 1 ? 0.13 : 0.11,
        clearcoat: 1,
        clearcoatRoughness: 0.065,
        envMapIntensity: index === 1 ? 1.05 : 0.82,
        iridescence: index === 1 ? 0.035 : 0.07,
        iridescenceIOR: 1.32,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055 + index * 0.012, 18, 144), material);
      ring.rotation.set(index === 0 ? 0.2 : -0.16, index === 2 ? 0.24 : -0.08, index * 0.36);
      ring.userData.ringIndex = index;
      ringMeshes.push(ring);
      ringGroup.add(ring);
    });

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x041017,
      emissive: signalColor,
      emissiveIntensity: 0.72,
      metalness: 0.52,
      roughness: 0.085,
      transparent: true,
      opacity: 0.94,
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      envMapIntensity: 0.95,
      iridescence: 0.12,
      iridescenceIOR: 1.28,
      transmission: 0.08,
      thickness: 0.42,
      ior: 1.34,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.88, 4), coreMaterial);
    sanctuary.add(core);

    const coreShellMaterial = new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.055,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.16, 2), coreShellMaterial);
    sanctuary.add(coreShell);

    const coreGlow = glowTexture
      ? new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture,
          color: signalColor,
          transparent: true,
          opacity: 0.26,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }))
      : null;
    if (coreGlow) {
      coreGlow.scale.set(4.2, 4.2, 1);
      sanctuary.add(coreGlow);
    }

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: signalColor,
      transparent: true,
      opacity: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.32, 8.5, 18, 1, true), beamMaterial);
    beam.position.y = 0.85;
    sanctuary.add(beam);

    const nodeMeshes = [];
    const nodeGroup = new THREE.Group();
    sanctuary.add(nodeGroup);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
      const radius = 4.24;
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x071116,
        emissive: index % 2 ? gold : signalColor,
        emissiveIntensity: 0.24,
        metalness: 0.86,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        envMapIntensity: 0.78,
      });
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 2), material);
      node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.58, 0.05 + Math.sin(angle) * 0.3);
      node.rotation.z = angle;
      node.userData.countryIndex = index;
      nodeMeshes.push(node);
      nodeGroup.add(node);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.026, 0.92, 8),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? gold : signalColor,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
        }),
      );
      stem.position.copy(node.position);
      stem.position.y -= 0.46;
      nodeGroup.add(stem);
    }

    const particleCount = 260;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const seed = index * 12.9898;
      const pseudoA = Math.abs(Math.sin(seed) * 43758.5453) % 1;
      const pseudoB = Math.abs(Math.sin(seed + 21.17) * 17583.12) % 1;
      const pseudoC = Math.abs(Math.sin(seed + 51.73) * 31245.88) % 1;
      positions[index * 3] = (pseudoA - 0.5) * 14;
      positions[index * 3 + 1] = (pseudoB - 0.5) * 8;
      positions[index * 3 + 2] = -3 + pseudoC * 7;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xb8d8da,
        size: 0.021,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(particles);

    const guardianMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      color: 0xc0ccca,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.NormalBlending,
    });
    const guardian = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 6.8), guardianMaterial);
    guardian.position.set(-0.25, 0.35, -3.45);
    guardian.scale.set(1, 1, 1);
    scene.add(guardian);

    const loader = new THREE.TextureLoader();
    loader.load(
      "/games/forbidden-guardian.webp",
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        guardianMaterial.map = texture;
        guardianMaterial.needsUpdate = true;
      },
      undefined,
      () => {},
    );

    const transmissionGroup = new THREE.Group();
    transmissionGroup.visible = false;
    sanctuary.add(transmissionGroup);
    const transmissionMaterials = [];
    for (let index = 0; index < 4; index += 1) {
      const material = new THREE.MeshPhysicalMaterial({
        color: index % 2 ? paleGold : signalColor,
        emissive: index % 2 ? gold : signalColor,
        emissiveIntensity: 0.42,
        metalness: 0.68,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.055,
        envMapIntensity: 0.78,
        transparent: true,
        opacity: 0,
      });
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.36, 1), material);
      shard.position.set((index - 1.5) * 1.25, 0.25 + (index % 2) * 0.28, 0.4);
      shard.rotation.set(index * 0.4, index * 0.7, index * 0.25);
      transmissionMaterials.push(material);
      transmissionGroup.add(shard);
    }

    const archiveGroup = new THREE.Group();
    archiveGroup.visible = false;
    sanctuary.add(archiveGroup);
    const archivePads = [];
    [
      [-2.25, 1.05],
      [2.25, 1.05],
      [-2.25, -1.05],
      [2.25, -1.05],
    ].forEach(([x, y], index) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x061016,
        emissive: index % 2 ? gold : signalColor,
        emissiveIntensity: 0.12,
        metalness: 0.9,
        roughness: 0.11,
        clearcoat: 1,
        clearcoatRoughness: 0.065,
        envMapIntensity: 0.72,
        transparent: true,
        opacity: 0,
      });
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.14, 48), material);
      pad.rotation.x = Math.PI / 2;
      pad.position.set(x, y, 0.48);
      archivePads.push(pad);
      archiveGroup.add(pad);
    });

    const chamberGroup = new THREE.Group();
    chamberGroup.visible = false;
    sanctuary.add(chamberGroup);
    const chamberDialMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050d12,
      emissive: signalColor,
      emissiveIntensity: 0.13,
      metalness: 0.94,
      roughness: 0.105,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.82,
      transparent: true,
      opacity: 0,
    });
    const chamberDial = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.09, 16, 96), chamberDialMaterial);
    chamberGroup.add(chamberDial);
    const needleGroup = new THREE.Group();
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.1, 0.08),
      new THREE.MeshPhysicalMaterial({
        color: paleGold,
        emissive: gold,
        emissiveIntensity: 0.38,
        metalness: 0.94,
        roughness: 0.085,
        clearcoat: 1,
        clearcoatRoughness: 0.055,
        envMapIntensity: 0.9,
      }),
    );
    needle.position.y = 0.95;
    needleGroup.add(needle);
    chamberGroup.add(needleGroup);

    const sealGroup = new THREE.Group();
    sealGroup.visible = false;
    sanctuary.add(sealGroup);
    const sealMaterials = [];
    for (let index = 0; index < 3; index += 1) {
      const material = new THREE.MeshPhysicalMaterial({
        color: index === 1 ? paleGold : signalColor,
        emissive: index === 1 ? gold : signalColor,
        emissiveIntensity: 0.28,
        metalness: 0.82,
        roughness: 0.075,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 0.82,
        iridescence: 0.05,
        iridescenceIOR: 1.3,
        transparent: true,
        opacity: 0,
      });
      const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 1), material);
      shard.position.set((index - 1) * 1.35, 0.12 + Math.abs(index - 1) * 0.38, 0.5);
      sealMaterials.push(material);
      sealGroup.add(shard);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2(0, 0);
    const activeRing = { index: null, x: 0 };

    function pointerToNdc(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      return rect;
    }

    function pick(event, objects) {
      pointerToNdc(event);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(objects, false)[0]?.object || null;
    }

    function handlePointerDown(event) {
      const current = stateRef.current;
      if (current.stage === 1) {
        const node = pick(event, nodeMeshes);
        if (node && typeof countryHandlerRef.current === "function") {
          countryHandlerRef.current(node.userData.countryIndex);
          return;
        }
      }
      if (current.stage === 4) {
        const ring = pick(event, ringMeshes);
        if (ring) {
          activeRing.index = ring.userData.ringIndex;
          activeRing.x = event.clientX;
          renderer.domElement.setPointerCapture?.(event.pointerId);
        }
      }
    }

    function handlePointerMove(event) {
      const rect = pointerToNdc(event);
      pointerTarget.x = THREE.MathUtils.clamp((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5, -0.5, 0.5);
      pointerTarget.y = THREE.MathUtils.clamp((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5, -0.5, 0.5);
    }

    function handlePointerUp(event) {
      if (activeRing.index !== null) {
        const delta = event.clientX - activeRing.x;
        if (Math.abs(delta) >= 14 && typeof ringHandlerRef.current === "function") {
          ringHandlerRef.current(activeRing.index, delta > 0 ? 1 : -1);
        }
        activeRing.index = null;
        renderer.domElement.releasePointerCapture?.(event.pointerId);
      }
    }

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    function resize() {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;

    const cameraTargets = [
      [0, 0.45, 9.2],
      [0, 0.25, 8.1],
      [-0.65, 0.35, 7.7],
      [0, 0.18, 7.1],
      [0, 0.06, 6.55],
      [0, 0.12, 7.1],
      [0, 0.06, 6.8],
      [0, 0.18, 6.9],
      [0, 0.2, 6.25],
    ];

    function renderFrame() {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const current = stateRef.current;
      const currentStage = Number(current.stage || 0);
      const targetCamera = cameraTargets[currentStage] || cameraTargets[0];

      if (!reducedMotion) {
        camera.position.x = damp(camera.position.x, targetCamera[0] + pointerTarget.x * 0.38, 2.8, delta);
        camera.position.y = damp(camera.position.y, targetCamera[1] - pointerTarget.y * 0.22, 2.8, delta);
        camera.position.z = damp(camera.position.z, targetCamera[2], 2.6, delta);
        sanctuary.rotation.y = damp(sanctuary.rotation.y, pointerTarget.x * 0.055, 2.4, delta);
        sanctuary.rotation.x = damp(sanctuary.rotation.x, -pointerTarget.y * 0.025, 2.4, delta);
        core.rotation.y += delta * 0.13;
        core.rotation.x += delta * 0.07;
        coreShell.rotation.y -= delta * 0.055;
        particles.rotation.y += delta * 0.006;
      }

      camera.lookAt(0, 0.02, 0);

      const liveStage = currentStage >= 1 && currentStage <= 7;
      const reveal = currentStage === 8;
      coreMaterial.emissiveIntensity = damp(coreMaterial.emissiveIntensity, reveal ? 1.65 : liveStage ? 0.92 : 0.46, 3.5, delta);
      beamMaterial.opacity = damp(beamMaterial.opacity, reveal ? 0.14 : liveStage ? 0.058 : 0.024, 3.3, delta);
      keyLight.intensity = damp(keyLight.intensity, reveal ? 14 : liveStage ? 8.8 : 4.4, 3.2, delta);
      goldLight.intensity = damp(goldLight.intensity, reveal ? 8.2 : currentStage >= 5 ? 5.8 : 3.2, 3.2, delta);
      floorInlay.material.opacity = damp(floorInlay.material.opacity, reveal ? 0.12 : currentStage >= 1 ? 0.062 : 0.032, 3, delta);
      if (coreGlow) {
        coreGlow.material.opacity = damp(coreGlow.material.opacity, reveal ? 0.48 : liveStage ? 0.26 : 0.12, 3.5, delta);
        const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsed * 1.2) * 0.035;
        coreGlow.scale.set(4.2 * pulse, 4.2 * pulse, 1);
      }

      ringMeshes.forEach((ring, index) => {
        const values = Array.isArray(current.rings) ? current.rings : [0, 0, 0];
        const baseRotation = index * 0.36 + currentStage * 0.025;
        const puzzleRotation = currentStage === 4 ? Number(values[index] || 0) * Math.PI / 4 : baseRotation;
        ring.rotation.z = damp(ring.rotation.z, puzzleRotation, currentStage === 4 ? 7 : 2, delta);
        ring.material.emissiveIntensity = damp(
          ring.material.emissiveIntensity,
          currentStage === 4 ? 0.48 : reveal ? 0.72 : 0.12,
          3.5,
          delta,
        );
      });

      nodeMeshes.forEach((node, index) => {
        const target = currentStage === 1 ? 0.42 : currentStage > 1 ? 0.16 : 0.11;
        node.material.emissiveIntensity = damp(node.material.emissiveIntensity, target, 4, delta);
        if (!reducedMotion && currentStage === 1) {
          const beat = 1 + Math.max(0, Math.sin(elapsed * (1.45 + index * 0.035) - index * 0.72)) * 0.08;
          node.scale.setScalar(beat);
        } else {
          node.scale.setScalar(damp(node.scale.x, 1, 5, delta));
        }
      });

      const guardianTarget = currentStage === 2 ? 0.52 : currentStage === 7 ? 0.28 : 0;
      guardianMaterial.opacity = damp(guardianMaterial.opacity, guardianTarget, 3.6, delta);
      guardian.visible = guardianMaterial.opacity > 0.005;
      if (!reducedMotion && guardian.visible) {
        guardian.position.x = -0.25 + Math.sin(elapsed * 0.16) * 0.08;
        guardian.scale.setScalar(1.03 + Math.sin(elapsed * 0.24) * 0.012);
      }

      transmissionGroup.visible = currentStage === 3;
      transmissionMaterials.forEach((material, index) => {
        material.opacity = damp(material.opacity, currentStage === 3 ? 0.88 : 0, 5, delta);
        material.emissiveIntensity = damp(material.emissiveIntensity, current.showSequence ? 1.12 : 0.42, 5, delta);
        const shard = transmissionGroup.children[index];
        if (shard && !reducedMotion) {
          shard.position.y += Math.sin(elapsed * 1.1 + index) * 0.0008;
          shard.rotation.y += delta * (0.1 + index * 0.025);
        }
      });

      archiveGroup.visible = currentStage === 5;
      archivePads.forEach((pad, index) => {
        const occupied = Boolean(current.archiveDraft?.[index]);
        pad.material.opacity = damp(pad.material.opacity, currentStage === 5 ? (occupied ? 0.92 : 0.38) : 0, 5, delta);
        pad.material.emissiveIntensity = damp(pad.material.emissiveIntensity, occupied ? 0.68 : 0.14, 5, delta);
      });

      chamberGroup.visible = currentStage === 6;
      chamberDialMaterial.opacity = damp(chamberDialMaterial.opacity, currentStage === 6 ? 0.88 : 0, 5, delta);
      chamberDialMaterial.emissiveIntensity = damp(chamberDialMaterial.emissiveIntensity, current.chamberValue ? 0.46 : 0.14, 5, delta);
      const chamberValueNumber = Math.max(1, Math.min(8, Number(current.chamberNumber) || 1));
      needleGroup.rotation.z = damp(needleGroup.rotation.z, -(chamberValueNumber - 1) * Math.PI / 4, 6, delta);

      sealGroup.visible = currentStage === 7 || reveal;
      sealMaterials.forEach((material, index) => {
        material.opacity = damp(material.opacity, sealGroup.visible ? (reveal ? 1 : 0.72) : 0, 5, delta);
        material.emissiveIntensity = damp(material.emissiveIntensity, reveal ? 1.12 : 0.34, 4, delta);
        const shard = sealGroup.children[index];
        if (shard && !reducedMotion) {
          shard.rotation.x += delta * (0.08 + index * 0.02);
          shard.rotation.y += delta * (0.11 + index * 0.03);
        }
      });

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(renderFrame);
    }

    renderFrame();

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose?.();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        }
      });
      environmentTarget.dispose();
      roomEnvironment.dispose();
      pmremGenerator.dispose();
      glowTexture?.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    };
  }, [config]);

  return (
    <div ref={mountRef} className="ps-v2-scene" data-webgl={unavailable ? "fallback" : "active"} aria-hidden="true">
      {unavailable && <div className="ps-v2-scene-fallback" />}
    </div>
  );
}
