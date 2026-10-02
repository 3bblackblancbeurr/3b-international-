import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { buildUniverseArchitecture } from '../src/design-system/universe-architecture.js';
import { SHOP_MEDIA, presentationCrop } from '../src/shop/presentation-media.js';

test('all delivered HD assets have their declared bytes, signatures and native dimensions', () => {
  const manifest = JSON.parse(readFileSync('public/art/luxury-v2/manifest.json', 'utf8'));
  for (const asset of manifest.assets) {
    const bytes = readFileSync('public' + asset.path);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(asset.width >= 1100 && asset.height >= 900);
    assert.ok(asset.bytes < 750000);
  }
});

test('gallery crops stay inside their original artwork and retain real pixel resolution', () => {
  for (const media of SHOP_MEDIA) {
    const c = media.crop;
    assert.ok(c.x >= 0 && c.y >= 0 && c.width > 0 && c.height > 0);
    assert.ok(c.x + c.width <= media.width && c.y + c.height <= media.height);
    const styles = presentationCrop(media);
    assert.ok(Number.parseFloat(styles.image.width) >= 100);
    assert.ok(Number.isFinite(Number.parseFloat(styles.image.left)));
    assert.ok(readFileSync('public' + media.src).length > 100000);
  }
});

test('eight distinct districts, finite geometry and bounded draw cost are delivered', () => {
  const art = buildUniverseArchitecture();
  assert.deepEqual(art.root.userData.countries, ['FR','DZ','MA','TN','ES','IT','TR','EE']);
  assert.equal(art.countryGroups.length, 8);
  const signatures = new Set();
  let meshes = 0, triangles = 0;
  for (const district of art.countryGroups) {
    assert.ok(district.userData.guardian);
    signatures.add(district.children.reduce((sum, mesh) => sum + mesh.geometry.index.count, 0));
  }
  assert.equal(signatures.size, 8);
  art.root.traverse(object => {
    if (!object.isMesh) return;
    meshes++; triangles += object.geometry.index.count / 3;
    for (const value of object.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
  });
  assert.ok(meshes <= 80 && triangles <= 65000);
  const bounds = new THREE.Box3().setFromObject(art.root);
  assert.ok(bounds.min.y > -10 && bounds.max.y < 20);
  for (const anchor of art.anchors) assert.ok(Math.abs(Math.hypot(anchor.x, anchor.z) - 30) < .001);
  let disposed = 0;
  art.root.traverse(object => { if (object.isMesh) object.geometry.addEventListener('dispose', () => disposed++); });
  art.dispose(); art.dispose();
  assert.equal(disposed, meshes);
});
