const radians = degrees => degrees * Math.PI / 180;
const rotateXZ = (point, yaw) => {
  const r = radians(yaw), c = Math.cos(r), s = Math.sin(r);
  return { x: point.x * c - point.z * s, z: point.x * s + point.z * c };
};

export function composePlayerPose({ worldOrigin = { x: 0, y: 0, z: 0 }, physicalOffset = { x: 0, y: 0, z: 0 }, worldYaw = 0 }) {
  const rotated = rotateXZ(physicalOffset, worldYaw);
  return Object.freeze({ x: worldOrigin.x + rotated.x, y: worldOrigin.y + (physicalOffset.y || 0), z: worldOrigin.z + rotated.z, yaw: worldYaw });
}

export function worldOriginForEntry({ desiredWorldPose, physicalPose, worldYaw = 0 }) {
  const rotated = rotateXZ(physicalPose, worldYaw);
  return Object.freeze({ x: desiredWorldPose.x - rotated.x, y: (desiredWorldPose.y || 0) - (physicalPose.y || 0), z: desiredWorldPose.z - rotated.z });
}
