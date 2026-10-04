import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

function hashNoise(x, y, seed = 1) {
  const value = Math.sin((x * 12.9898 + y * 78.233 + seed * 37.719)) * 43758.5453;
  return value - Math.floor(value);
}

function makeMicroTexture(mode = "bump") {
  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const grain = hashNoise(x, y, mode === "roughness" ? 7 : 3);
      const brushed = Math.sin(y * 0.72 + Math.sin(x * 0.03) * 2.2) * 0.5 + 0.5;
      const scratch = hashNoise(Math.floor(x / 11), Math.floor(y / 2), 13) > 0.975 ? 1 : 0;
      const base = mode === "roughness"
        ? 114 + grain * 54 + brushed * 18 + scratch * 26
        : 116 + grain * 24 + brushed * 10 + scratch * 34;
      const value = Math.max(0, Math.min(255, Math.round(base)));
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  ctx.globalAlpha = mode === "roughness" ? 0.18 : 0.32;
  for (let index = 0; index < 46; index += 1) {
    const y = (index * 47) % size;
    const x = (index * 83) % size;
    ctx.strokeStyle = index % 3 === 0 ? "#f5f5f5" : "#3b3b3b";
    ctx.lineWidth = index % 5 === 0 ? 1.2 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(Math.min(size, x + 45 + (index % 7) * 17), y + (index % 3) - 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(mode === "roughness" ? 7 : 9, mode === "roughness" ? 7 : 9);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function applyMicroSurface(root, bumpTexture, roughnessTexture) {
  root.traverse((object) => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material?.isMeshStandardMaterial && !material?.isMeshPhysicalMaterial) return;
      if ((material.metalness ?? 0) < 0.45) return;
      material.bumpMap = bumpTexture;
      material.bumpScale = material.metalness > 0.9 ? 0.008 : 0.005;
      material.roughnessMap = roughnessTexture;
      material.envMapIntensity = Math.max(material.envMapIntensity ?? 1, 0.72);
      material.needsUpdate = true;
    });
  });
}

function addMechanicalRingDetails(ring, index, gold, signalColor, blackMetal) {
  const radius = ring.geometry?.parameters?.radius || 2.2;
  const tube = ring.geometry?.parameters?.tube || 0.06;
  const group = new THREE.Group();
  group.name = "aaa-ring-detail-" + index;

  const railMaterial = new THREE.MeshPhysicalMaterial({
    color: index === 1 ? gold : blackMetal,
    metalness: 0.98,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.045,
    envMapIntensity: 1.05,
  });

  const insetMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x071116,
    emissive: index === 1 ? gold : signalColor,
    emissiveIntensity: index === 1 ? 0.08 : 0.11,
    metalness: 0.9,
    roughness: 0.16,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.82,
  });

  const innerRail = new THREE.Mesh(new THREE.TorusGeometry(radius - tube * 2.1, tube * 0.31, 10, 144), railMaterial);
  const outerRail = new THREE.Mesh(new THREE.TorusGeometry(radius + tube * 2.1, tube * 0.31, 10, 144), railMaterial);
  group.add(innerRail, outerRail);

  const teethCount = 32;
  const toothGeometry = new THREE.BoxGeometry(0.13 + index * 0.008, 0.032, 0.045);
  const teeth = new THREE.InstancedMesh(toothGeometry, insetMaterial, teethCount);
  const dummy = new THREE.Object3D();
  for (let slot = 0; slot < teethCount; slot += 1) {
    const angle = (slot / teethCount) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    dummy.rotation.set(0, 0, angle);
    dummy.scale.set(slot % 4 === 0 ? 1.35 : 0.78, slot % 4 === 0 ? 1.25 : 0.72, 1);
    dummy.updateMatrix();
    teeth.setMatrixAt(slot, dummy.matrix);
  }
  teeth.instanceMatrix.needsUpdate = true;
  group.add(teeth);

  const markers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.22, 0.024, 0.052),
    new THREE.MeshBasicMaterial({
      color: index === 1 ? 0xe1c67f : signalColor,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    8,
  );
  for (let slot = 0; slot < 8; slot += 1) {
    const angle = (slot / 8) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.015);
    dummy.rotation.set(0, 0, angle);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    markers.setMatrixAt(slot, dummy.matrix);
  }
  markers.instanceMatrix.needsUpdate = true;
  group.add(markers);

  ring.add(group);
  return group;
}

function addFloorEngraving(sanctuary, signalColor, gold) {
  const group = new THREE.Group();
  group.name = "aaa-floor-engraving";

  const goldMaterial = new THREE.MeshBasicMaterial({
    color: gold,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const signalMaterial = new THREE.MeshBasicMaterial({
    color: signalColor,
    transparent: true,
    opacity: 0.075,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  [2.25, 3.65, 5.35].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + (index === 1 ? 0.018 : 0.011), 128),
      index === 1 ? goldMaterial : signalMaterial,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.028 + index * 0.0004;
    group.add(ring);
  });

  const slots = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.018, 0.012, 0.58),
    goldMaterial,
    48,
  );
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    const radius = index % 3 === 0 ? 5.15 : 4.58;
    dummy.position.set(Math.sin(angle) * radius, -2.024, Math.cos(angle) * radius);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(index % 6 === 0 ? 1.5 : 0.72, 1, index % 6 === 0 ? 1.25 : 0.64);
    dummy.updateMatrix();
    slots.setMatrixAt(index, dummy.matrix);
  }
  slots.instanceMatrix.needsUpdate = true;
  group.add(slots);
  sanctuary.add(group);
  return group;
}

function addNexusSculpture(sanctuary, gold, signalColor) {
  const group = new THREE.Group();
  group.name = "aaa-nexus-sculpture";

  const profile = [
    new THREE.Vector2(0.38, -1.18),
    new THREE.Vector2(0.56, -0.96),
    new THREE.Vector2(0.45, -0.68),
    new THREE.Vector2(0.73, -0.34),
    new THREE.Vector2(0.82, 0),
    new THREE.Vector2(0.73, 0.34),
    new THREE.Vector2(0.45, 0.68),
    new THREE.Vector2(0.56, 0.96),
    new THREE.Vector2(0.38, 1.18),
  ];
  const cageMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x05090b,
    emissive: signalColor,
    emissiveIntensity: 0.045,
    metalness: 0.97,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.055,
    envMapIntensity: 1.08,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const cage = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), cageMaterial);
  cage.scale.set(1.42, 1.42, 1.42);
  cage.rotation.z = Math.PI / 2;
  group.add(cage);

  const ribMaterial = new THREE.MeshPhysicalMaterial({
    color: gold,
    metalness: 0.97,
    roughness: 0.11,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.15,
  });
  for (let index = 0; index < 4; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.52 + index * 0.085, 0.018 + index * 0.002, 8, 128), ribMaterial);
    rib.rotation.x = index % 2 ? Math.PI / 2 : Math.PI / 3;
    rib.rotation.y = index * Math.PI / 4;
    group.add(rib);
  }

  const crownMaterial = new THREE.MeshBasicMaterial({
    color: signalColor,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.42, 8), crownMaterial, 12);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 1.7, Math.sin(angle) * 1.7, 0);
    dummy.rotation.set(0, 0, angle - Math.PI / 2);
    dummy.updateMatrix();
    crown.setMatrixAt(index, dummy.matrix);
  }
  crown.instanceMatrix.needsUpdate = true;
  group.add(crown);

  sanctuary.add(group);
  return group;
}

function addVolumetricAtmosphere(sanctuary, signalColor, gold) {
  const group = new THREE.Group();
  group.name = "aaa-volumetric-atmosphere";

  const makeCone = (color, opacity, x, z, scaleX) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 1.65, 7.6, 32, 1, true), material);
    cone.position.set(x, 1.28, z);
    cone.scale.x = scaleX;
    cone.rotation.z = x * 0.025;
    group.add(cone);
    return cone;
  };

  const beams = [
    makeCone(signalColor, 0.018, 0, -0.8, 1),
    makeCone(gold, 0.012, -2.4, -1.4, 0.7),
    makeCone(signalColor, 0.01, 2.7, -1.8, 0.65),
  ];
  sanctuary.add(group);
  return { group, beams };
}

export function createSecretArtKit({ sanctuary, ringMeshes, signalColor, gold, blackMetal }) {
  const bumpTexture = makeMicroTexture("bump");
  const roughnessTexture = makeMicroTexture("roughness");
  const floorDetail = addFloorEngraving(sanctuary, signalColor, gold);
  const nexusDetail = addNexusSculpture(sanctuary, gold, signalColor);
  const ringDetails = ringMeshes.map((ring, index) => addMechanicalRingDetails(ring, index, gold, signalColor, blackMetal));
  const atmosphere = addVolumetricAtmosphere(sanctuary, signalColor, gold);

  if (bumpTexture && roughnessTexture) {
    applyMicroSurface(sanctuary, bumpTexture, roughnessTexture);
  }

  return {
    update(elapsed, stage, reducedMotion) {
      if (!reducedMotion) {
        nexusDetail.rotation.y = elapsed * 0.012;
        nexusDetail.rotation.z = Math.sin(elapsed * 0.18) * 0.008;
        ringDetails.forEach((detail, index) => {
          detail.rotation.z = Math.sin(elapsed * 0.22 + index) * 0.0025;
        });
      }
      const reveal = stage === 8;
      atmosphere.beams.forEach((beam, index) => {
        beam.material.opacity = THREE.MathUtils.lerp(
          beam.material.opacity,
          reveal ? (index === 0 ? 0.035 : 0.02) : (index === 0 ? 0.018 : 0.011),
          0.035,
        );
      });
    },
    dispose() {
      sanctuary.remove(floorDetail);
      sanctuary.remove(nexusDetail);
      sanctuary.remove(atmosphere.group);
      bumpTexture?.dispose();
      roughnessTexture?.dispose();
    },
  };
}

export function createSecretPostFX({ renderer, scene, camera, width, height, isMobile }) {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio?.(renderer.getPixelRatio());
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  let ssaoPass = null;
  if (!isMobile) {
    ssaoPass = new SSAOPass(scene, camera, width, height);
    ssaoPass.kernelRadius = 11;
    ssaoPass.minDistance = 0.0025;
    ssaoPass.maxDistance = 0.16;
    composer.addPass(ssaoPass);
  }

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    isMobile ? 0.08 : 0.14,
    isMobile ? 0.48 : 0.62,
    0.9,
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    resize(nextWidth, nextHeight) {
      composer.setSize(nextWidth, nextHeight);
      ssaoPass?.setSize?.(nextWidth, nextHeight);
    },
    update(stage) {
      const reveal = stage === 8;
      const active = stage > 0 && stage < 8;
      bloomPass.strength = reveal ? (isMobile ? 0.13 : 0.22) : active ? (isMobile ? 0.085 : 0.15) : (isMobile ? 0.06 : 0.11);
      bloomPass.radius = reveal ? 0.72 : 0.58;
      bloomPass.threshold = reveal ? 0.86 : 0.91;
      if (ssaoPass) {
        ssaoPass.kernelRadius = reveal ? 9 : 11;
      }
    },
    render(delta) {
      composer.render(delta);
    },
    dispose() {
      ssaoPass?.dispose?.();
      bloomPass.dispose?.();
      outputPass.dispose?.();
      renderPass.dispose?.();
      composer.dispose?.();
    },
  };
}
