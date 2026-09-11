import * as THREE from 'three';

export function threatKind(encounter){
 if(!encounter||encounter.result||encounter.pact)return null;
 if(encounter.intent==='soin')return 'healing';
 if(encounter.intent==='rempart')return 'shield';
 return ['rituel','gel','éclipse','sable','vague'].includes(encounter.intent)?'area':'strike';
}

// A readable preview of the accepted encounter's next reaction. No fake timer,
// hit box or damage: this layer describes the tactical rules used by the server.
export function createCombatTelegraph({reducedMotion=false}={}){
 const root=new THREE.Group();root.name='Enemy intent';root.visible=false;
 const materials=[],geometries=[];
 const make=(geometry,color,opacity)=>{
  geometries.push(geometry);const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});materials.push(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;root.add(mesh);return mesh;
 };
 const sector=make(new THREE.RingGeometry(.65,4.8,36,1,Math.PI*.24,Math.PI*.52),'#ef8658',.19);
 const outline=make(new THREE.RingGeometry(4.72,4.85,40,1,Math.PI*.24,Math.PI*.52),'#ffc49e',.85);
 const area=make(new THREE.RingGeometry(3.55,3.75,48),'#ef9c69',.7);
 const rune=make(new THREE.RingGeometry(1.05,1.18,6),'#ade2cd',.8);
 return{root,update(encounter,time,hero,enemy,busy=false){
  const kind=threatKind(encounter);root.visible=!!kind&&!busy;if(!root.visible)return;
  const pulse=reducedMotion?1:.85+Math.sin(time*3)*.15;
  root.position.set(enemy.x,enemy.y+.12,enemy.z);root.rotation.y=Math.atan2(hero.x-enemy.x,hero.z-enemy.z);
  // RingGeometry's local +Y points towards local -Z after laying it flat.
  sector.rotation.z=outline.rotation.z=Math.PI;
  sector.visible=outline.visible=kind==='strike';area.visible=kind!=='strike';rune.visible=kind==='shield'||kind==='healing';
  sector.material.opacity=.19*pulse;outline.material.opacity=.8*pulse;area.material.opacity=.7*pulse;
  area.material.color.set(kind==='healing'?'#84e4ad':kind==='shield'?'#8cceeb':'#efa86f');rune.material.color.copy(area.material.color);
  area.scale.setScalar(kind==='healing'?.7:kind==='shield'?.55:1);rune.rotation.z=reducedMotion?0:time*.2;
 },dispose(){materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());root.removeFromParent();}};
}
