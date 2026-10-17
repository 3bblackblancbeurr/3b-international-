import * as THREE from 'three';
import {mergeIndexedGeometries} from './geometry-batch.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';
import {COUNTRIES} from './catalog.js';
import {finalCirclePhase,finalCircleMasteryMask} from './final-circle.js';

/** Eight inherited anchors react to accepted mastery. They are presentation,
 * with no new collision, attack zone, reward, timer or light source. */
export function createFinaleEnvironment({anchor={x:0,z:0},groundY=()=>0,reducedMotion=false}={}){
 const root=new THREE.Group();root.name='3B · Les huit ancrages du Lien';
 const base=groundY(anchor.x,anchor.z);root.position.set(anchor.x,base,anchor.z);root.visible=false;
 const owned=[],own=value=>(owned.push(value),value),matrix=new THREE.Matrix4(),color=new THREE.Color();
 const stone=own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentStone,roughness:.86}));
 const gold=own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentGold,roughness:.46,metalness:.66}));
 const memory=own(new THREE.MeshStandardMaterial({color:worldArtMaterials.dust,roughness:.48,metalness:.4,vertexColors:false}));
 const pedestalGeo=own(new THREE.CylinderGeometry(.76,.99,.65,8)),sealGeo=own(new THREE.OctahedronGeometry(.44,0));
 const pedestals=new THREE.InstancedMesh(pedestalGeo,stone,8),seals=new THREE.InstancedMesh(sealGeo,memory,8);
 pedestals.name='Huit socles';seals.name='Huit héritages';pedestals.castShadow=pedestals.receiveShadow=true;seals.castShadow=true;root.add(pedestals,seals);
 const points=COUNTRIES.map((country,i)=>{
  // All raised pieces sit on the open southern apron of the actual final
  // court, away from the solid monument north of its combat centre.
  const a=-1.25+i*2.5/7,x=Math.sin(a)*18,z=Math.cos(a)*18,y=groundY(anchor.x+x,anchor.z+z)-base;
  matrix.makeTranslation(x,y+.325,z);pedestals.setMatrixAt(i,matrix);
  matrix.makeRotationY(a);matrix.setPosition(x,y+1.24,z);seals.setMatrixAt(i,matrix);seals.setColorAt(i,color.set(worldRealmArt[country.id].cloth));
  return{x,y,z};
 });
 pedestals.instanceMatrix.needsUpdate=true;seals.instanceMatrix.needsUpdate=true;seals.instanceColor.needsUpdate=true;
 const segments=[],bridges=[];
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  const segment=new THREE.RingGeometry(10.3,10.48,12,1,a+.06,Math.PI/4-.12);segment.rotateX(-Math.PI/2);segments.push(segment);
  const bridge=new THREE.RingGeometry(10.3,10.48,3,1,a-.06,.12);bridge.rotateX(-Math.PI/2);bridges.push(bridge);
 }
 const ringGeometry=own(mergeIndexedGeometries(segments));segments.forEach(g=>g.dispose());
 const ring=new THREE.Mesh(ringGeometry,gold);ring.position.y=.065;root.add(ring);
 const bridgeGeometry=own(mergeIndexedGeometries(bridges));bridges.forEach(g=>g.dispose());
 const restoredRing=new THREE.Mesh(bridgeGeometry,gold);restoredRing.position.y=.066;restoredRing.visible=false;root.add(restoredRing);
 const linePositions=new Float32Array(8*6),lineColors=new Float32Array(8*6),lineGeometry=own(new THREE.BufferGeometry());
 lineGeometry.setAttribute('position',new THREE.BufferAttribute(linePositions,3));lineGeometry.setAttribute('color',new THREE.BufferAttribute(lineColors,3));
 const lineMaterial=own(new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.58,depthWrite:false}));
 const lines=new THREE.LineSegments(lineGeometry,lineMaterial);lines.frustumCulled=false;lines.name='Transmission des huit héritages';root.add(lines);
 let disposed=false,lastKey='';
 function tick(time,{encounter,save,player}={}){
  if(disposed)return;
  const fighting=!!encounter?.final&&!encounter.result,restored=!!save?.adventure?.finished||!!encounter?.final&&encounter.result==='victory';
  root.visible=(fighting||restored)&&(!player||Math.hypot(player.x-anchor.x,player.z-anchor.z)<200);if(!root.visible)return;
  const phase=fighting?finalCirclePhase(encounter)?.index||1:8,mastery=restored?255:finalCircleMasteryMask(encounter),key=phase+':'+mastery+':'+restored;
  if(key!==lastKey){
   lastKey=key;restoredRing.visible=restored;
   for(let i=0;i<8;i++){
    const complete=!!(mastery&(1<<i)),current=fighting&&i===phase-1,p=points[i],strength=complete?1:current?.8:.16;
    color.set(worldRealmArt[COUNTRIES[i].id].cloth).lerp(new THREE.Color(worldArtMaterials.dust),complete?.65:current?.3:0);
    seals.setColorAt(i,color);
    linePositions.set([p.x,p.y+1.24,p.z,0,restored?.12:5.9,0],i*6);
    color.multiplyScalar(strength);for(let end=0;end<2;end++)lineColors.set([color.r,color.g,color.b],i*6+end*3);
   }
   seals.instanceColor.needsUpdate=true;lineGeometry.attributes.position.needsUpdate=true;lineGeometry.attributes.color.needsUpdate=true;
  }
  // Restrained motion only; reduced-motion keeps a steady state and no flash.
  lines.material.opacity=reducedMotion?.58:.52+Math.sin((Number(time)||0)*.7)*.06;
  root.userData.presentation={phase,mastery,restored,fighting};
 }
 return{root,tick,get diagnostics(){return{anchors:8,meshes:4,lineSegments:8,collisions:0};},dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const resource of owned)resource.dispose();}};
}
