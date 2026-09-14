import * as THREE from 'three';

const TAU=Math.PI*2;
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function basis(curve,u){const p=curve.getPointAt(u),t=curve.getTangentAt(u).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();return {p,t,side,yaw:Math.atan2(t.x,t.z)};}
function matrix(curve,u,{offset=0,y=0,scale=[1,1,1],yawOffset=0}={}){const {p,side,yaw}=basis(curve,u),o=new THREE.Object3D();o.position.copy(p).addScaledVector(side,offset);o.position.y+=y;o.rotation.y=yaw+yawOffset;o.scale.set(...scale);o.updateMatrix();return o.matrix.clone();}
function inst(geo,mat,mats,{shadow=true}={}){const m=new THREE.InstancedMesh(geo,mat,Math.max(1,mats.length));m.count=mats.length;mats.forEach((x,i)=>m.setMatrixAt(i,x));m.instanceMatrix.needsUpdate=true;m.castShadow=shadow;m.receiveShadow=shadow;return m;}

export class HeroArchitecturePass{
  constructor(scene,curve,event,{palette,quality='high'}={}){
    this.scene=scene;this.curve=curve;this.event=event;this.countryId=event.countryId||'france';this.palette=palette;this.quality=quality;this.rnd=rng(hash(`${event.id}:hero-architecture-v2`));this.root=new THREE.Group();this.root.name='U3B_HeroArchitecturePass';scene.add(this.root);if(this.countryId==='france')this.buildFrance();
  }
  buildFrance(){this.buildHeritageFacades();this.buildQuayWalls();this.buildSignGantries();this.buildMatrixOverpasses();this.buildAlpinePortal();}
  buildHeritageFacades(){
    const stone=new THREE.MeshStandardMaterial({color:0x3c3a38,roughness:.68,metalness:.03}),roof=new THREE.MeshStandardMaterial({color:0x101217,roughness:.7,metalness:.12}),cornice=new THREE.MeshStandardMaterial({color:0x5b5650,roughness:.55,metalness:.04}),window=new THREE.MeshStandardMaterial({color:this.palette.warm,emissive:this.palette.warm,emissiveIntensity:2.1,roughness:.45});
    const shells=[],roofs=[],cornices=[],windows=[],count=this.quality==='ultra'?42:this.quality==='high'?32:22;
    for(let i=0;i<count;i++){
      const zonePick=this.rnd()<.72?this.rnd()*.28:.87+this.rnd()*.11,side=this.rnd()<.5?-1:1,offset=side*(15.5+this.rnd()*16),h=8+this.rnd()*13,w=5.5+this.rnd()*8,d=5+this.rnd()*8;
      shells.push(matrix(this.curve,zonePick,{offset,y:h*.5-.5,scale:[w,h,d]}));roofs.push(matrix(this.curve,zonePick,{offset,y:h+.35,scale:[w*1.04,.65,d*1.05]}));cornices.push(matrix(this.curve,zonePick,{offset:offset-side*.04,y:h-.1,scale:[w*1.05,.22,d*1.06]}));
      const floors=Math.max(2,Math.floor(h/2.4));for(let f=1;f<floors;f++)for(const col of [-.28,0,.28]){const lateral=offset-side*(d*.51);windows.push(matrix(this.curve,zonePick,{offset:lateral,y:f*2.15,scale:[.52,.72,.055],yawOffset:side<0?Math.PI:0}));}
    }
    const box=new THREE.BoxGeometry(1,1,1);this.root.add(inst(box,stone,shells),inst(box,roof,roofs),inst(box,cornice,cornices),inst(box,window,windows,{shadow:false}));
  }
  buildQuayWalls(){
    const stone=new THREE.MeshStandardMaterial({color:0x403d39,roughness:.73}),gold=new THREE.MeshStandardMaterial({color:this.palette.gold,emissive:this.palette.gold,emissiveIntensity:1.1,metalness:.65,roughness:.3}),walls=[],caps=[];for(let i=0;i<24;i++){const u=.145+i/23*.16,side=i%2?-1:1,offset=side*(11.8+(i%3)*.4);walls.push(matrix(this.curve,u,{offset,y:1.25,scale:[.7,2.7,4.8]}));caps.push(matrix(this.curve,u,{offset,y:2.72,scale:[.82,.10,4.9]}));}const box=new THREE.BoxGeometry(1,1,1);this.root.add(inst(box,stone,walls),inst(box,gold,caps,{shadow:false}));
  }
  buildSignGantries(){
    const metal=new THREE.MeshStandardMaterial({color:0x171c23,metalness:.72,roughness:.36}),panel=new THREE.MeshStandardMaterial({color:0x05080d,metalness:.35,roughness:.28}),edge=new THREE.MeshStandardMaterial({color:this.palette.gold,emissive:this.palette.gold,emissiveIntensity:1.55,metalness:.5,roughness:.3});
    const us=[.305,.405,.552,.705],box=new THREE.BoxGeometry(1,1,1);for(const u of us){const {p,yaw}=basis(this.curve,u),g=new THREE.Group();const left=new THREE.Mesh(box,metal),right=new THREE.Mesh(box,metal),beam=new THREE.Mesh(box,metal),sign=new THREE.Mesh(box,panel),line=new THREE.Mesh(box,edge);left.scale.set(.18,5,.18);right.scale.copy(left.scale);beam.scale.set(14.2,.18,.18);sign.scale.set(9.4,1.15,.18);line.scale.set(9.6,.055,.20);left.position.set(-6.8,2.45,0);right.position.set(6.8,2.45,0);beam.position.y=4.75;sign.position.set(0,3.95,0);line.position.set(0,3.28,.02);g.add(left,right,beam,sign,line);g.position.copy(p);g.rotation.y=yaw;this.root.add(g);}
  }
  buildMatrixOverpasses(){
    const dark=new THREE.MeshPhysicalMaterial({color:0x0a111a,metalness:.58,roughness:.22,clearcoat:.75,clearcoatRoughness:.12}),blue=new THREE.MeshStandardMaterial({color:this.palette.matrix,emissive:this.palette.matrix,emissiveIntensity:3.0,roughness:.24}),box=new THREE.BoxGeometry(1,1,1);
    for(const u of [.595,.64,.675]){const {p,yaw}=basis(this.curve,u),g=new THREE.Group(),bridge=new THREE.Mesh(box,dark),strip=new THREE.Mesh(box,blue);bridge.scale.set(17,.55,2.3);bridge.position.y=6.3;strip.scale.set(13,.06,.08);strip.position.set(0,5.95,1.18);g.add(bridge,strip);for(const x of [-7.2,7.2]){const leg=new THREE.Mesh(box,dark);leg.scale.set(.35,6.3,.55);leg.position.set(x,3,0);g.add(leg);}g.position.copy(p);g.rotation.y=yaw;this.root.add(g);}
  }
  buildAlpinePortal(){
    const stone=new THREE.MeshStandardMaterial({color:0x20252a,roughness:.9,metalness:.02}),gold=new THREE.MeshStandardMaterial({color:this.palette.gold,emissive:this.palette.gold,emissiveIntensity:1.3,roughness:.32}),{p,yaw}=basis(this.curve,.765),g=new THREE.Group();for(const x of [-7.3,7.3]){const tower=new THREE.Mesh(new THREE.BoxGeometry(2.0,7.8,4.2),stone);tower.position.set(x,3.4,0);g.add(tower);}const arch=new THREE.Mesh(new THREE.TorusGeometry(7.3,1.0,10,48,Math.PI),stone);arch.rotation.z=Math.PI;arch.position.y=4.8;g.add(arch);const inlay=new THREE.Mesh(new THREE.TorusGeometry(7.3,.08,6,48,Math.PI),gold);inlay.rotation.z=Math.PI;inlay.position.set(0,4.8,.95);g.add(inlay);g.position.copy(p);g.rotation.y=yaw;this.root.add(g);
  }
  update(){return {heroArchitecture:this.countryId==='france'};}
}
