import { clamp } from '../core.js';
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function screenMovement(x, y, yaw = 0) {
  const length = Math.hypot(x, y),
    scale = length > 1 ? 1 / length : 1;
  return {
    x: (-x * Math.cos(yaw) + y * Math.sin(yaw)) * scale,
    z: (x * Math.sin(yaw) + y * Math.cos(yaw)) * scale,
  };
}
export function moveBody(body, dx, dz, obstacles, maxZ = 114) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15)),
    sx = dx / steps,
    sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    for (const [axis, amount] of [
      ['x', sx],
      ['z', sz],
    ]) {
      const next = { x: body.x, z: body.z };
      next[axis] += amount;
      next.x = clamp(next.x, -12.4 + body.r, 12.4 - body.r);
      next.z = clamp(next.z, -4, maxZ - body.r);
      if (!obstacles.some((o) => Math.hypot(next.x - o.x, next.z - o.z) < body.r + o.r - 0.001))
        body[axis] = next[axis];
    }
  }
}
export function createOriginsCamera() {
  return { x: 0, z: -10, height: 9.5, distance: 14, yaw: 0, lookX: 0, lookZ: 4, zoom: 1 };
}
export function updateOriginsCamera(c, g, dt, aspect = 1.7) {
  const p = g.player,
    near = g.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 10).length,
    combat = near > 1 ? 1.12 : 1;
  const gate = g.zone === 4 ? 1 + Math.min(1, (p.z - 94) / 12) * 0.27 : 1,
    targetZoom = combat * gate * (aspect < 0.8 ? 1.18 : 1);
  const ease = 1 - Math.exp(-dt * 5);
  c.zoom += (targetZoom - c.zoom) * ease;
  c.lookX += (p.x + p.vx * 0.28 - c.lookX) * ease;
  c.lookZ += (p.z + p.vz * 0.28 + 3 - c.lookZ) * ease;
  c.height += (9.5 * c.zoom - c.height) * ease;
  c.distance += (14 * c.zoom - c.distance) * ease;
  c.x = c.lookX - Math.sin(c.yaw) * c.distance;
  c.z = c.lookZ - Math.cos(c.yaw) * c.distance;
  return c;
}
