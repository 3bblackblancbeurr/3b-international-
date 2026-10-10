const TYPES = new Set(['character', 'guardian', 'portal', 'fragment', 'prop', 'weapon', 'fx']);

export function validateAssetManifest(asset) {
  const errors = [], warnings = [];
  if (!asset || typeof asset !== 'object') return { valid: false, errors: ['Manifest missing.'], warnings };
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(asset.canonicalId || '')) errors.push('canonicalId must be a lowercase dotted/dashed stable ID.');
  if (!TYPES.has(asset.type)) errors.push('Unknown asset type.');
  if (asset.units !== 'meter') errors.push('units must be meter.');
  if (!asset.pivot || !['ground-center', 'hinge', 'center-of-mass', 'custom'].includes(asset.pivot)) errors.push('pivot policy missing or invalid.');
  if (asset.collision !== 'separate') errors.push('collision must be separate from render geometry.');
  if (!Array.isArray(asset.lods) || asset.lods.length < 2) warnings.push('At least two LOD levels are recommended for XR.');
  if (!asset.materials || asset.materials.pbr !== true) errors.push('PBR materials are required.');
  if (!Number.isFinite(asset.textureMax) || asset.textureMax <= 0) errors.push('textureMax must be a positive pixel budget.');
  if (['character','guardian'].includes(asset.type)) {
    if (!asset.rig?.canonical) errors.push('Characters require a canonical rig.');
    if (!Array.isArray(asset.animations) || !asset.animations.includes('idle') || !asset.animations.includes('walk')) errors.push('Characters require reusable idle and walk animations.');
  }
  if (asset.type === 'portal' && (!Number.isFinite(asset.realSize?.width) || !Number.isFinite(asset.realSize?.height))) errors.push('Portals require realSize width/height in meters.');
  if (asset.status === 'final' && warnings.length) warnings.push('Final asset still has XR recommendations to resolve.');
  return { valid: errors.length === 0, errors, warnings };
}
