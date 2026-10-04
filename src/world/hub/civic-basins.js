import * as THREE from 'three';

export const CIVIC_BASIN_PROFILE=Object.freeze({
 centers:Object.freeze([[48,48],[-48,48],[48,-48],[-48,-48]].map(point=>Object.freeze(point))),
 waterRadius:13.96,outerRadius:14.72,collisionRadius:14.8,
 floorTop:.156,waterLevel:.44,rimTop:.70,waveAmp:.35,
 // This deliberately exceeds the sum of the shader's weighted amplitudes.
 // It remains safe even if each of its three wave terms reaches ±1 together.
 maximumWave:.395*.35,
});

/** A local setting for the four basins and the shared central fountain.
 * Reflections remain the existing analytic sky; no render target is added. */
export function configureCivicPoolWater(poolWater){
 const u=poolWater?.material?.uniforms;if(!u)return false;
 u.waveAmp.value=CIVIC_BASIN_PROFILE.waveAmp;
 u.normalStrength.value=.16;u.foamAmount.value=.24;u.reflectionAmount.value=.58;
 u.deepColor.value.set('#0d465a');u.shallowColor.value.set('#286e7b');
 return true;
}

/** An opaque bed covers the paving beneath water. The annular wall is hollow,
 * and all of its geometry stays inside the already reserved collision circle. */
export function addCivicBasins({mesh,geo,cylinder,materials,collisions,owned=[]}){
 const {stone,gold,water}=materials,p=CIVIC_BASIN_PROFILE;
 const bedMaterial=new THREE.MeshStandardMaterial({color:'#538d90',roughness:.94,metalness:0,envMapIntensity:.15});owned.push(bedMaterial);
 // Lathe winding must face up on the crown and out on the outer wall. Keeping
 // FrontSide lets the ordinary stone material render both visible surfaces.
 const profile=[[14.0,.15],[14.0,.59],[14.14,p.rimTop],[14.56,p.rimTop],[p.outerRadius,.56],[p.outerRadius,.12],[14.61,0],[14.0,0]].map(([r,y])=>new THREE.Vector2(r,y)).reverse();
 const wallGeometry=geo(new THREE.LatheGeometry(profile,64));
 const uv=wallGeometry.attributes.uv,positions=wallGeometry.attributes.position;
 // Physical stone scale on the wall rather than stretching one paving tile.
 for(let i=0;i<positions.count;i++)uv.setXY(i,Math.atan2(positions.getZ(i),positions.getX(i))*14.4/4,positions.getY(i)/4);
 const bedGeometry=geo(new THREE.CircleGeometry(13.98,64)),waterGeometry=geo(new THREE.CircleGeometry(p.waterRadius,64)),lipGeometry=geo(new THREE.TorusGeometry(14.36,.045,5,64));
 const waterSurfaces=[],floorSurfaces=[],walls=[];
 for(const [x,z] of p.centers){
  mesh(cylinder,stone,x,.075,z,p.outerRadius,.15,p.outerRadius);
  const floor=mesh(bedGeometry,bedMaterial,x,p.floorTop,z);floor.rotation.x=-Math.PI/2;floor.castShadow=false;floor.name='Fond du bassin civique';floorSurfaces.push(floor);
  const wall=mesh(wallGeometry,stone,x,0,z);wall.name='Berge du bassin civique';walls.push(wall);
  const lip=mesh(lipGeometry,gold,x,p.rimTop+.005,z);lip.rotation.x=-Math.PI/2;lip.name='Couronne du bassin civique';
  const surface=mesh(waterGeometry,water,x,p.waterLevel,z);surface.rotation.x=-Math.PI/2;surface.castShadow=surface.receiveShadow=false;surface.name='Eau du bassin civique';waterSurfaces.push(surface);
  collisions.push({x,z,r:p.collisionRadius});
 }
 return {count:p.centers.length,waterSurfaces,floorSurfaces,walls,profile:p};
}
