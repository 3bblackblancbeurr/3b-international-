import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { prepareTintMaterial } from '../../world/avatar-material.js';

export const ORIGINS_ASSETS = {
  hero: '/world/living/traveller-1.glb',
  shadow: '/world/living/traveller-1.glb',
  sentinel: '/world/living/traveller-0.glb',
  boss: '/world/living/traveller-0.glb',
  floor: '/world/paris/textures/cobblestone_floor_08_Diffuse.jpg',
  normal: '/world/paris/textures/cobblestone_floor_08_nor_gl.jpg',
  stone: '/world/paris/textures/plastered_wall_02_Diffuse.jpg',
};
export async function loadOriginsAssets(onProgress = () => {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
    textures = new THREE.TextureLoader(),
    urls = [...new Set([ORIGINS_ASSETS.hero, ORIGINS_ASSETS.shadow, ORIGINS_ASSETS.sentinel])],
    models = new Map();
  let complete = 0;
  const total = urls.length + 3,
    tasks = [
      ...urls.map((url) =>
        loader.loadAsync(url).then((asset) => {
          models.set(url, asset);
          onProgress(++complete / total);
          return asset;
        }),
      ),
      ...['floor', 'normal', 'stone'].map(async (key) => {
        const texture = await textures.loadAsync(ORIGINS_ASSETS[key]);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = key === 'normal' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        onProgress(++complete / total);
        return [key, texture];
      }),
    ];
  const settled = await Promise.allSettled(tasks),
    assets = { models, textures: {} };
  for (const result of settled)
    if (result.status === 'fulfilled' && Array.isArray(result.value))
      assets.textures[result.value[0]] = result.value[1];
  assets.dispose = () => {
    const geometries = new Set(),
      materials = new Set(),
      tex = new Set(Object.values(assets.textures));
    for (const a of models.values())
      a.scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of [o.material].flat().filter(Boolean)) {
          materials.add(m);
          for (const v of Object.values(m)) if (v?.isTexture) tex.add(v);
        }
      });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    tex.forEach((t) => t.dispose());
  };
  const failed = settled.find((r) => r.status === 'rejected');
  if (failed) {
    assets.dispose();
    throw Error('Une ressource de l’aventure n’a pas pu être chargée. Réessaie.');
  }
  return assets;
}
export function createOriginsActor(assets, kind = 'hero') {
  const asset = assets.models.get(ORIGINS_ASSETS[kind] || ORIGINS_ASSETS.shadow),
    object = new THREE.Group(),
    model = clone(asset.scene),
    materials = [],
    accessoryGeometry = [],
    bones = {};
  object.add(model);
  const hero = kind === 'hero';
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    const hair = o.name.match(/^Hair_(\d+)/),
      boots = o.name.match(/^Boots_(\d+)/);
    if (hair) o.visible = hero && Number(hair[1]) === 3;
    if (boots) o.visible = Number(boots[1]) === 0;
    const tint = (m) => {
      const copy = m.clone();
      materials.push(copy);
      if (hero) {
        if (/SkinColor|HandsColor|HairColor|ClothColor|TrouserColor|BootColor/.test(copy.name))
          prepareTintMaterial(copy);
        if (/SkinColor|HandsColor/.test(copy.name)) copy.color.set('#c49a78');
        else if (/HairColor/.test(copy.name)) copy.color.set('#1c1b23');
        else if (/ClothColor/.test(copy.name)) copy.color.set('#142637');
        else if (/TrouserColor/.test(copy.name)) copy.color.set('#1b2229');
        else if (/BootColor/.test(copy.name)) copy.color.set('#302b2a');
        else if (/TrimColor/.test(copy.name)) {
          copy.color.set('#d9c297');
          copy.metalness = 0.38;
          copy.roughness = 0.48;
        }
      } else {
        prepareTintMaterial(copy);
        copy.color.set(
          /Skin|Hands/.test(copy.name)
            ? '#132630'
            : /Trim/.test(copy.name)
              ? kind === 'boss'
                ? '#ccb381'
                : '#72899b'
              : kind === 'shadow'
                ? '#243243'
                : kind === 'boss'
                  ? '#202a32'
                  : '#465260',
        );
        copy.metalness = 0.4;
        copy.roughness = 0.55;
        copy.emissive.set('#173043');
        copy.emissiveIntensity = 0.07;
      }
      return copy;
    };
    o.material = Array.isArray(o.material) ? o.material.map(tint) : tint(o.material);
  });
  let cape;
  if (!hero) {
    const armor = new THREE.MeshStandardMaterial({
        color: kind === 'boss' ? '#81704f' : '#394a5a',
        metalness: 0.75,
        roughness: 0.38,
      }),
      trim = new THREE.MeshStandardMaterial({ color: '#c5ae7d', metalness: 0.7, roughness: 0.36 }),
      glow = new THREE.MeshBasicMaterial({ color: '#71d8f4', toneMapped: false }),
      cloth = new THREE.MeshStandardMaterial({
        color: '#142631',
        side: THREE.DoubleSide,
        roughness: 0.93,
      });
    materials.push(armor, trim, glow, cloth);
    const attach = (bone, geometry, material, x, y, z) => {
      accessoryGeometry.push(geometry);
      const m = new THREE.Mesh(geometry, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      (bones[bone] || model).add(m);
      return m;
    };
    const plate = new THREE.Shape();
    plate.moveTo(-0.18, 0.13);
    plate.lineTo(0.18, 0.13);
    plate.lineTo(0.23, -0.02);
    plate.lineTo(0.1, -0.25);
    plate.lineTo(0, -0.29);
    plate.lineTo(-0.1, -0.25);
    plate.lineTo(-0.23, -0.02);
    plate.closePath();
    attach(
      'spine_02',
      new THREE.ExtrudeGeometry(plate, {
        depth: 0.026,
        bevelEnabled: true,
        bevelSize: 0.014,
        bevelThickness: 0.012,
        bevelSegments: 2,
      }),
      armor,
      0,
      0.02,
      0.16,
    );
    attach(
      'spine_02',
      new THREE.TorusGeometry(0.069, 0.006, 5, 32, Math.PI * 1.8),
      glow,
      0,
      -0.025,
      0.207,
    );
    const mask = new THREE.Shape();
    mask.moveTo(-0.095, 0.16);
    mask.lineTo(0.095, 0.16);
    mask.lineTo(0.1, 0.045);
    mask.lineTo(0, -0.025);
    mask.lineTo(-0.1, 0.045);
    mask.closePath();
    attach(
      'Head',
      new THREE.ExtrudeGeometry(mask, {
        depth: 0.015,
        bevelEnabled: true,
        bevelSize: 0.01,
        bevelThickness: 0.005,
        bevelSegments: 1,
      }),
      armor,
      0,
      0.045,
      0.086,
    );
    attach('Head', new THREE.BoxGeometry(0.127, 0.009, 0.012), glow, 0, 0.15, 0.113);
    if (kind === 'boss') {
      for (const x of [-0.1, 0, 0.1]) {
        const crest = new THREE.Shape();
        crest.moveTo(-0.038, 0);
        crest.lineTo(0, 0.18 - Math.abs(x) * 0.45);
        crest.lineTo(0.038, 0);
        crest.closePath();
        attach(
          'Head',
          new THREE.ExtrudeGeometry(crest, {
            depth: 0.025,
            bevelEnabled: true,
            bevelSize: 0.008,
            bevelThickness: 0.004,
            bevelSegments: 1,
          }),
          trim,
          x,
          0.24,
          0.015,
        );
      }
    }
    const capeGeo = new THREE.PlaneGeometry(0.7, 1.08, 6, 9);
    cape = attach('spine_02', capeGeo, cloth, 0, -0.36, -0.18);
    const pos = capeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = (0.54 - pos.getY(i)) / 1.08;
      pos.setX(i, pos.getX(i) * (0.5 + v * 0.6));
      pos.setZ(i, -v * 0.18);
    }
    cape.userData.base = new Float32Array(pos.array);
  }
  const mixer = new THREE.AnimationMixer(model),
    clips = {};
  for (const clip of asset.animations) clips[clip.name] = clip;
  // Clip variants retain the authored full-body motion and crossfade into different attack timings.
  const aliases = {
    idle: 'Idle',
    walk: 'Walk',
    run: 'Run',
    light: 'Attack',
    heavy: 'Attack',
    charged: 'Attack',
    counter: 'Attack',
    aerial: 'Jump',
    dodge: 'Jump',
    guard: 'Cast',
    matrix: 'Cast',
    hurt: 'Hit',
    dead: 'Death',
    interact: 'Interact',
  };
  const actions = {};
  for (const [name, clip] of Object.entries(aliases))
    if (clips[clip]) {
      const variant = clips[clip].clone();
      variant.name = 'origins-' + name;
      actions[name] = mixer.clipAction(variant);
    }
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()),
    scale =
      (hero ? 2.3 : kind === 'boss' ? 4.6 : kind === 'sentinel' ? 2.8 : 2.15) / Math.max(0.1, size.y);
  model.scale.setScalar(scale);
  let transient = null;
  let current = '',
    event = -1,
    dead = false;
  function play(name, once = false, duration) {
    const next = actions[name] || actions.idle;
    if (!next || (current === name && !once)) return;
    const previous = actions[current];
    next.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next
      .setEffectiveWeight(1)
      .setEffectiveTimeScale(duration ? next.getClip().duration / duration : 1)
      .play();
    if (previous && previous !== next) previous.crossFadeTo(next, 0.11, false);
    current = name;
  }
  play('idle');
  mixer.update(0.001);
  const initialQuaternions = new Map(Object.values(bones).map((b) => [b, b.quaternion.clone()]));
  return {
    object,
    update(dt, state, time) {
      if (dead) return;
      if (transient) {
        transient.remaining -= dt;
        if (transient.remaining <= 0) transient = null;
      }
      object.position.set(state.x, state.y || 0, state.z);
      object.rotation.y = state.heading;
      if (state.hp <= 0) {
        if (current !== 'dead') play('dead', true, 1.2);
      } else if (hero) {
        if (state.hit > 0) {
          if (current !== 'hurt') play('hurt', true, 0.3);
        } else if (state.dodge > 0) {
          if (current !== 'dodge') play('dodge', true, 0.46);
        } else if (state.attack) {
          if (event !== state.attack) {
            event = state.attack;
            play(state.attack.kind, true, state.attack.duration);
          }
        } else if (state.parry > 0) {
          if (current !== 'guard') play('guard', true, 0.5);
        } else if (state.charge >= 0) {
          if (current !== 'heavy') play('heavy', true, 1.2);
        } else if (transient) {
          if (current !== transient.name) play(transient.name, true, transient.remaining);
        } else {
          const speed = Math.hypot(state.vx, state.vz);
          play(speed > 3 ? 'run' : speed > 0.1 ? 'walk' : 'idle');
          if (speed > 0.1)
            actions[current]?.setEffectiveTimeScale(
              Math.min(1.6, Math.max(0.7, speed / (current === 'run' ? 5.2 : 2))),
            );
        }
      } else if (state.hit > 0) {
        if (current !== 'hurt') play('hurt', true, 0.26);
      } else if (state.state === 'windup') {
        if (current !== 'heavy') play('heavy', true, Math.max(0.3, state.windup));
      } else if (state.state === 'recover') {
        if (event !== state.actionId) {
          event = state.actionId;
          play('light', true, 0.45);
        }
      } else play(state.moving ? 'walk' : 'idle');
      // Reset additive offsets before the mixer writes a fresh blended pose.
      for (const name of ['spine_01', 'spine_02', 'upperarm_r', 'upperarm_l'])
        if (bones[name]) bones[name].quaternion.copy(initialQuaternions.get(bones[name]));
      mixer.update(Math.min(0.05, dt));
      if (cape) {
        const pos = cape.geometry.attributes.position,
          base = cape.userData.base;
        for (let i = 0; i < pos.count; i++) {
          const v = (0.54 - base[i * 3 + 1]) / 1.08;
          pos.setZ(i, base[i * 3 + 2] + Math.sin(time * 3.4 + base[i * 3] * 9 + v * 3) * v * 0.065);
        }
        pos.needsUpdate = true;
      }
      if (hero && state.charge >= 0) {
        const arm = bones.upperarm_r;
        if (arm) arm.rotation.z -= Math.min(1, state.charge) * 0.45;
        const spine = bones.spine_01;
        if (spine) spine.rotation.y -= Math.min(1, state.charge) * 0.22;
      }
      if (hero && state.attack?.kind === 'heavy' && bones.spine_01)
        bones.spine_01.rotation.y +=
          Math.sin((state.attack.elapsed / state.attack.duration) * Math.PI) * 0.35;
      if (hero && state.dodge > 0) model.rotation.z = Math.sin((state.dodge / 0.34) * Math.PI) * -0.18;
      else model.rotation.z *= Math.exp(-dt * 18);
      const pulse =
        state.hit > 0 ? 1.1 : kind === 'boss' && state.phase > 1 ? 0.3 + Math.sin(time * 3) * 0.05 : 0;
      for (const m of materials)
        if (m.emissive) {
          m.emissiveIntensity = /Light|Glow/.test(m.name) ? 1.5 : pulse;
          m.emissive.set(state.hit > 0 ? '#6595af' : '#184568');
        }
    },
    action(name, duration = 0.7) {
      transient = { name, remaining: duration };
      play(name, true, duration);
    },
    dispose() {
      if (dead) return;
      dead = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
      materials.forEach((m) => m.dispose());
      accessoryGeometry.forEach((g) => g.dispose());
      object.clear();
    },
  };
}
