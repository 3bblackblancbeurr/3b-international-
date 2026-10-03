import {PlaneGeometry} from 'three';
import {isRelief,terrainHeight} from './city3b-landscape.js';
// Flat cities need four vertices. Tessellate only when a player has authored relief.
export function cityTerrainGeometry(half,features,{segments}={}){
 const resolution=segments??(features.some(isRelief)?Math.min(256,Math.ceil(half/2)):1);
 const geometry=new PlaneGeometry(half*2,half*2,resolution,resolution);geometry.rotateX(-Math.PI/2);
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setY(i,terrainHeight(features,positions.getX(i),positions.getZ(i))-.05);
 geometry.computeVertexNormals();return geometry;
}
