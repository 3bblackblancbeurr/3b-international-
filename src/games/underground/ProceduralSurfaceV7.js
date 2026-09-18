import * as THREE from 'three';

function rand2(x,y,seed=17){let n=Math.imul(x+seed,374761393)+Math.imul(y+seed*3,668265263);n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295;}
function colorTexture(size,pixelFn,{srgb=true,repeat=[1,1]}={}){
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,[r,g,b,a=255]=pixelFn(x,y,size);data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=a;
  }
  const tex=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);tex.needsUpdate=true;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(...repeat);tex.anisotropy=8;if(srgb)tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function grayTexture(size,pixelFn,{repeat=[1,1]}={}){return colorTexture(size,(x,y,s)=>{const v=pixelFn(x,y,s);return [v,v,v,255];},{srgb:false,repeat});}

function asphalt(size=256){
  const color=colorTexture(size,(x,y)=>{const n=rand2(x,y,23),coarse=rand2(x>>3,y>>3,91),chip=rand2(x>>1,y>>1,41);let v=22+n*17+coarse*9;if(chip>.92)v+=22;const seam=(x%127<2||y%181<2)?-7:0;v=Math.max(8,Math.min(68,v+seam));return [v,v+2,v+4,255];},{repeat:[2.2,1]});
  const bump=grayTexture(size,(x,y)=>{const n=rand2(x,y,51),chip=rand2(x>>1,y>>1,9);return Math.max(60,Math.min(210,118+n*54+(chip>.91?45:0)));},{repeat:[2.2,1]});
  const rough=grayTexture(size,(x,y)=>{const n=rand2(x,y,77),patch=rand2(x>>4,y>>4,33);return Math.round(122+n*76+patch*28);},{repeat:[2.2,1]});
  return {color,bump,rough};
}
function limestone(size=256){
  const blockW=64,blockH=34;
  const color=colorTexture(size,(x,y)=>{const row=Math.floor(y/blockH),shift=(row%2)*blockW*.5,xx=(x+shift)%blockW,yy=y%blockH,mortar=xx<2||yy<2;const n=rand2(x,y,18),macro=rand2(Math.floor((x+shift)/blockW),row,81);if(mortar)return [38,37,36,255];const base=73+macro*24+n*13;return [base+8,base+6,base+2,255];},{repeat:[1.6,2.4]});
  const bump=grayTexture(size,(x,y)=>{const row=Math.floor(y/blockH),shift=(row%2)*blockW*.5,xx=(x+shift)%blockW,yy=y%blockH;if(xx<2||yy<2)return 58;return Math.round(145+rand2(x,y,55)*46);},{repeat:[1.6,2.4]});
  const rough=grayTexture(size,(x,y)=>Math.round(170+rand2(x,y,101)*56),{repeat:[1.6,2.4]});return {color,bump,rough};
}
function concrete(size=192){
  const color=colorTexture(size,(x,y)=>{const n=rand2(x,y,8),m=rand2(x>>4,y>>4,61),stain=(Math.sin(x*.08)+Math.sin(y*.037))*2;const v=45+n*19+m*12+stain;return [v+2,v+3,v+4,255];},{repeat:[2,2]});
  const bump=grayTexture(size,(x,y)=>Math.round(120+rand2(x,y,4)*65),{repeat:[2,2]});return {color,bump};
}

export function createProceduralSurfacePack(){return {asphalt:asphalt(),limestone:limestone(),concrete:concrete()};}
function apply(mat,pack,{bumpScale=.08,roughnessMap=true,map=true}={}){if(!mat||!pack)return;if(map)mat.map=pack.color||null;if(pack.bump){mat.bumpMap=pack.bump;mat.bumpScale=bumpScale;}if(roughnessMap&&pack.rough)mat.roughnessMap=pack.rough;mat.needsUpdate=true;}

export class SurfaceUpgradeV7{
  constructor(world){
    this.pack=createProceduralSurfacePack();this.world=world;
    apply(world?.materials?.road,this.pack.asphalt,{bumpScale:.055});
    apply(world?.materials?.shoulder,this.pack.concrete,{bumpScale:.05,roughnessMap:false});
    apply(world?.materials?.stone,this.pack.limestone,{bumpScale:.09,roughnessMap:true});
    const gm=world?.geometryV6?.materials;if(gm){apply(gm.stone,this.pack.limestone,{bumpScale:.10});apply(gm.stoneDark,this.pack.concrete,{bumpScale:.06,roughnessMap:false});apply(gm.tunnel,this.pack.concrete,{bumpScale:.035,roughnessMap:false});}
    const cm=world?.compositionV7?.mats;if(cm){apply(cm.stone,this.pack.limestone,{bumpScale:.10});apply(cm.base,this.pack.concrete,{bumpScale:.055,roughnessMap:false});apply(cm.sidewalk,this.pack.concrete,{bumpScale:.04,roughnessMap:false});apply(cm.trim,this.pack.limestone,{bumpScale:.04});}
  }
  dispose(){for(const family of Object.values(this.pack))for(const tex of Object.values(family))tex?.dispose?.();}
}
