// Reproduce the geometry delivered in the interactive architectural atlas.
// This exports real editable 3D geometry, without an account or WebGL context.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildUniverseArchitecture } from '../src/design-system/universe-architecture.js';

if (!globalThis.FileReader) globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }).catch(error => this.onerror?.(error)); }
};
const destination = path.resolve(process.argv[2] || 'artifacts/luxury-v2/cite-origine.glb');
const art = buildUniverseArchitecture();
try {
  const binary = await new GLTFExporter().parseAsync(art.root, { binary: true, onlyVisible: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(binary));
  console.log(JSON.stringify({ path: destination, bytes: binary.byteLength, districts: art.countryGroups.length }));
} finally { art.dispose(); }
