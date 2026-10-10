import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';

// The French investigation has a physical book, folded page, binding thread
// and seal at its existing interaction plinth. Three shared material batches.
export function createStoryRelic(item){
 if(item.region!=='france'||item.type!=='campaignObjective'||!['rumor','evidence','coordination','post'].includes(item.campaign?.phaseId))return null;
 const root=new THREE.Group(),owned=[],parts=[[],[],[]];root.name='Registre de Léa · page, couture et sceau';
 const materials=[new THREE.MeshStandardMaterial({color:worldRealmArt.france.cloth,roughness:.88}),new THREE.MeshStandardMaterial({color:worldArtMaterials.dust,roughness:.96}),new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentGold,roughness:.44,metalness:.55})];owned.push(...materials);
 const q=new THREE.Quaternion(),m=new THREE.Matrix4(),v=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);
 const piece=(geometry,x,y,z,roll,slot)=>{q.setFromAxisAngle(new THREE.Vector3(0,0,1),roll);v.set(x,y,z);m.compose(v,q,scale);const g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(m);parts[slot].push(g);if(g!==geometry)geometry.dispose();};
 piece(new THREE.BoxGeometry(1.3,.1,.92),0,.72,0,0,0);
 for(const side of [-1,1]){
  piece(new THREE.BoxGeometry(.57,.065,.79),side*.3,.8,0,side*.09,1);
  for(let row=0;row<5;row++)piece(new THREE.BoxGeometry(.4-row*.014,.004,.012),side*.3,.843+side*.3*Math.sin(side*.09),-.26+row*.09,side*.09,0);
 }
 piece(new THREE.BoxGeometry(.018,.018,.9),0,.85,0,0,2);
 for(let stitch=0;stitch<7;stitch++)piece(new THREE.BoxGeometry(.09,.012,.015),0,.86,-.33+stitch*.11,0,2);
 piece(new THREE.CylinderGeometry(.09,.09,.018,12),.41,.87,.25,0,2);
 for(let i=0;i<parts.length;i++){const geometry=mergeGeometries(parts[i]);parts[i].forEach(g=>g.dispose());owned.push(geometry);const mesh=new THREE.Mesh(geometry,materials[i]);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
 root.rotation.y=.2;root.position.y=-.17;
 return{root,dispose(){root.removeFromParent();owned.forEach(o=>o.dispose());}};
}
