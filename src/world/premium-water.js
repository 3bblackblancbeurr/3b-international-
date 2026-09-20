import * as THREE from 'three';

const QUALITY={
 low:{quality:.34,waveAmp:.58,normalStrength:.16,foam:.22,reflection:.42,mist:0,sceneReflection:0,reflectionSize:0,reflectionHz:0},
 medium:{quality:.68,waveAmp:.82,normalStrength:.23,foam:.48,reflection:.68,mist:.035,sceneReflection:0,reflectionSize:0,reflectionHz:0},
 high:{quality:1,waveAmp:1,normalStrength:.31,foam:.78,reflection:1,mist:.07,sceneReflection:.72,reflectionSize:512,reflectionHz:18},
};

function qualityProfile(mode){
 if(mode==='fluid'||mode==='low')return QUALITY.low;
 if(mode==='detail'||mode==='high')return QUALITY.high;
 return QUALITY.medium;
}

function heightAt(x,y,seed){
 return Math.sin((x+seed*3.1)*.31)+Math.cos((y-seed*1.7)*.27)+
  Math.sin((x+y+seed)*.13)*.62+Math.cos((x*1.7-y*.9+seed)*.071)*.38;
}

function createNormalMap(size=64,seed=1){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const l=heightAt(x-1,y,seed),r=heightAt(x+1,y,seed),d=heightAt(x,y-1,seed),u=heightAt(x,y+1,seed);
  const nx=(l-r)*.42,ny=(d-u)*.42,nz=1;
  const inv=1/Math.hypot(nx,ny,nz),i=(y*size+x)*4;
  data[i]=Math.round((nx*inv*.5+.5)*255);
  data[i+1]=Math.round((ny*inv*.5+.5)*255);
  data[i+2]=Math.round((nz*inv*.5+.5)*255);
  data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;
 texture.generateMipmaps=true;
 texture.needsUpdate=true;
 texture.anisotropy=4;
 return texture;
}

const vertexShader=`
 varying vec2 vUv;
 varying vec2 vLocal;
 varying vec3 vWorld;
 varying vec4 vReflectionCoord;
 uniform mat4 reflectionMatrix;
 uniform float time;
 uniform float waveAmp;
 void main(){
  vec3 p=position;
  float large=(sin(p.x*.095+time*.34)+cos(p.y*.072-time*.27))*.5;
  float cross=sin(p.x*.19+p.y*.14-time*.22)*.42;
  float small=sin(p.x*.41-p.y*.33+time*.74)*.18;
  p.z+=(large*.24+cross*.10+small*.055)*waveAmp;
  vec4 world=modelMatrix*vec4(p,1.);
  vUv=uv;
  vLocal=position.xy;
  vWorld=world.xyz;
  vReflectionCoord=reflectionMatrix*world;
  gl_Position=projectionMatrix*viewMatrix*world;
 }
`;

const fragmentShader=`
 varying vec2 vUv;
 varying vec2 vLocal;
 varying vec3 vWorld;
 varying vec4 vReflectionCoord;
 uniform sampler2D normalA;
 uniform sampler2D normalB;
 uniform sampler2D contactFoam;
 uniform sampler2D reflectionTexture;
 uniform float time;
 uniform float radius;
 uniform float normalStrength;
 uniform float foamAmount;
 uniform float reflectionAmount;
 uniform float sceneReflection;
 uniform float reflectionReady;
 uniform float rain;
 uniform float daylight;
 uniform vec3 deepColor;
 uniform vec3 shallowColor;
 uniform vec3 matrixBlue;
 uniform vec3 champagneGold;

 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}

 void main(){
  vec2 uvA=vUv*5.2+vec2(time*.008,time*.011);
  vec2 uvB=vUv*13.5+vec2(-time*.017,time*.013);
  vec3 nA=texture2D(normalA,uvA).xyz*2.-1.;
  vec3 nB=texture2D(normalB,uvB).xyz*2.-1.;
  vec2 slope=(nA.xy*.62+nB.xy*.38)*normalStrength;

  float rainCell=hash(floor(vWorld.xz*1.65)+floor(time*3.6));
  float rainPulse=rain*pow(max(0.,sin(time*18.+rainCell*31.4)),18.);
  slope+=vec2(sin(rainCell*21.7),cos(rainCell*17.3))*rainPulse*.055;

  vec3 normal=normalize(vec3(slope.x,1.,slope.y));
  vec3 viewDir=normalize(cameraPosition-vWorld);
  float ndv=max(dot(normal,viewDir),0.);
  float fresnel=.035+.965*pow(1.-ndv,4.2);

  float radial=clamp(length(vLocal)/max(radius,1.),0.,1.);
  float deep=1.-smoothstep(.16,.93,radial);
  vec3 refracted=refract(-viewDir,normal,1./1.333);
  float refractShift=(refracted.x+refracted.z)*.045;
  vec3 base=mix(shallowColor,deepColor,clamp(deep+refractShift,0.,1.));

  vec3 skyDay=vec3(.18,.27,.33);
  vec3 skyNight=vec3(.015,.038,.075);
  vec3 sky=mix(skyNight,skyDay,daylight);
  vec3 color=mix(base,sky,fresnel*.52*reflectionAmount);

  vec2 reflectionUv=vReflectionCoord.xy/max(vReflectionCoord.w,.0001);
  reflectionUv+=slope*vec2(.045,.032);
  float reflectionBounds=step(0.,reflectionUv.x)*step(reflectionUv.x,1.)*step(0.,reflectionUv.y)*step(reflectionUv.y,1.);
  vec3 sceneMirror=texture2D(reflectionTexture,clamp(reflectionUv,vec2(.001),vec2(.999))).rgb;
  float mirrorWeight=fresnel*sceneReflection*reflectionAmount*reflectionReady*reflectionBounds;
  color=mix(color,sceneMirror,clamp(mirrorWeight,0.,.84));

  float matrixBand=pow(max(0.,sin(vWorld.x*.055+vWorld.z*.027-time*.25)),18.)*
                   (.35+.65*pow(1.-ndv,2.));
  color+=matrixBlue*matrixBand*.18*reflectionAmount*(.35+.65*(1.-daylight));

  vec3 lightDir=normalize(vec3(.34,.82,.24));
  float spec=pow(max(dot(reflect(-lightDir,normal),viewDir),0.),62.);
  color+=champagneGold*spec*.48*reflectionAmount*(.55+.45*daylight);

  float rainSpark=rain*rainPulse*(.2+.8*fresnel);
  color+=mix(matrixBlue,vec3(.82,.9,1.),.72)*rainSpark*.28;

  float shore=smoothstep(.82,.995,radial);
  float foamNoise=.55+.45*sin(vWorld.x*.72+sin(vWorld.z*.31)+time*.9);
  float contact=texture2D(contactFoam,clamp(vUv+slope*.012,vec2(.001),vec2(.999))).r;
  float foam=max(shore*.78,contact*(.72+.28*foamNoise))*foamNoise*foamAmount;
  color=mix(color,vec3(.64,.76,.79),foam*.48);

  float alpha=mix(.84,.975,deep);
  alpha+=fresnel*.02;
  gl_FragColor=vec4(max(color,0.),clamp(alpha,0.,1.));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;

const mistFragment=`
 varying vec2 vUv;
 uniform float time;
 uniform float opacity;
 float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.7)))*43758.5453);}
 void main(){
  vec2 p=vUv-.5;
  float r=length(p)*2.;
  float n=sin((p.x*7.+time*.025)+sin(p.y*11.-time*.018))*.5+.5;
  n*=sin((p.y*9.-time*.017)+cos(p.x*8.+time*.021))*.5+.5;
  n=mix(n,hash(floor(vUv*20.)),.12);
  float edge=1.-smoothstep(.48,1.,r);
  float a=opacity*edge*smoothstep(.18,.78,n);
  gl_FragColor=vec4(.45,.62,.68,a);
 }
`;

export function createPremiumWater({region='hub',lake,owned=[]}){
 const normalA=createNormalMap(64,13),normalB=createNormalMap(64,47),foamSize=128,foamData=new Uint8Array(foamSize*foamSize);
 const contactFoam=new THREE.DataTexture(foamData,foamSize,foamSize,THREE.RedFormat,THREE.UnsignedByteType);
 contactFoam.minFilter=contactFoam.magFilter=THREE.LinearFilter;contactFoam.wrapS=contactFoam.wrapT=THREE.ClampToEdgeWrapping;contactFoam.needsUpdate=true;
 owned.push(normalA,normalB,contactFoam);
 const deepColor=new THREE.Color(region==='hub'?'#020a12':region==='estonie'?'#06161c':'#031018');
 const shallowColor=new THREE.Color(region==='hub'?'#0d2633':'#17343b');
 const reflectionMatrix=new THREE.Matrix4(),mirrorCamera=new THREE.PerspectiveCamera(),biasMatrix=new THREE.Matrix4().set(
  .5,0,0,.5,
  0,.5,0,.5,
  0,0,.5,.5,
  0,0,0,1
 );
 let reflectionTarget=null,reflectionProfile=QUALITY.medium,lastReflection=-Infinity,waterMesh=null,mistMesh=null;
 const material=new THREE.ShaderMaterial({
  side:THREE.DoubleSide,
  transparent:true,
  depthWrite:true,
  uniforms:{
   normalA:{value:normalA},normalB:{value:normalB},contactFoam:{value:contactFoam},
   reflectionTexture:{value:normalA},reflectionMatrix:{value:reflectionMatrix},reflectionReady:{value:0},
   time:{value:0},radius:{value:lake.r+2},
   waveAmp:{value:QUALITY.medium.waveAmp},
   normalStrength:{value:QUALITY.medium.normalStrength},
   foamAmount:{value:QUALITY.medium.foam},
   reflectionAmount:{value:QUALITY.medium.reflection},sceneReflection:{value:0},
   rain:{value:0},daylight:{value:1},
   deepColor:{value:deepColor},shallowColor:{value:shallowColor},
   matrixBlue:{value:new THREE.Color('#00a8ff')},
   champagneGold:{value:new THREE.Color('#d6b46a')},
  },
  vertexShader,
  fragmentShader,
 });
 const mistMaterial=new THREE.ShaderMaterial({
  side:THREE.DoubleSide,transparent:true,depthWrite:false,
  uniforms:{time:{value:0},opacity:{value:QUALITY.medium.mist}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:mistFragment,
 });
 owned.push(material,mistMaterial);

 function ensureReflectionTarget(size){
  if(!size)return;
  if(!reflectionTarget){
   reflectionTarget=new THREE.WebGLRenderTarget(size,size,{depthBuffer:true,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
   reflectionTarget.texture.name='3B-Water-Planar-Reflection';
   material.uniforms.reflectionTexture.value=reflectionTarget.texture;
  }else if(reflectionTarget.width!==size||reflectionTarget.height!==size)reflectionTarget.setSize(size,size);
 }
 function setQuality(mode,{allowPlanarReflection=true}={}){
  const q=qualityProfile(mode),sceneReflection=allowPlanarReflection?q.sceneReflection:0;
  reflectionProfile=sceneReflection>0?q:{...q,sceneReflection:0,reflectionHz:0};
  material.uniforms.waveAmp.value=q.waveAmp;
  material.uniforms.normalStrength.value=q.normalStrength;
  material.uniforms.foamAmount.value=q.foam;
  material.uniforms.reflectionAmount.value=q.reflection;
  material.uniforms.sceneReflection.value=sceneReflection;
  if(sceneReflection>0)ensureReflectionTarget(q.reflectionSize);else material.uniforms.reflectionReady.value=0;
  mistMaterial.uniforms.opacity.value=q.mist;
 }
 function setWeather(weather){
  material.uniforms.rain.value=weather==='storm'?1:weather==='heavy_rain'?.78:weather==='rain'?.42:0;
 }
 function setDaylight(value){
  material.uniforms.daylight.value=Math.max(0,Math.min(1,Number(value)||0));
 }
 function setFoamContacts(contacts=[]){
  foamData.fill(0);
  const diameter=(lake.r+2)*2;
  for(let py=0;py<foamSize;py++)for(let px=0;px<foamSize;px++){
   const wx=lake.x+(px/(foamSize-1)-.5)*diameter,wz=lake.z-(py/(foamSize-1)-.5)*diameter;
   let strength=0;
   for(const point of contacts){
    const radius=Math.max(.35,point.r||1.2),d=Math.hypot(wx-point.x,wz-point.z);
    if(d>=radius)continue;
    const t=1-d/radius;strength=Math.max(strength,t*t*(3-2*t)*(point.strength||1));
    if(strength>.98)break;
   }
   foamData[py*foamSize+px]=Math.round(Math.min(1,strength)*255);
  }
  contactFoam.needsUpdate=true;
 }
 function attachMeshes(water,mist){waterMesh=water;mistMesh=mist;}
 function renderReflection(renderer,scene,camera,time=0){
  const q=reflectionProfile;if(!q.sceneReflection||!waterMesh||!reflectionTarget||!renderer||!scene||!camera)return false;
  if(time-lastReflection<1/q.reflectionHz)return false;lastReflection=time;
  const waterWorld=new THREE.Vector3();waterMesh.getWorldPosition(waterWorld);const waterY=waterWorld.y;
  const cameraPos=new THREE.Vector3(),target=new THREE.Vector3(),forward=new THREE.Vector3(0,0,-1),up=new THREE.Vector3(0,1,0);
  camera.getWorldPosition(cameraPos);forward.applyQuaternion(camera.quaternion);up.applyQuaternion(camera.quaternion);target.copy(cameraPos).add(forward);
  const reflectPoint=point=>{point.y=2*waterY-point.y;return point;};
  reflectPoint(cameraPos);reflectPoint(target);up.y*=-1;
  mirrorCamera.copy(camera,false);mirrorCamera.position.copy(cameraPos);mirrorCamera.up.copy(up);mirrorCamera.lookAt(target);mirrorCamera.updateMatrixWorld();mirrorCamera.updateProjectionMatrix();
  reflectionMatrix.copy(biasMatrix).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);
  material.uniforms.reflectionMatrix.value.copy(reflectionMatrix);

  const previousTarget=renderer.getRenderTarget(),previousPlanes=renderer.clippingPlanes,previousXr=renderer.xr.enabled,waterVisible=waterMesh.visible,mistVisible=mistMesh?.visible;
  waterMesh.visible=false;if(mistMesh)mistMesh.visible=false;renderer.xr.enabled=false;
  renderer.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-waterY-.025)];
  renderer.setRenderTarget(reflectionTarget);renderer.clear();renderer.render(scene,mirrorCamera);
  renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=previousPlanes;renderer.xr.enabled=previousXr;waterMesh.visible=waterVisible;if(mistMesh)mistMesh.visible=mistVisible;
  material.uniforms.reflectionReady.value=1;return true;
 }
 function update(time){
  material.uniforms.time.value=time;
  mistMaterial.uniforms.time.value=time;
 }
 function disposeReflection(){reflectionTarget?.dispose();reflectionTarget=null;}
 return{material,mistMaterial,setQuality,setWeather,setDaylight,setFoamContacts,attachMeshes,renderReflection,disposeReflection,update};
}
