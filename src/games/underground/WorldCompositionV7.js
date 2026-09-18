import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU=Math.PI*2;
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function basis(curve,u){const p=curve.getPointAt(((u%1)+1)%1),t=curve.getTangentAt(((u%1)+1)%1).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();return {p,t,side,yaw:Math.atan2(t.x,t.z)};}
function meshBox(w,h,d,mat,r=.04){const m=new THREE.Mesh(r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.15,h*.15,d*.15)):new THREE.BoxGeometry(w,h,d),mat);m.castShadow=true;m.receiveShadow=true;return m;}
function place(curve,group,u,offset=0,y=0,yawOffset=0){const b=basis(curve,u);group.position.copy(b.p).addScaledVector(b.side,offset);group.position.y+=y;group.rotation.y=b.yaw+yawOffset;return group;}
function mat(color,{roughness=.65,metalness=.05,emissive=0,emissiveIntensity=0,clearcoat=0}={}){return new THREE.MeshPhysicalMaterial({color,roughness,metalness,emissive,emissiveIntensity,clearcoat,clearcoatRoughness:.08});}
function facadeModule(mats,{w=8,h=14,d=4,rnd=Math.random,modern=false}={}){
  const g=new THREE.Group(),body=meshBox(w,h,d,modern?mats.darkGlass:mats.stone,.12);body.position.y=h*.5;g.add(body);
  const base=meshBox(w*1.02,1.7,d*1.02,mats.base,.06);base.position.y=.85;g.add(base);
  const floors=Math.max(3,Math.floor((h-2)/2.45)),cols=Math.max(3,Math.floor(w/2));
  for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
    const x=-w*.5+(c+.5)*w/cols,yy=2.3+f*2.35,lit=((f*5+c*7)%4)!==0;
    const recess=meshBox(Math.max(.8,w/cols*.6),1.25,.11,mats.recess,.025);recess.position.set(x,yy,-d*.51);g.add(recess);
    const pane=meshBox(Math.max(.62,w/cols*.46),.98,.055,lit?mats.window:mats.windowDark,.018);pane.position.set(x,yy,-d*.57);g.add(pane);
    const sill=meshBox(Math.max(.75,w/cols*.52),.07,.16,mats.trim,.012);sill.position.set(x,yy-.66,-d*.59);g.add(sill);
  }
  if(!modern){
    const cornice=meshBox(w*1.05,.24,d*1.06,mats.trim,.04);cornice.position.y=h-.18;g.add(cornice);
    if(rnd()>.35){const balcony=meshBox(w*.46,.11,.95,mats.metal,.03);balcony.position.set(0,4.8,-d*.76);g.add(balcony);for(let x=-w*.18;x<=w*.18;x+=w*.12){const rail=meshBox(.035,.52,.035,mats.metal,.008);rail.position.set(x,5.1,-d*.96);g.add(rail);}}
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(w*.42,w*.54,1.15,4),mats.roof);roof.position.y=h+.5;roof.rotation.y=Math.PI/4;roof.scale.z=d/w;roof.castShadow=true;g.add(roof);
  }else{
    for(let f=1;f<floors;f++){const line=meshBox(w*1.02,.035,d*1.02,mats.blue,.005);line.position.y=f*2.42;g.add(line);}const crown=meshBox(w*.72,.12,d*.72,mats.gold,.02);crown.position.y=h+.55;g.add(crown);
  }
  return g;
}
function lamp(mats){const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,4.7,8),mats.metal);pole.position.y=2.35;g.add(pole);const arm=meshBox(.82,.07,.07,mats.metal,.018);arm.position.set(.37,4.55,0);g.add(arm);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),mats.warm);bulb.position.set(.76,4.47,0);g.add(bulb);return g;}
function planter(mats){const g=new THREE.Group(),pot=meshBox(1.1,.55,.55,mats.base,.06);pot.position.y=.275;g.add(pot);for(const x of [-.3,0,.3]){const crown=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),mats.leaf);crown.position.set(x,.8,0);g.add(crown);}return g;}

export class WorldCompositionV7{
  constructor(scene,curve,event,{palette,quality='high'}={}){this.scene=scene;this.curve=curve;this.event=event;this.countryId=event.countryId||'france';this.palette=palette;this.quality=quality;this.rnd=rng(hash(`${event.id}:world-composition-v7`));this.root=new THREE.Group();this.root.name='U3B_WorldCompositionV7';scene.add(this.root);this.buildMaterials();if(this.countryId==='france')this.buildFrance();}
  buildMaterials(){const p=this.palette;this.mats={stone:mat(0x4f4b47,{roughness:.62}),base:mat(0x22262b,{roughness:.72}),trim:mat(0x7d766e,{roughness:.5}),metal:mat(0x222933,{roughness:.26,metalness:.78}),recess:mat(0x080a0e,{roughness:.42}),window:mat(p.warm,{roughness:.12,metalness:.12,emissive:p.warm,emissiveIntensity:2.6,clearcoat:.4}),windowDark:mat(0x0a1118,{roughness:.16,metalness:.25}),roof:mat(0x10151b,{roughness:.55,metalness:.15}),darkGlass:mat(0x0d1824,{roughness:.15,metalness:.44,clearcoat:.8}),warm:mat(p.warm,{emissive:p.warm,emissiveIntensity:4.8,roughness:.18}),blue:mat(p.matrix,{emissive:p.matrix,emissiveIntensity:2.7,roughness:.18}),gold:mat(p.gold,{emissive:p.gold,emissiveIntensity:1.7,roughness:.22,metalness:.68}),sidewalk:mat(0x37393b,{roughness:.82}),leaf:mat(0x0b1b13,{roughness:.95})};}
  add(g,u,offset=0,y=0,yaw=0){this.root.add(place(this.curve,g,u,offset,y,yaw));}
  buildFrance(){this.buildCloseFacades();this.buildSidewalks();this.buildStreetFurniture();this.buildQuayPromenade();this.buildMatrixCanyon();}
  buildCloseFacades(){const count=this.quality==='ultra'?34:this.quality==='high'?26:this.quality==='medium'?18:12;for(let i=0;i<count;i++){
    const u=.008+(i/(count-1))*.285,side=i%2?-1:1,w=6+this.rnd()*5.5,h=10+this.rnd()*10,d=3.7+this.rnd()*2.3,offset=side*(11.3+this.rnd()*4.4),g=facadeModule(this.mats,{w,h,d,rnd:this.rnd});this.add(g,u,offset,-.85,side>0?Math.PI:0);
  }}
  buildSidewalks(){const n=120;for(let i=0;i<n;i++){const u=i/(n-1)*.43;for(const side of [-1,1]){const b=basis(this.curve,u),slab=meshBox(2.3,.18,3.5,this.mats.sidewalk,.025);slab.position.copy(b.p).addScaledVector(b.side,side*7.8);slab.position.y=-.02;slab.rotation.y=b.yaw;this.root.add(slab);const curb=meshBox(.18,.28,3.5,this.mats.trim,.02);curb.position.copy(b.p).addScaledVector(b.side,side*6.62);curb.position.y=.04;curb.rotation.y=b.yaw;this.root.add(curb);}}}
  buildStreetFurniture(){const count=this.quality==='ultra'?48:this.quality==='high'?34:24;for(let i=0;i<count;i++){const u=.01+(i/(count-1))*.40,side=i%2?-1:1,l=lamp(this.mats);this.add(l,u,side*8.35,-.02,side>0?Math.PI:0);if(i%4===0){const p=planter(this.mats);this.add(p,u+.003,side*9.4,-.02,side>0?Math.PI:0);}if(i%5===0){const bollard=meshBox(.14,.72,.14,this.mats.metal,.03);this.add(bollard,u+.006,side*7.15,.18);}}
  }
  buildQuayPromenade(){for(let i=0;i<18;i++){const u=.145+i/17*.16,side=-1,wall=meshBox(.9,2.5,4.3,this.mats.stone,.08);this.add(wall,u,side*10.8,.15);const cap=meshBox(1.1,.16,4.35,this.mats.gold,.03);this.add(cap,u,side*10.8,1.48);}for(let i=0;i<9;i++){const u=.155+i*.018,bench=meshBox(1.5,.12,.5,this.mats.metal,.04);this.add(bench,u,-13.0,.45);}}
  buildMatrixCanyon(){const count=this.quality==='ultra'?20:this.quality==='high'?14:10;for(let i=0;i<count;i++){const u=.565+(i/(count-1))*.125,side=i%2?-1:1,w=7+this.rnd()*7,h=28+this.rnd()*46,d=6+this.rnd()*7,offset=side*(13+this.rnd()*12),g=facadeModule(this.mats,{w,h,d,rnd:this.rnd,modern:true});this.add(g,u,offset,-.9,side>0?Math.PI:0);}}
  update(){return {worldCompositionV7:true};}
}
