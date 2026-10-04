import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COMPANION_POSE_ACTIONS, NEUTRAL_COMPANION_POSE, blendCompanionPose, companionFramePolicy, computeCompanionPose } from '../src/companion/companion-pose.js';
import { createCompanionRig, disposeCompanionResources, frameCompanionCamera } from '../src/companion/companion-rig.js';

test('every choreographed action produces a complete finite joint pose even for invalid clock input', () => {
  for (const action of [...COMPANION_POSE_ACTIONS, 'unknown']) {
    for (const time of [0, .1, .6, 1.4, 3.5, 99999, NaN, Infinity, -10]) {
      const pose = computeCompanionPose({ action, time, gazeX: Infinity, gazeY: NaN });
      assert.deepEqual(Object.keys(pose).sort(), Object.keys(NEUTRAL_COMPANION_POSE).sort());
      for (const [joint, value] of Object.entries(pose)) assert.ok(Number.isFinite(value), `${action} ${joint} at ${time}`);
    }
  }
});

test('walk has opposite hip and shoulder strides with independently articulated knees', () => {
  const first = computeCompanionPose({ action: 'walk', time: .11 });
  const second = computeCompanionPose({ action: 'walk', time: .52 });
  assert.ok(first.hipLX*first.hipRX < 0);
  assert.ok(first.shoulderLX*first.hipLX < 0);
  assert.notEqual(first.kneeL, first.kneeR);
  assert.notEqual(first.hipLX, second.hipLX);
  assert.notEqual(first.kneeL, second.kneeL);
  assert.ok(computeCompanionPose({ action: 'walk', facing: -1 }).rootYaw < 0);
});

test('pocket reveal follows the reach and landing progressively releases the crouch', () => {
  const reach = computeCompanionPose({ action: 'pocket', time: .6 });
  const reveal = computeCompanionPose({ action: 'pocket', time: 2.3 });
  assert.equal(reach.object, 0);
  assert.equal(reveal.object, 1);
  assert.ok(reveal.shoulderRX < reach.shoulderRX);
  const impact = computeCompanionPose({ action: 'land', time: 0 });
  const recovered = computeCompanionPose({ action: 'land', time: 1.5 });
  assert.ok(impact.rootY < recovered.rootY);
  assert.ok(impact.kneeL > recovered.kneeL);
});

test('reduced-motion frames stay identical and pause policy does not schedule movement', () => {
  for (const action of COMPANION_POSE_ACTIONS) {
    assert.deepEqual(computeCompanionPose({ action, time: 1, reduced: true }), computeCompanionPose({ action, time: 30, reduced: true }));
  }
  for (const options of [{ active: false }, { visible: false }, { reduced: true }]) assert.equal(companionFramePolicy(options).animate, false);
  assert.ok(companionFramePolicy({ size: 112, devicePixelRatio: 4 }).dpr <= 1.5);
  assert.ok(companionFramePolicy({ size: 220, devicePixelRatio: 4 }).fps <= 40);
});

test('joint transitions converge without snapping or taking a full yaw turn at the wrap', () => {
  const from = computeCompanionPose();
  const target = computeCompanionPose({ action: 'hello', time: 1 });
  const next = blendCompanionPose(from, target, 1/30);
  assert.ok(next.shoulderRZ > from.shoulderRZ && next.shoulderRZ < target.shoulderRZ);
  const wrapped = blendCompanionPose({ ...from, rootYaw: 3.13 }, { ...from, rootYaw: -3.13 }, 1/30);
  assert.ok(Math.abs(wrapped.rootYaw-3.13) < .03);
});

test('real mesh limbs inherit their corresponding parent joint and all world transforms remain finite', () => {
  const rig = createCompanionRig();
  assert.equal(rig.arms.L.elbow.parent, rig.arms.L.shoulder);
  assert.equal(rig.arms.R.wrist.parent, rig.arms.R.elbow);
  assert.equal(rig.legs.R.ankle.parent, rig.legs.R.knee);
  const footA = new THREE.Vector3();
  const footB = new THREE.Vector3();
  rig.applyPose(computeCompanionPose({ action: 'walk', time: .1 }), .1);
  rig.root.updateMatrixWorld(true); rig.legs.L.ankle.getWorldPosition(footA);
  rig.applyPose(computeCompanionPose({ action: 'walk', time: .5 }), .5);
  rig.root.updateMatrixWorld(true); rig.legs.L.ankle.getWorldPosition(footB);
  assert.ok(footA.distanceTo(footB) > .25, 'the mesh foot must actually move through space');
  for (const action of COMPANION_POSE_ACTIONS) {
    rig.applyPose(computeCompanionPose({ action, time: 1.3 }), 1.3);
    rig.root.updateMatrixWorld(true);
    rig.root.traverse(node => assert.ok(node.matrixWorld.elements.every(Number.isFinite), node.name));
  }
  rig.setBond([0, 2, 4, 6, 99, 2]);
  const resources = rig.dispose();
  assert.ok(resources.geometries > 20);
  assert.ok(resources.materials > 10);
  assert.equal(rig.dispose(), undefined, 'cleanup is idempotent');
});

test('shared geometry, material and texture are released exactly once', () => {
  const scene = new THREE.Group();
  const texture = new THREE.Texture();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture });
  const counts = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener('dispose', () => counts.geometry++);
  material.addEventListener('dispose', () => counts.material++);
  texture.addEventListener('dispose', () => counts.texture++);
  scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
  disposeCompanionResources(scene);
  assert.deepEqual(counts, { geometry: 1, material: 1, texture: 1 });
});

test('all action meshes remain inside the portrait camera and hanging grips align with the stage', () => {
  const rig = createCompanionRig();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 25);
  const point = new THREE.Vector3();
  const instance = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  rig.root.traverse(node => { if (node.isMesh) node.geometry.computeBoundingBox(); });
  for (const action of COMPANION_POSE_ACTIONS) {
    for (const facing of [-1, 1]) for (const time of [0, .2, .65, 1.2, 2, 3, 4.8]) {
      const pose = computeCompanionPose({ action, time, facing });
      rig.applyPose(pose, time); rig.root.updateMatrixWorld(true);
      frameCompanionCamera(camera, pose, 1/1.38); camera.updateMatrixWorld();
      rig.root.traverseVisible(node => {
        if (!node.isMesh) return;
        const bounds = node.geometry.boundingBox;
        for (let i = 0; i < (node.isInstancedMesh ? node.count : 1); i++) {
          if (node.isInstancedMesh) { node.getMatrixAt(i, instance); world.multiplyMatrices(node.matrixWorld, instance); }
          else world.copy(node.matrixWorld);
          for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
            point.set(x, y, z).applyMatrix4(world).project(camera);
            assert.ok(Math.abs(point.x) < .985 && Math.abs(point.y) < .985, `${action} at ${time} clips the portrait`);
          }
        }
      });
    }
  }
  const hang = computeCompanionPose({ action: 'hang', time: 0 });
  rig.applyPose(hang, 0); rig.root.updateMatrixWorld(true);
  frameCompanionCamera(camera, hang, 1/1.38); camera.updateMatrixWorld();
  for (const side of ['L', 'R']) {
    const hand = rig.arms[side].wrist.localToWorld(new THREE.Vector3(0, -.16, .02)).project(camera);
    assert.ok((1-hand.y)/2 > .18 && (1-hand.y)/2 < .23, 'grips must sit at the letter anchor, 20% from the top');
  }
  rig.dispose();
});
