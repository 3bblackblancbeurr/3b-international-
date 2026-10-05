import {mediaPath,validateManifest} from './model.js';

// Creator operations are never an exemption from a spectator decision.
export const DIRECTOR_ACTIONS = new Set(['editor','save','publish','archive','poll-create','poll-cancel','upload','media','preview']);
export function directorCapabilities(owner) {
  return {director:owner === true,studio:owner === true,allBranchesPreview:owner === true,previewRewards:false};
}
export function validateLockedManifest(manifest) {
  const errors = validateManifest(manifest);
  if (errors.length) return errors;
  const sources = new Set();
  for (const scene of manifest.nodes) {
    if (!mediaPath(scene.src) || !/\.(mp4|webm)$/.test(scene.src) || sources.has(scene.src)) errors.push(`${scene.title} : importe un fichier vidéo privé distinct pour chaque scène.`);
    sources.add(scene.src);
    if ((scene.choices || []).some(choice => Boolean(choice.requiresEnding))) errors.push(`${scene.title} : un parcours unique ne peut pas exiger une autre fin de la même histoire.`);
  }
  return errors;
}
export function lockedDraft(manifest) {
  return {...manifest,nodes:manifest.nodes.map(scene => ({...scene,timeout:0,defaultChoice:''}))};
}
