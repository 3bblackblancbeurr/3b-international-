export const COMPASS_DIRECTIONS=['N','NE','E','SE','S','SO','O','NO'];

// Use displacement after pathfinding and collisions, not camera yaw or input.
// Keep the last course while idle, blocked, paused or looking around.
export function movementHeading(dx,dz,previous=180){
 return Math.hypot(dx,dz)>1e-5?(Math.atan2(dx,-dz)*180/Math.PI+360)%360:previous;
}
export function compassDirection(heading){return COMPASS_DIRECTIONS[Math.round(heading/45)%8];}
