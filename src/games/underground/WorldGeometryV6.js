import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU=Math.PI*2;
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function basis(curve,u){const p=curve.getPointAt(((u%1)+1)%1),t=curve.getTangentAt(((u%1)+1)%1).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();return {p,t,side,yaw:Math.atan2(t.x,t.z)};}
function at(curve,u,offset=0,y=0){const b=basis(curve,u);return {b,pos:b.p.clone().addScaledVector(b.side,offset).add(new THREE.Vector3(0,y,0))};}
function physical(color,{metalness=.05,roughness=.55,clearcoat=0,clearcoatRoughness=.12,emissive=0,emissiveIntensity=0,transparent=false,opacity=1}={}){return new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat,clearcoatRoughness,emissive,emissiveIntensity,transparent,opacity});}
function standard(color,{metalness=.05,roughness=.65,emissive=0,emissiveIntensity=0,transparent=false,opacity=1}={}){return new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity,transparent,opacity});}
function box(w,h,d,mat,x=0,y=0,z=0,rounded=.08){const g=rounded?new RoundedBoxGeometry(w,h,d,3,Math.min(rounded,Math.min(w,h,d)*.2)):new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function addWindows(group,{w,h,d,side=1,rows=4,cols=4,warmMat,frameMat}){
  const xFace=side*w*.505;
  const usableH=h*.70,usableD=d*.76;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const yy=-h*.22+(r/(Math.max(1,rows-1)))*usableH*.72;
    const zz=-usableD*.5+(c+.5)/cols*usableD;
    const frame=box(.05,.64,Math.min(.72,usableD/cols*.62),frameMat,xFace,yy,zz,.015);group.add(frame);
    const lit=((r*7+c*11)%5)!==0;
    const pane=box(.028,.50,Math.min(.57,usableD/cols*.50),lit?warmMat:frameMat,xFace+side*.018,yy,zz,.01);group.add(pane);
  }
}
function heritageBuilding(materials,{w=8,h=14,d=8,side=1,rnd=Math.random}={}){
  const g=new THREE.Group();
  const baseH=1.7;
  const body=box(w,h-baseH,d,materials.stone,0,baseH+(h-baseH)/2,0,.14);g.add(body);
  const base=box(w*1.04,baseH,d*1.03,materials.stoneDark,0,baseH/2,0,.12);g.add(base);
  const cornice=box(w*1.08,.28,d*1.07,materials.cornice,0,h-.16,0,.05);g.add(cornice);
  const roof=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(w,d)*.54,Math.max(w,d)*.70,1.5,4),materials.roof);roof.position.y=h+.58;roof.rotation.y=Math.PI/4;roof.scale.z=d/w;roof.castShadow=true;g.add(roof);
  const rows=Math.max(3,Math.min(6,Math.floor(h/2.5)));const cols=Math.max(3,Math.min(5,Math.floor(d/2.0)));
  addWindows(g,{w,h,d,side,rows,cols,warmMat:materials.windowWarm,frameMat:materials.trim});
  for(let f=0;f<Math.min(3,rows-1);f++){
    const yy=3.0+f*2.65;
    const slab=box(.22,.10,d*.68,materials.metal,side*(w*.53),yy,0,.02);g.add(slab);
    for(const z of [-d*.26,-d*.09,d*.09,d*.26])g.add(box(.04,.48,.04,materials.metal,side*(w*.63),yy+.25,z,.01));
  }
  for(const z of [-d*.42,d*.42])g.add(box(.22,h*.72,.22,materials.cornice,side*(w*.515),h*.47,z,.03));
  const door=box(.06,1.65,1.05,materials.glass,side*(w*.515),1.5,0,.02);g.add(door);
  if(rnd()>.5){const sign=box(.08,.55,2.5,materials.goldGlow,side*(w*.56),2.3,0,.02);g.add(sign);}
  return g;
}
function modernTower(materials,{w=10,h=40,d=10,side=1,rnd=Math.random}={}){
  const g=new THREE.Group();
  const core=box(w,h,d,materials.glass,0,h*.5,0,.22);g.add(core);
  const setback=box(w*.78,h*.35,d*.78,materials.glass2,0,h*.88,0,.2);g.add(setback);
  const floorCount=Math.min(12,Math.max(6,Math.floor(h/4.5)));
  for(let i=1;i<floorCount;i++)g.add(box(w*1.015,.055,d*1.015,materials.metal,0,(i/floorCount)*h,0,.01));
  for(const z of [-d*.34,0,d*.34]){const strip=box(.035,h*.82,.055,materials.blueGlow,side*(w*.512),h*.48,z,.01);g.add(strip);}
  if(rnd()>.45){const crown=box(w*.64,.18,d*.64,materials.goldGlow,0,h+1.1,0,.04);g.add(crown);}
  return g;
}
function quayBridge(materials){
  const g=new THREE.Group();
  const deck=box(39,.8,6.4,materials.stone,0,5.3,0,.16);g.add(deck);
  const parapetL=box(39,.95,.34,materials.stoneDark,0,6.05,-2.95,.08),parapetR=parapetL.clone();parapetR.position.z=2.95;g.add(parapetL,parapetR);
  for(const x of [-13,0,13]){
    const arch=new THREE.Mesh(new THREE.TorusGeometry(5.2,.55,12,56,Math.PI),materials.stoneDark);arch.rotation.z=Math.PI;arch.position.set(x,1.9,0);arch.castShadow=true;g.add(arch);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(5.2,.08,8,48,Math.PI),materials.goldGlow);inner.rotation.z=Math.PI;inner.position.set(x,1.92,.48);g.add(inner);
  }
  for(let x=-18;x<=18;x+=3){const lamp=box(.12,1.8,.12,materials.metal,x,7.0,0,.02);g.add(lamp);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),materials.warmGlow);bulb.position.set(x,7.95,0);g.add(bulb);}
  return g;
}
function tunnelShell(materials,curve){
  const g=new THREE.Group();
  const ribs=22;
  for(let i=0;i<ribs;i++){
    const u=.435+i/(ribs-1)*.115,{b,pos}=at(curve,u,0,0);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(7.2,.22,8,40,Math.PI),materials.tunnel);arch.rotation.z=Math.PI;arch.position.copy(pos);arch.position.y+=1.15;arch.rotation.y=b.yaw;arch.castShadow=true;g.add(arch);
    const ceiling=box(14.6,.24,4.8,materials.tunnel);ceiling.position.copy(pos);ceiling.position.y+=7.0;ceiling.rotation.y=b.yaw;g.add(ceiling);
    for(const s of [-1,1]){const wall=box(.35,6.2,4.8,materials.tunnel);wall.position.copy(pos).addScaledVector(b.side,s*7.2);wall.position.y+=3.0;wall.rotation.y=b.yaw;g.add(wall);}
    if(i%2===0){const strip=box(8.8,.055,.16,i<ribs*.52?materials.warmGlow:materials.blueGlow);strip.position.copy(pos);strip.position.y+=6.62;strip.rotation.y=b.yaw;g.add(strip);}
  }
  return g;
}
function makeTree(materials,scale=1){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.15,.22,2.7,8),materials.trunk);trunk.position.y=1.35;trunk.castShadow=true;g.add(trunk);for(const [y,s] of [[2.5,1.15],[3.2,.9],[3.8,.62]]){const crown=new THREE.Mesh(new THREE.ConeGeometry(1.05*s,2.3*s,10),materials.leaf);crown.position.y=y; crown.castShadow=true;g.add(crown);}g.scale.setScalar(scale);return g;}
function makeLamp(materials){const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.08,4.6,8),materials.metal);pole.position.y=2.3;g.add(pole);const arm=box(1.0,.08,.08,materials.metal,.46,4.5,0,.02);g.add(arm);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),materials.warmGlow);bulb.position.set(.92,4.42,0);g.add(bulb);return g;}

export class WorldGeometryV6{
  constructor(scene,curve,event,{palette,quality='high'}={}){
    this.scene=scene;this.curve=curve;this.event=event;this.countryId=event.countryId||'france';this.palette=palette;this.quality=quality;this.rnd=rng(hash(`${event.id}:world-geometry-v6`));this.root=new THREE.Group();this.root.name='U3B_WorldGeometryV6';scene.add(this.root);
    this.buildMaterials();
    if(this.countryId==='france')this.buildFrance();else this.buildRegional();
  }
  buildMaterials(){const p=this.palette;this.materials={
    stone:physical(0x514d48,{roughness:.63,clearcoat:.08}),stoneDark:physical(0x27292c,{roughness:.72}),cornice:physical(0x77716a,{roughness:.48}),roof:physical(0x11151b,{metalness:.18,roughness:.52}),trim:physical(0x111419,{metalness:.48,roughness:.38}),metal:physical(0x202833,{metalness:.86,roughness:.23}),glass:physical(0x111d2a,{metalness:.12,roughness:.08,clearcoat:1,clearcoatRoughness:.03,transparent:true,opacity:.82}),glass2:physical(0x0b1722,{metalness:.28,roughness:.12,clearcoat:.9,clearcoatRoughness:.05}),windowWarm:standard(p.warm,{emissive:p.warm,emissiveIntensity:3.4,roughness:.22}),warmGlow:standard(p.warm,{emissive:p.warm,emissiveIntensity:5.2,roughness:.16}),blueGlow:standard(p.matrix,{emissive:p.matrix,emissiveIntensity:4.4,roughness:.15}),goldGlow:standard(p.gold,{metalness:.58,roughness:.2,emissive:p.gold,emissiveIntensity:2.4}),tunnel:physical(0x11161d,{metalness:.34,roughness:.46}),leaf:standard(0x071811,{roughness:.93}),trunk:standard(0x33261d,{roughness:.9}),rock:standard(0x1d2227,{roughness:.95})};}
  place(group,u,offset=0,y=0,yawOffset=0){const {b,pos}=at(this.curve,u,offset,y);group.position.copy(pos);group.rotation.y=b.yaw+yawOffset;this.root.add(group);return group;}
  buildFrance(){this.buildHeritage();this.buildQuays();this.buildTunnel();this.buildMatrix();this.buildAlps();this.buildSanctuary();this.buildStreetLife();}
  buildHeritage(){const count=this.quality==='ultra'?22:this.quality==='high'?16:this.quality==='medium'?12:8;for(let i=0;i<count;i++){
      const u=.015+this.rnd()*.27,side=this.rnd()<.5?-1:1,offset=side*(16.8+this.rnd()*11),h=11+this.rnd()*11,w=6.5+this.rnd()*6.5,d=7+this.rnd()*7;
      const g=heritageBuilding(this.materials,{w,h,d,side:side>0?-1:1,rnd:this.rnd});this.place(g,u,offset,-.7,side>0?0:Math.PI);
    }
  }
  buildQuays(){for(const u of [.178,.228,.278]){const bridge=quayBridge(this.materials);this.place(bridge,u,0,-.7,Math.PI/2);}for(let i=0;i<8;i++){const u=.155+i*.018,side=i%2?-1:1;const stair=new THREE.Group();for(let s=0;s<5;s++)stair.add(box(4.2,.25,1.05,this.materials.stone,0,s*.23,s*.72,.04));this.place(stair,u,side*13.8,-.65,side>0?0:Math.PI);}}
  buildTunnel(){this.root.add(tunnelShell(this.materials,this.curve));}
  buildMatrix(){const count=this.quality==='ultra'?14:this.quality==='high'?10:7;for(let i=0;i<count;i++){
      const u=.57+this.rnd()*.115,side=this.rnd()<.5?-1:1,h=35+this.rnd()*48,w=7+this.rnd()*7,d=7+this.rnd()*8,offset=side*(19+this.rnd()*36);
      const g=modernTower(this.materials,{w,h,d,side:side>0?-1:1,rnd:this.rnd});this.place(g,u,offset,-1,side>0?0:Math.PI);
    }
  }
  buildAlps(){const treeCount=this.quality==='ultra'?90:this.quality==='high'?62:this.quality==='medium'?42:24;for(let i=0;i<treeCount;i++){const u=.69+this.rnd()*.17,side=this.rnd()<.5?-1:1,offset=side*(11+this.rnd()*42),g=makeTree(this.materials,.65+this.rnd()*.8);this.place(g,u,offset,-.7,this.rnd()*TAU);}const mountainCount=this.quality==='ultra'?18:12;for(let i=0;i<mountainCount;i++){const u=.69+this.rnd()*.16,side=this.rnd()<.5?-1:1,{b,pos}=at(this.curve,u,side*(80+this.rnd()*150),0);const geo=new THREE.DodecahedronGeometry(1,1);const m=new THREE.Mesh(geo,this.materials.rock);m.position.copy(pos);m.position.y+=20+this.rnd()*28;m.scale.set(26+this.rnd()*38,38+this.rnd()*72,24+this.rnd()*42);m.rotation.set(this.rnd(),b.yaw+this.rnd(),this.rnd()*.4);m.castShadow=false;this.root.add(m);}}
  buildSanctuary(){const {b,pos}=at(this.curve,.925,58,-.7);const center=pos;for(let i=0;i<8;i++){const a=i/8*TAU,r=21+(i%2)*5;const plinth=box(3.0,1.2,3.0,this.materials.stoneDark);plinth.position.set(center.x+Math.cos(a)*r,.2,center.z+Math.sin(a)*r);this.root.add(plinth);const col=new THREE.Mesh(new THREE.CylinderGeometry(.7,.9,9.5,16),this.materials.stone);col.position.set(plinth.position.x,5.4,plinth.position.z);col.castShadow=true;this.root.add(col);const cap=new THREE.Mesh(new THREE.SphereGeometry(.30,12,8),this.materials.goldGlow);cap.position.set(col.position.x,10.35,col.position.z);this.root.add(cap);}for(const rr of [13,20,28]){const ring=new THREE.Mesh(new THREE.TorusGeometry(rr,.07,8,128),this.materials.goldGlow);ring.rotation.x=Math.PI/2;ring.position.copy(center);ring.position.y=-.02;this.root.add(ring);}}
  buildStreetLife(){const lampCount=this.quality==='ultra'?72:this.quality==='high'?52:this.quality==='medium'?34:20;for(let i=0;i<lampCount;i++){const u=(i+.5)/lampCount,side=i%2?-1:1,offset=side*8.5;this.place(makeLamp(this.materials),u,offset,-.3,side>0?0:Math.PI);}for(let i=0;i<18;i++){const u=.03+i*.018,side=i%2?-1:1;const bench=box(1.6,.14,.48,this.materials.metal);this.place(bench,u,side*11,.2,side>0?0:Math.PI);}}
  buildRegional(){const count=this.quality==='ultra'?12:8;for(let i=0;i<count;i++){const u=.05+i/count*.9,side=i%2?-1:1,h=18+this.rnd()*28;const g=modernTower(this.materials,{w:8+this.rnd()*6,h,d:8+this.rnd()*6,side:side>0?-1:1,rnd:this.rnd});this.place(g,u,side*(22+this.rnd()*28),-.8,side>0?0:Math.PI);}}
  update(){return {worldGeometryV6:true};}
}
