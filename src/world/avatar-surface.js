import {DataTexture,LinearFilter,RGBAFormat,RepeatWrapping,UnsignedByteType,Vector2} from 'three';

const SIZE=64;
const cache=new Map();
const profiles={
 skin:{roughness:.72,strength:.16,repeat:7},
 hair:{roughness:.58,strength:.22,repeat:5},
 cotton:{roughness:.9,strength:.34,repeat:8},
 linen:{roughness:.96,strength:.42,repeat:7},
 satin:{roughness:.34,strength:.12,repeat:10},
 leather:{roughness:.52,strength:.38,repeat:4},
 denim:{roughness:.8,strength:.48,repeat:9},
 wool:{roughness:.94,strength:.55,repeat:7},
 knit:{roughness:.92,strength:.62,repeat:5},
 velvet:{roughness:.84,strength:.25,repeat:8},
 technical:{roughness:.46,strength:.28,repeat:12}
};

const clamp=v=>Math.max(0,Math.min(1,v));
const fract=v=>v-Math.floor(v);
const hash=(x,y,s=0)=>fract(Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453123);
function height(kind,x,y){
 const u=x/SIZE,v=y/SIZE,n=(hash(x,y)-.5)*.12;
 switch(kind){
  case 'skin':return .5+n*.32+Math.sin(x*.72+y*.31)*.012;
  case 'hair':return .5+Math.sin((x+y*.18)*1.3)*.09+n*.2;
  case 'cotton':return .5+Math.sin(x*Math.PI*.52)*.055+Math.sin(y*Math.PI*.52)*.055+n*.28;
  case 'linen':return .5+Math.sin(x*Math.PI*.38)*.065+Math.sin(y*Math.PI*.31)*.05+n*.38;
  case 'satin':return .5+Math.sin((x+y*.12)*Math.PI*.23)*.018+n*.08;
  case 'leather':return .5+(hash(Math.floor(x/3),Math.floor(y/3),2)-.5)*.12+n*.36;
  case 'denim':return .5+Math.sin((x+y)*Math.PI*.46)*.065+Math.sin((x-y)*Math.PI*.46)*.045+n*.23;
  case 'wool':return .5+Math.sin(x*.78+y*.55)*.075+Math.cos(x*.43-y*.69)*.065+n*.45;
  case 'knit':return .5+Math.sin((x+y)*Math.PI*.25)*.09*Math.cos((x-y)*Math.PI*.25)+n*.18;
  case 'velvet':return .5+Math.sin(y*Math.PI*.5)*.025+n*.16;
  case 'technical':return .5+((x%4===0||y%4===0)?.05:0)+n*.14;
  default:return .5+n*.2;
 }
}
function rough(kind,x,y){
 const p=profiles[kind]||profiles.cotton,base=p.roughness,n=(hash(x,y,5)-.5);
 if(kind==='leather')return clamp(base+n*.16);
 if(kind==='wool'||kind==='knit')return clamp(base+n*.08);
 if(kind==='technical')return clamp(base+n*.06);
 if(kind==='skin')return clamp(base+n*.055);
 return clamp(base+n*.04);
}
function makeTexture(data){
 const texture=new DataTexture(data,SIZE,SIZE,RGBAFormat,UnsignedByteType);
 texture.wrapS=texture.wrapT=RepeatWrapping;texture.minFilter=texture.magFilter=LinearFilter;texture.needsUpdate=true;
 texture.userData.threeBSurfaceGenerated=true;
 return texture;
}
function build(kind){
 const p=profiles[kind]||profiles.cotton,normals=new Uint8Array(SIZE*SIZE*4),roughness=new Uint8Array(SIZE*SIZE*4);
 const h=(x,y)=>height(kind,(x+SIZE)%SIZE,(y+SIZE)%SIZE);
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const i=(y*SIZE+x)*4,dx=(h(x+1,y)-h(x-1,y))*p.strength,dy=(h(x,y+1)-h(x,y-1))*p.strength;
  const iz=1/Math.sqrt(dx*dx+dy*dy+1),nx=-dx*iz,ny=-dy*iz,nz=iz,r=Math.round(rough(kind,x,y)*255);
  normals[i]=Math.round((nx*.5+.5)*255);normals[i+1]=Math.round((ny*.5+.5)*255);normals[i+2]=Math.round((nz*.5+.5)*255);normals[i+3]=255;
  roughness[i]=roughness[i+1]=roughness[i+2]=r;roughness[i+3]=255;
 }
 const normalMap=makeTexture(normals),roughnessMap=makeTexture(roughness);
 normalMap.repeat.setScalar(p.repeat);roughnessMap.repeat.setScalar(p.repeat);
 return{normalMap,roughnessMap,roughness:p.roughness,normalScale:new Vector2(p.strength,p.strength),kind};
}
export function surfaceMaps(kind='cotton'){
 const resolved=profiles[kind]?kind:'cotton';
 if(!cache.has(resolved))cache.set(resolved,build(resolved));
 return cache.get(resolved);
}
export function applySurfaceMaps(material,kind='cotton'){
 if(!material)return material;const maps=surfaceMaps(kind),generatedNormal=material.normalMap?.userData?.threeBSurfaceGenerated,generatedRough=material.roughnessMap?.userData?.threeBSurfaceGenerated;
 if(!material.normalMap||generatedNormal){material.normalMap=maps.normalMap;material.normalScale?.copy?.(maps.normalScale);}
 if(!material.roughnessMap||generatedRough)material.roughnessMap=maps.roughnessMap;
 material.roughness=maps.roughness;material.userData.threeBSurfaceKind=kind;material.needsUpdate=true;return material;
}
export function surfaceKinds(){return Object.keys(profiles);}
