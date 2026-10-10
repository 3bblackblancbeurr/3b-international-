import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {apparitionPose,createApparitionClock} from './apparition-sequence.js';
function disposeModel(model){
 const geometry=new Set(),materials=new Set(),textures=new Set();
 model.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.isSkinnedMesh)o.skeleton.dispose();for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
 geometry.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());
}
/** Existing licensed 3B human, full rig and surface maps; no flat portrait. */
export function createApparitionArt({onReady=()=>{},onError=()=>{},onPhase=()=>{},load=url=>new GLTFLoader().loadAsync(url)}={}){
 const root=new THREE.Group(),body=new THREE.Group(),clock=createApparitionClock();root.add(body);
 const uniforms={time:{value:0},fade:{value:0}},materials=[];
 let disposed=false,model=null,mixer=null,ready=false,current=null,lastTime=null,animated=true,lastPhase='',actions={};
 const particlesGeometry=new THREE.BufferGeometry(),points=[];
 for(let i=0;i<150;i++){const angle=i*2.399,rad=.018+((i*17)%101)/101*.09;points.push(Math.cos(angle)*rad,((i*29)%151)/151*.39-.19,Math.sin(angle)*rad);}
 particlesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const particlesMaterial=new THREE.PointsMaterial({color:0x77dfff,size:.0018,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 const particles=new THREE.Points(particlesGeometry,particlesMaterial);body.add(particles);
 const ringGeometry=new THREE.RingGeometry(.047,.0485,64),ringMaterial=new THREE.MeshBasicMaterial({color:0x80ddff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=-.181;body.add(ring);
 const promise=load('/world/living/traveller-0.glb').then(asset=>{
  if(disposed){disposeModel(asset.scene);return;}
  model=asset.scene;
  model.traverse(o=>{const hair=o.name.match(/^Hair_(\d+)/),boots=o.name.match(/^Boots_(\d+)/);if(hair)o.visible=Number(hair[1])===3;if(boots)o.visible=Number(boots[1])===0;});
  mixer=new THREE.AnimationMixer(model);for(const clip of asset.animations)if(['Idle','Walk','Interact'].includes(clip.name))actions[clip.name]=mixer.clipAction(clip);
  if(!actions.Idle||!actions.Walk||!actions.Interact)throw Error('Les animations de cette apparition sont incomplètes.');
  actions.Idle.play();current='Idle';mixer.update(0);model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)throw Error('Le personnage ne peut pas être affiché.');
  const scale=.36/size.y;model.scale.multiplyScalar(scale);model.position.set(-center.x*scale,-.18-bounds.min.y*scale,-center.z*scale);
  model.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;
   o.material=[o.material].flat().map(material=>{
    const m=material.clone();material.dispose();m.transparent=true;m.depthWrite=false;m.side=THREE.FrontSide;m.roughness=.55;m.metalness=.12;
    m.onBeforeCompile=shader=>{
     shader.uniforms.holoTime=uniforms.time;shader.uniforms.holoFade=uniforms.fade;
     shader.vertexShader='varying vec3 holoWorld;varying vec3 holoNormal;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','holoWorld=(modelMatrix*vec4(transformed,1.0)).xyz;holoNormal=normalize(mat3(modelMatrix)*objectNormal);\n#include <project_vertex>');
     shader.fragmentShader='uniform float holoTime;uniform float holoFade;varying vec3 holoWorld;varying vec3 holoNormal;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float rim=pow(1.0-abs(dot(normalize(holoNormal),normalize(cameraPosition-holoWorld))),2.4);
      float luminance=dot(outgoingLight,vec3(.2126,.7152,.0722));
      float scan=pow(.5+.5*sin(holoWorld.y*650.0-holoTime*1.8),14.0);
      outgoingLight=mix(outgoingLight*.20,vec3(.018,.42,.72)*(.4+min(luminance,1.5)),.80)+vec3(.09,.65,1.0)*rim*.95+vec3(.025,.06,.08)*scan;
      diffuseColor.a=holoFade*(.70+.25*rim);if(diffuseColor.a<.008)discard;
      #include <opaque_fragment>`);
    };m.customProgramCacheKey=()=> '3b-echo-hologram-v1';materials.push(m);return m;
   });if(o.material.length===1)o.material=o.material[0];
  });
  body.add(model);ready=true;onReady();
 }).catch(error=>{if(!disposed)onError(error);});
 function update(time,reduced=false){
  if(disposed)return;const t=clock.advance(time,{visible:root.visible,ready}),pose=apparitionPose(t,{animated:animated&&!reduced});
  const dt=lastTime===null?0:Math.max(0,Math.min(.05,time-lastTime));lastTime=time;
  if(!ready||!root.visible)return;
  if(pose.clip!==current){const next=actions[pose.clip];next.reset().play();actions[current].crossFadeTo(next,.28,false);current=pose.clip;}
  if(!clock.paused&&animated&&!reduced)mixer.update(dt);
  uniforms.time.value=t;uniforms.fade.value=pose.opacity;body.position.set(pose.x,0,pose.z);body.rotation.y=pose.yaw;
  particles.rotation.y=t*.12;particles.position.y=pose.phase==='disparition'?(t-9.6)*.015:0;particlesMaterial.opacity=pose.done?0:pose.opacity*.3;
  ringMaterial.opacity=pose.opacity*.35;model.visible=pose.opacity>.001;
  if(pose.phase!==lastPhase){lastPhase=pose.phase;onPhase(pose.phase);}
 }
 return {root,promise,update,replay(){clock.restart();lastTime=null;},setPaused(value){clock.setPaused(value);},setAnimated(value){animated=!!value;clock.restart();lastTime=null;},dispose(){if(disposed)return;disposed=true;mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);disposeModel(model);}particlesGeometry.dispose();particlesMaterial.dispose();ringGeometry.dispose();ringMaterial.dispose();materials.forEach(m=>m.dispose());},get ready(){return ready;}};
}
