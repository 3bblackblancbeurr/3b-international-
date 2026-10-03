export const XR_CAPABILITIES = Object.freeze({
  roomMesh: 'room-mesh',
  planes: 'planes',
  semanticLabels: 'semantic-labels',
  anchors: 'anchors',
  persistentAnchors: 'persistent-anchors',
  passthrough: 'passthrough',
  hands: 'hands',
  controllers: 'controllers',
  eyeTracking: 'eye-tracking',
  bodyTracking: 'body-tracking',
  spatialAudio: 'spatial-audio',
});

export function capabilityProfile(values = []) {
  const set = new Set(values);
  return Object.freeze({
    has: capability => set.has(capability),
    values: Object.freeze([...set].sort()),
    canRunPrototype001: set.has(XR_CAPABILITIES.anchors) && set.has(XR_CAPABILITIES.passthrough) && (set.has(XR_CAPABILITIES.roomMesh) || set.has(XR_CAPABILITIES.planes)),
  });
}
