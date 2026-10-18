import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';

// Four physical French investigation objects, corresponding to four actual
// campaign phases. These are visual interaction markers, NOT automatic rewards
// or shortcuts. Each stage is batched to exactly three material draws.
const STAGES=Object.freeze({
 rumor:'Registre de Léa · témoignages',
 evidence:'Archives · date, couture et sceau',
 coordination:'Les deux plateaux · réparation juste',
 post:'Le nom rendu · dossier restauré',
});
export const FRANCE_RELIC_STAGES=STAGES;

export function createStoryRelic(item){
 const phase=item?.campaign?.phaseId;
 if(item?.region!=='france'||item?.type!=='campaignObjective'||!STAGES[phase])return null;
 const root=new THREE.Group(),owned=[],parts=[[],[],[]];
 root.name='3B · '+STAGES[phase];root.userData.artifactPhase=phase;
 const materials=[
  new THREE.MeshStandardMaterial({color:worldRealmArt.france.cloth,roughness:.88}),
  new THREE.MeshStandardMaterial({color:worldArtMaterials.dust,roughness:.96}),
  new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentGold,roughness:.44,metalness:.55}),
 ];
 owned.push(...materials);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);
 const put=(geometry,x,y,z,angle,slot)=>{
  q.setFromAxisAngle(new THREE.Vector3(0,0,1),angle);pos.set(x,y,z);matrix.compose(pos,q,scale);
  const prepared=geometry.index?geometry.toNonIndexed():geometry;
  if(prepared!==geometry)geometry.dispose();
  prepared.applyMatrix4(matrix);parts[slot].push(prepared);
 };
 const block=(slot,x,y,z,w,h,d,roll=0)=>put(new THREE.BoxGeometry(w,h,d),x,y,z,roll,slot);
 const disk=(slot,x,y,z,r,h=.026)=>put(new THREE.CylinderGeometry(r,r,h,12),x,y,z,0,slot);
 // Never place any item beyond the plinth's small local visual footprint.
 block(0,0,.58,0,1.4,.16,1.0);
 if(phase==='rumor'){
  block(0,0,.69,0,1.26,.08,.9);
  for(const side of [-1,1]){
   block(1,side*.29,.76,0,.55,.046,.76,side*.09);
   for(let line=0;line<6;line++)block(0,side*.29,.796,-.23+line*.085,.35-line%3*.035,.006,.009,side*.09);
  }
  block(2,0,.81,0,.018,.018,.87);
  for(let stitch=0;stitch<7;stitch++)block(2,0,.825,-.30+stitch*.10,.075,.012,.012);
  disk(2,.41,.82,.22,.08);
 }else if(phase==='evidence'){
  // A recovered folio, comparison sheets, their binding thread and wax.
  block(0,0,.69,0,1.24,.10,.84);
  for(const side of [-1,1]){
   block(1,side*.25,.768,side*.06,.49,.021,.68,side*.035);
   for(let line=0;line<7;line++)block(0,side*.25,.789,-.18+line*.058,.31-line%3*.022,.004,.008);
  }
  for(let stitch=0;stitch<8;stitch++)block(2,0,.808,-.27+stitch*.075,.07,.008,.012);
  disk(2,.43,.816,.22,.095);disk(2,-.45,.816,-.21,.055);
  block(2,0,.817,-.285,.85,.009,.018);
 }else if(phase==='coordination'){
  // A miniature balancing mechanism: two plates visibly connected by a beam.
  block(0,0,.70,0,.40,.12,.42);
  block(0,0,1.06,0,.12,.68,.12);
  block(2,0,1.43,0,1.15,.045,.075);
  disk(2,0,1.44,0,.085);
  for(const side of [-1,1]){
   block(2,side*.48,1.27,0,.026,.32,.026);
   disk(1,side*.48,1.105,0,.29,.035);
   disk(2,side*.48,1.133,0,.10,.028);
  }
 }else if(phase==='post'){
  // The restored dossier is closed and signed. Its seal is prominent.
  block(0,0,.72,0,1.18,.17,.87);
  block(1,0,.824,0,1.08,.037,.78);
  for(let line=0;line<5;line++)block(0,-.08,.849,-.21+line*.085,.62-line%2*.1,.005,.009);
  block(2,-.52,.835,0,.045,.055,.73);
  disk(2,.36,.854,.18,.115,.025);
  block(2,.36,.874,.18,.18,.01,.022);
 }
 for(let i=0;i<parts.length;i++){
  const geometry=mergeGeometries(parts[i]);parts[i].forEach(p=>p.dispose());
  if(!geometry)throw Error('France campaign relic material group missing: '+phase+':'+i);
  owned.push(geometry);
  const mesh=new THREE.Mesh(geometry,materials[i]);mesh.castShadow=mesh.receiveShadow=true;
  mesh.name=STAGES[phase]+' · layer '+i;root.add(mesh);
 }
 // The plinth tops out at y=.5; keep the entire visual above its surface.
 root.rotation.y=.2;root.position.y=0;
 let disposed=false;
 return {root,phase,dispose(){
  if(disposed)return;disposed=true;root.removeFromParent();
  for(const resource of owned)resource.dispose();
 }};
}
