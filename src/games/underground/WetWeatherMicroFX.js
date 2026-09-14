import * as THREE from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

export class WetWeatherMicroFX{
  constructor(scene,event,{quality='high'}={}){
    this.scene=scene;this.rnd=rng(hash(`${event.id}:wet-micro-v1`));this.count={low:10,medium:18,high:28,ultra:42}[quality]||24;this.elapsed=0;this.drops=Array.from({length:this.count},()=>this.seed());
    const ringGeo=new THREE.RingGeometry(.08,.12,18),ringMat=new THREE.MeshBasicMaterial({color:0xbfd9ee,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    this.rings=new THREE.InstancedMesh(ringGeo,ringMat,this.count);this.rings.frustumCulled=false;this.rings.castShadow=false;this.rings.receiveShadow=false;scene.add(this.rings);
    const splashGeo=new THREE.BoxGeometry(.025,.28,.025),splashMat=new THREE.MeshBasicMaterial({color:0xd7e9f6,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});this.splashes=new THREE.InstancedMesh(splashGeo,splashMat,this.count);this.splashes.frustumCulled=false;scene.add(this.splashes);
    this.dummy=new THREE.Object3D();
  }
  seed(){return {phase:this.rnd(),rate:.7+this.rnd()*1.7,forward:-5+this.rnd()*28,side:(this.rnd()-.5)*11,scale:.65+this.rnd()*1.25};}
  update({playerPosition,playerTangent,wetness=.5,speedKph=0,dt=.016}={}){
    this.elapsed+=dt;if(!playerPosition||!playerTangent)return;const wet=clamp(wetness),speed=clamp(speedKph/280),sideVec=new THREE.Vector3(-playerTangent.z,0,playerTangent.x).normalize(),d=this.dummy;
    this.rings.material.opacity=(.05+.16*wet)*(1-.22*speed);this.splashes.material.opacity=(.02+.13*wet)*(.55+.45*speed);
    for(let i=0;i<this.count;i++){
      const s=this.drops[i];s.phase+=dt*s.rate;if(s.phase>=1){this.drops[i]=this.seed();this.drops[i].phase=0;}
      const q=this.drops[i],base=playerPosition.clone().addScaledVector(playerTangent,q.forward).addScaledVector(sideVec,q.side);base.y+=.055;
      const ringScale=(.15+q.phase*1.55)*q.scale;d.position.copy(base);d.rotation.set(-Math.PI/2,0,0);d.scale.set(ringScale,ringScale,1);d.updateMatrix();this.rings.setMatrixAt(i,d.matrix);
      const splashY=.08+Math.sin(Math.min(1,q.phase)*Math.PI)*.34;d.position.copy(base);d.position.y+=splashY*.5;d.rotation.set(0,0,(q.side/11)*.35);d.scale.set(1,.22+.85*Math.sin(Math.min(1,q.phase)*Math.PI),1);d.updateMatrix();this.splashes.setMatrixAt(i,d.matrix);
    }
    this.rings.instanceMatrix.needsUpdate=true;this.splashes.instanceMatrix.needsUpdate=true;
  }
}
