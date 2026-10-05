import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {cityWaterGeometry,CITY_WATER_LEVEL} from './city3b-water-geometry.js';

export function cityWaterQuality(mobile=false,tier=0){
 const level=Math.max(0,Math.min(2,Number(tier)||0));
 return {detail:[1,.65,.3][level],reflectionSize:level===2?0:mobile?[256,128][level]:[512,256][level],reflectionHz:mobile?[5,3,0][level]:[12,6,0][level]};
}

function normalTexture(seed){
 const size=128,data=new Uint8Array(size*size*4),tau=Math.PI*2;
 const waves=[[2,3,.42],[5,-3,.28],[-4,7,.17],[9,5,.08],[-12,11,.05]];
 const height=(x,z)=>waves.reduce((sum,[dx,dz,a],i)=>sum+Math.sin((x*dx+z*dz)*tau/size+seed*(i+1)*1.71)*a,0);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const normal=new THREE.Vector3((height(x-1,z)-height(x+1,z))*1.5,1,(height(x,z-1)-height(x,z+1))*1.5).normalize(),i=(z*size+x)*4;
  data[i]=(normal.x*.5+.5)*255;data[i+1]=(normal.z*.5+.5)*255;data[i+2]=(normal.y*.5+.5)*255;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function createCityPremiumWater({noise,atmosphere,time,night,extent,mobile=false}){
 const normalA=normalTexture(1.4),normalB=normalTexture(4.7),contacts=Array.from({length:24},()=>new THREE.Vector4());
 const uniforms={uTime:time,uNight:night,uExtent:extent,uNormalA:{value:normalA},uNormalB:{value:normalB},uDetail:{value:1},uReflection:{value:normalA},uReflectionMatrix:{value:new THREE.Matrix4()},uReflectionReady:{value:0},uContacts:{value:contacts},uContactCount:{value:0}};
 const material=new THREE.ShaderMaterial({name:'City 3B · depth / current / reflected atmosphere',side:THREE.DoubleSide,uniforms,
  vertexShader:`attribute vec4 aWaterInfo;varying vec4 waterInfo;varying vec3 world;varying vec4 mirrorCoord;uniform mat4 uReflectionMatrix;
  void main(){world=(modelMatrix*vec4(position,1.)).xyz;waterInfo=aWaterInfo;mirrorCoord=uReflectionMatrix*vec4(world,1.);gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
  fragmentShader:`uniform float uTime,uNight,uExtent,uDetail,uReflectionReady;uniform sampler2D uNormalA,uNormalB,uReflection;uniform vec4 uContacts[24];uniform int uContactCount;varying vec4 waterInfo;varying vec3 world;varying vec4 mirrorCoord;
  ${noise}
  ${atmosphere}
  void main(){
   vec2 p=world.xz,flow=waterInfo.zw;float river=min(1.,length(flow));
   float shore=max(0.,waterInfo.x),depth=max(.035,waterInfo.y);
   float footprint=max(length(dFdx(p)),length(dFdy(p)));
   float detail=(1.-smoothstep(.35,2.8,footprint))*uDetail;
   float bankFade=smoothstep(0.,1.2,shore);
   vec2 drift=flow*uTime*.32;
   vec2 uvA=(p-drift)*.035+vec2(uTime*.004,-uTime*.003);
   vec2 uvB=(p-drift*1.27)*.092+vec2(-uTime*.005,uTime*.004);
   vec2 small=(texture2D(uNormalA,uvA).rg*2.-1.)*.22+(texture2D(uNormalB,uvB).rg*2.-1.)*.10*detail;
   float a=dot(p,vec2(.16,.09))-uTime*.65,b=dot(p,vec2(-.28,.20))+uTime*.43;
   vec2 slope=(small+vec2(.16,.09)*cos(a)*.075+vec2(-.28,.20)*cos(b)*.055)*mix(.35,1.,bankFade);
   vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),eye=normalize(cameraPosition-world);
   float ndv=max(dot(n,eye),.001),fresnel=.0204+.9796*pow(1.-ndv,5.);
   // Virtual riverbed: no transparent sorting and no extra full-scene refraction pass.
   // Beer-Lambert absorption hides the bottom naturally as depth increases.
   vec3 refracted=refract(-eye,n,1./1.333);
   vec2 bed=p+refracted.xz*depth/max(.25,-refracted.y);
   float grain=noise(bed*3.4),sand=clouds(bed*.34),pebble=pow(max(0.,1.-abs(grain-.48)*5.),3.);
   vec3 bottom=mix(vec3(.38,.34,.22),vec3(.55,.53,.39),sand);
   bottom*=1.+(grain-.5)*.22*detail;bottom=mix(bottom,vec3(.24,.30,.27),pebble*.22*detail);
   float c1=sin(bed.x*1.31+sin(bed.y*.88+uTime*.53))+sin(bed.y*1.13-uTime*.47);
   float c2=sin(bed.x*1.06-bed.y*.74-uTime*.41)+sin(bed.y*1.48+uTime*.38);
   float caustic=pow(clamp(1.-abs(c1)*.72,0.,1.),6.)*pow(clamp(1.-abs(c2)*.5,0.,1.),3.);
   bottom+=vec3(.22,.29,.22)*caustic*detail*exp(-depth*.48)*bankFade;
   vec3 absorption=exp(-vec3(.9,.45,.32)*depth/max(.45,-refracted.y));
   vec3 body=bottom*absorption+vec3(.012,.10,.12)*(1.-absorption);
   vec3 reflectionDirection=reflect(-eye,n),reflection=atmosphere(reflectionDirection,uTime);
   reflection=mix(reflection,reflection*vec3(.24,.33,.51),uNight);
   vec2 reflectionUv=mirrorCoord.xy/max(.0001,mirrorCoord.w)+slope*.016;
   float bounds=step(.002,reflectionUv.x)*step(reflectionUv.x,.998)*step(.002,reflectionUv.y)*step(reflectionUv.y,.998)*step(0.,mirrorCoord.w);
   vec3 sceneReflection=texture2D(uReflection,clamp(reflectionUv,vec2(.002),vec2(.998))).rgb;
   reflection=mix(reflection,sceneReflection,uReflectionReady*bounds*.92);
   body*=1.-uNight*.66;vec3 color=mix(body,reflection,fresnel);
   vec3 light=normalize(vec3(-100.,170.,80.));
   float spec=max(dot(n,normalize(light+eye)),0.);
   float sparkle=pow(spec,180.)*detail+pow(spec,36.)*.10;
   color+=vec3(.85,.72,.48)*sparkle*(1.-uNight*.94)*bankFade;
   float crest=smoothstep(.95,1.,sin(a)*.65+sin(b)*.35)*detail;
   color+=crest*vec3(.012,.024,.025);
   float wave=sin(dot(p,vec2(.81,.43))-uTime*1.1)*.09;
   float lace=noise((p-drift)*1.7+vec2(uTime*.06,0.));
   float shoreFoam=(1.-smoothstep(.04,.45,shore+wave))*smoothstep(.45,.78,lace)*.25;
   float contactFoam=0.;
   for(int i=0;i<24;i++){if(i>=uContactCount)break;vec2 delta=p-uContacts[i].xy;float distanceToContact=length(delta);float wake=exp(-distanceToContact/max(.1,uContacts[i].z));contactFoam=max(contactFoam,wake*smoothstep(.40,.82,lace)*uContacts[i].w);}
   float foam=max(shoreFoam,contactFoam*.35*river)*detail;
   color=mix(color,vec3(.74,.82,.76)*(1.-uNight*.65),foam);
   float mist=smoothstep(uExtent*2.2,uExtent*5.4,length(cameraPosition-world));color=mix(color,vec3(.70,.80,.87)*(1.-uNight*.6),mist);
   gl_FragColor=vec4(max(color,0.),1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const bankMaterial=new THREE.MeshStandardMaterial({name:'City 3B · damp mineral banks',color:0xa8b09a,vertexColors:true,roughness:.93,metalness:0,side:THREE.DoubleSide});
 const stoneMaterial=new THREE.MeshStandardMaterial({name:'City 3B · wet shoreline stones',color:0x737e73,roughness:.55,metalness:0});
 const reedMaterial=new THREE.MeshStandardMaterial({name:'City 3B · shoreline reeds',color:0x566e3c,roughness:.92,metalness:0});
 const group=new THREE.Group();group.name='City 3B · continuous premium water';
 let geometries=[],quality=cityWaterQuality(mobile),reflector=null,lastCapture=-Infinity,capturing=false,reflectionFailed=false,surfaceMeshes=[];
 const frustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4(),worldSphere=new THREE.Sphere(),reflectorInverse=new THREE.Matrix4();
 const lastCamera=new THREE.Matrix4(),lastProjection=new THREE.Matrix4();
 function resetCapture(){uniforms.uReflectionReady.value=0;lastCapture=-Infinity;}
 function disposeReflection(){if(reflector){reflector.getRenderTarget().dispose();reflector.geometry.dispose();reflector.material.dispose();reflector=null;}resetCapture();uniforms.uReflection.value=normalA;}
 function setQuality(tier=0){quality=cityWaterQuality(mobile,tier);uniforms.uDetail.value=quality.detail;
  if(reflectionFailed)quality={...quality,reflectionSize:0,reflectionHz:0};
  if(!quality.reflectionSize){disposeReflection();return;}
  if(reflector&&reflector.getRenderTarget().width!==quality.reflectionSize)disposeReflection();
 }
 function rebuild(features,half,networks=[]){
  group.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.dispose();});group.clear();for(const g of geometries)g.dispose();geometries=[];surfaceMeshes=[];
  const surfaces=cityWaterGeometry(features,half);
  for(const [name,g,m] of [['ocean',surfaces.ocean,material],['inland',surfaces.inland,material],['banks',surfaces.banks,bankMaterial]])if(g){
   geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.name=`City 3B · ${name}`;mesh.receiveShadow=m===bankMaterial;group.add(mesh);if(m===material)surfaceMeshes.push(mesh);
  }
  // Two bounded instanced draws enrich close views without one object per blade.
  // Details stay inside the saved water footprint and do not create obstacles.
  const stones=[],reeds=[],limit=mobile?96:192,random=seed=>{const n=Math.sin(seed*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  surfaces.field.features.forEach((f,index)=>{
   const dx=f.x2-f.x1,dz=f.z2-f.z1,length=Math.hypot(dx,dz),r=f.width/2,count=Math.min(12,Math.max(4,Math.ceil((length+r*2)/12)));
   for(let i=0;i<count&&stones.length<limit;i++){
    const seed=index*997+i*71,t=(i+.3+random(seed)*.4)/count,side=i%2?1:-1,angle=t*Math.PI*2;
    const x=f.kind==='lake'?(f.x1+f.x2)/2+Math.cos(angle)*(r-.12):f.x1+dx*t-(length?dz/length:0)*side*(r-.12);
    const z=f.kind==='lake'?(f.z1+f.z2)/2+Math.sin(angle)*(r-.12):f.z1+dz*t+(length?dx/length:1)*side*(r-.12);
    if(surfaces.field.sample(x,z).shore>.5)continue;
    const scale=.16+random(seed+3)*.22;stones.push({x,z,scale,angle:random(seed+5)*Math.PI});
    if(random(seed+11)>.5)for(let blade=0;blade<3;blade++)reeds.push({x:x+(random(seed+blade+17)-.5)*.2,z:z+(random(seed+blade+29)-.5)*.2,height:.35+random(seed+blade+31)*.6,lean:(random(seed+blade+37)-.5)*.3});
   }
  });
  const transform=new THREE.Object3D();
  if(stones.length){const geometry=new THREE.IcosahedronGeometry(1,1),mesh=new THREE.InstancedMesh(geometry,stoneMaterial,stones.length);geometries.push(geometry);mesh.name='City 3B · shoreline stones';
   stones.forEach((s,i)=>{transform.position.set(s.x,.065,s.z);transform.rotation.set(.1,s.angle,.05);transform.scale.set(s.scale,s.scale*.45,s.scale*.7);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;group.add(mesh);
  }
  if(reeds.length){const geometry=new THREE.ConeGeometry(1,1,4),mesh=new THREE.InstancedMesh(geometry,reedMaterial,reeds.length);geometries.push(geometry);mesh.name='City 3B · shoreline reeds';
   reeds.forEach((s,i)=>{transform.position.set(s.x,s.height/2-.02,s.z);transform.rotation.set(s.lean,s.x+s.z,s.lean*.5);transform.scale.set(.035,s.height,.035);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  let count=0;
  for(const f of networks.filter(f=>f.kind==='bridge'))for(const t of [.2,.5,.8]){if(count>=contacts.length)break;const x=f.x1+(f.x2-f.x1)*t,z=f.z1+(f.z2-f.z1)*t;if(surfaces.field.sample(x,z).depth>.05)contacts[count++].set(x,z,Math.max(.5,f.width*.3),.8);}
  uniforms.uContactCount.value=count;resetCapture();
 }
 function capture(renderer,scene,camera,seconds,{exclude=[],reduced=false}={}){
  if(capturing||!quality.reflectionSize||camera.position.y<=CITY_WATER_LEVEL+.02)return false;
  camera.updateMatrixWorld();
  const moved=!lastCamera.equals(camera.matrixWorld)||!lastProjection.equals(camera.projectionMatrix);
  if(uniforms.uReflectionReady.value&&(reduced&&!moved||seconds-lastCapture<1/quality.reflectionHz))return false;
  viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(viewProjection);
  group.updateMatrixWorld(true);
  if(!surfaceMeshes.some(mesh=>{worldSphere.copy(mesh.geometry.boundingSphere).applyMatrix4(mesh.matrixWorld);return frustum.intersectsSphere(worldSphere);}))return false;
  if(!reflector){
   reflector=new Reflector(new THREE.PlaneGeometry(1,1),{textureWidth:quality.reflectionSize,textureHeight:quality.reflectionSize,multisample:0,clipBias:.003});
   reflector.rotateX(-Math.PI/2);reflector.position.y=CITY_WATER_LEVEL;reflector.updateMatrixWorld(true);
   reflector.getRenderTarget().texture.name='City 3B · linear scene reflection';
   if(!renderer.extensions?.has('EXT_color_buffer_float'))reflector.getRenderTarget().texture.type=THREE.UnsignedByteType;
   uniforms.uReflection.value=reflector.getRenderTarget().texture;
  }
  const hidden=[...new Set([group,...exclude])].map(object=>[object,object.visible]);
  const target=renderer.getRenderTarget(),xr=renderer.xr.enabled,shadowAuto=renderer.shadowMap.autoUpdate,viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),scissorTest=renderer.getScissorTest();
  try{
   capturing=true;for(const [object] of hidden)object.visible=false;
   // Reflector uses oblique near-plane clipping and linear half-float colour.
   // Shadow maps are reused; HUD/ghost/grid never appear in the water.
   reflector.onBeforeRender(renderer,scene,camera);
   // Reflector's matrix expects reflector-local coordinates; our batched
   // surfaces pass world coordinates, so remove the local transform.
   uniforms.uReflectionMatrix.value.copy(reflector.material.uniforms.textureMatrix.value).multiply(reflectorInverse.copy(reflector.matrixWorld).invert());
   uniforms.uReflectionReady.value=1;lastCapture=seconds;lastCamera.copy(camera.matrixWorld);lastProjection.copy(camera.projectionMatrix);return true;
  }catch{
   // A failed offscreen pass must never interrupt construction or city input.
   // Keep that fallback across LOD changes until this renderer is remounted.
   reflectionFailed=true;disposeReflection();quality={...quality,reflectionSize:0,reflectionHz:0};return false;
  }finally{
   renderer.setRenderTarget(target);renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadowAuto;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
   for(const [object,visible] of hidden)object.visible=visible;capturing=false;
  }
 }
 setQuality();
 return {material,group,rebuild,capture,setQuality,resetCapture,dispose(){group.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.dispose();});group.clear();for(const g of geometries)g.dispose();geometries=[];surfaceMeshes=[];disposeReflection();material.dispose();bankMaterial.dispose();stoneMaterial.dispose();reedMaterial.dispose();normalA.dispose();normalB.dispose();}};
}
