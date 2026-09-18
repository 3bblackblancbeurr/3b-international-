import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

export class SpeedAtmosphereFX{
  constructor(scene,event,{quality='high',color=0xc9dcff}={}){
    this.scene=scene;this.rnd=rng(hash(`${event.id}:speed-atmo-v1`));this.count={low:26,medium:46,high:72,ultra:108}[quality]||64;this.seed=Array.from({length:this.count},()=>({forward:-8+this.rnd()*42,side:(this.rnd()-.5)*26,y:.2+this.rnd()*8,len:.3+this.rnd()*1.6,phase:this.rnd()}));
    const arr=new Float32Array(this.count*6),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));this.lines=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));this.lines.frustumCulled=false;scene.add(this.lines);
  }
  update({playerPosition,playerTangent,speedKph=0,wetness=.5,dt=.016}={}){
    if(!playerPosition||!playerTangent)return;const speed=clamp((speedKph-110)/190),wet=clamp(wetness),sideVec=new THREE.Vector3(-playerTangent.z,0,playerTangent.x).normalize(),a=this.lines.geometry.attributes.position.array;
    this.lines.material.opacity=speed*(.015+.075*wet);for(let i=0;i<this.count;i++){const s=this.seed[i];s.phase=(s.phase+dt*(.25+speed*.9))%1;const forward=s.forward+(s.phase-.5)*12*speed,base=playerPosition.clone().addScaledVector(playerTangent,forward).addScaledVector(sideVec,s.side);base.y+=s.y;const len=(.4+s.len)*(1+speed*2.2),j=i*6;a[j]=base.x;a[j+1]=base.y;a[j+2]=base.z;a[j+3]=base.x-playerTangent.x*len;a[j+4]=base.y-.02*len;a[j+5]=base.z-playerTangent.z*len;}this.lines.geometry.attributes.position.needsUpdate=true;
  }
}
