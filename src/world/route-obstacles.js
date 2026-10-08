import {obstacleDistance} from './collision.js';
import {citeSurfaceDistance} from './hub/platform-topology.js';

// Callbacks are reconstructed from explicit geometry, never evaluated as code.
export function restoreRouteObstacles(obstacles){
 return obstacles.map(o=>{
  if(!o.routeShape)return o;
  if(o.routeShape==='water')return{id:o.id,enabled:o.enabled,surfaceDistance:p=>-citeSurfaceDistance(p.x/o.scale,p.z/o.scale)*o.scale};
  if(o.routeShape==='inside')return{id:o.id,enabled:o.enabled,surfaceDistance:p=>-obstacleDistance(p,o.bounds)};
  throw Error('Unknown route collision: '+o.routeShape);
 });
}
