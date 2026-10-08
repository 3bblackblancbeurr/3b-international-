import {findPath,findInteractionPath} from './navigation.js';
import {restoreRouteObstacles} from './route-obstacles.js';

self.onmessage=({data})=>{
 const {id,start,destination,interaction,obstacles,radius}=data;
 try{const path=(interaction?findInteractionPath:findPath)(start,destination,restoreRouteObstacles(obstacles),radius);self.postMessage({id,path});}
 catch(error){self.postMessage({id,error:error.message||String(error)});}
};
