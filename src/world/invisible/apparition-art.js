import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {apparitionPose,createApparitionClock} from './apparition-sequence.js';
function disposeModel(model){
 const geometry=new Set(),materials=new Set(),textures=new Set();
 model.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.isSkinnedMesh)o.skeleton.dispose();for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
 geometry.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());
}
/** Existing licensed 3B human, full rig and surface maps; no flat portrait. */
export function createApparitionArt({onReady=()=>{},onError=()=>{},onPhase=()=>{},load=url=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)}={}){
 const root=new THREE.Group(),body=new THREE.Group(),clock=createApparitionClock();root.add(body);
 let depthTexture=new THREE.DataTexture(new Float32Array([0]),1,1,THREE.RedFormat,THREE.FloatType);depthTexture.minFilter=depthTexture.magFilter=THREE.NearestFilter;depthTexture.needsUpdate=true;
 const uniforms={time:{value:0},fade:{value:0},depth:{value:depthTexture},depthOn:{value:0},depthMatrix:{value:new THREE.Matrix4()},depthScale:{value:1},viewport:{value:new THREE.Vector4(0,0,1,1)}},materials=[];
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
    const skin=/Skin|Hands/.test(material.name),eyes=/EyeColor/.test(material.name),hair=/HairColor/.test(material.name);
    const tint=new THREE.Color(skin?0x65cbe9:eyes?0x182e45:hair?0x245d7c:0x2488b8);
    const m=material.clone();material.dispose();m.transparent=true;m.depthWrite=true;m.side=THREE.FrontSide;
    // Preserve the shipped normal/colour maps without turning cloth and skin into metal.
    m.roughness=skin?.82:eyes?.36:hair?.85:.7;m.metalness=0;
    m.onBeforeCompile=shader=>{
     shader.uniforms.holoTime=uniforms.time;shader.uniforms.holoFade=uniforms.fade;shader.uniforms.holoDepth=uniforms.depth;shader.uniforms.holoDepthOn=uniforms.depthOn;shader.uniforms.holoDepthMatrix=uniforms.depthMatrix;shader.uniforms.holoDepthScale=uniforms.depthScale;shader.uniforms.holoViewport=uniforms.viewport;
     shader.uniforms.holoTint={value:tint};shader.uniforms.holoRim={value:skin?.24:eyes?.08:.46};shader.uniforms.holoScan={value:skin||eyes||hair?0:.018};
     shader.vertexShader='varying vec3 holoWorld;varying vec3 holoNormal;varying float holoViewDepth;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','holoWorld=(modelMatrix*vec4(transformed,1.0)).xyz;holoNormal=normalize(mat3(modelMatrix)*objectNormal);holoViewDepth=-(modelViewMatrix*vec4(transformed,1.0)).z;\n#include <project_vertex>');
     shader.fragmentShader='uniform vec3 holoTint;uniform float holoRim;uniform float holoScan;uniform float holoTime;uniform float holoFade;uniform sampler2D holoDepth;uniform float holoDepthOn;uniform mat4 holoDepthMatrix;uniform float holoDepthScale;uniform vec4 holoViewport;varying vec3 holoWorld;varying vec3 holoNormal;varying float holoViewDepth;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`if(holoDepthOn>.5){vec2 screen=(gl_FragCoord.xy-holoViewport.xy)/holoViewport.zw;screen.y=1.0-screen.y;vec4 samplePoint=holoDepthMatrix*vec4(screen,0.,1.);vec2 uv=samplePoint.xy/samplePoint.w;if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))){float realDepth=texture2D(holoDepth,uv).r*holoDepthScale;if(realDepth>0.&&holoViewDepth>realDepth+.025)discard;}}
      float rim=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),3.2);
      float luminance=dot(outgoingLight,vec3(.2126,.7152,.0722));
      float scan=pow(.5+.5*sin(holoWorld.y*650.0-holoTime*1.8),14.0);
      outgoingLight=mix(outgoingLight*.28,holoTint*(.24+min(luminance,2.0)*1.15),.88)+vec3(.12,.65,1.0)*rim*holoRim+vec3(.2,.65,1.0)*scan*holoScan;
      diffuseColor.a=min(1.0,holoFade/.86)*.97;if(diffuseColor.a<.008)discard;
      #include <opaque_fragment>`);
    };m.customProgramCacheKey=()=> '3b-echo-hologram-v2';materials.push(m);return m;
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
  uniforms.time.value=t;uniforms.fade.value=pose.opacity;body.position.set(pose.x,0,.04+pose.z);body.rotation.y=pose.yaw;
  particles.rotation.y=t*.12;particles.position.y=pose.phase==='disparition'?(t-9.6)*.015:0;particlesMaterial.opacity=pose.done?0:pose.opacity*.3;
  ringMaterial.opacity=pose.opacity*.35;model.visible=pose.opacity>.001;
  if(pose.phase!==lastPhase){lastPhase=pose.phase;onPhase(pose.phase);}
 }
 return {root,promise,update,setDepth(depth,viewport){uniforms.depthOn.value=0;if(!depth||!viewport||viewport.z<=0||viewport.w<=0)return;
  if(depthTexture.image.width!==depth.width||depthTexture.image.height!==depth.height){depthTexture.dispose();depthTexture=new THREE.DataTexture(depth.data.slice(),depth.width,depth.height,THREE.RedFormat,THREE.FloatType);depthTexture.minFilter=depthTexture.magFilter=THREE.NearestFilter;uniforms.depth.value=depthTexture;}else depthTexture.image.data.set(depth.data);
  depthTexture.needsUpdate=true;uniforms.depthMatrix.value.fromArray(depth.matrix);uniforms.depthScale.value=depth.scale;uniforms.viewport.value.copy(viewport);uniforms.depthOn.value=1;
 },replay(){clock.restart();lastTime=null;},setPaused(value){clock.setPaused(value);},setAnimated(value){animated=!!value;clock.restart();lastTime=null;},dispose(){if(disposed)return;disposed=true;depthTexture.dispose();mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);disposeModel(model);}particlesGeometry.dispose();particlesMaterial.dispose();ringGeometry.dispose();ringMaterial.dispose();materials.forEach(m=>m.dispose());},get ready(){return ready;}};
}
