import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function randomFrom(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

function trackCurve(event){
  const rnd=randomFrom(hash(event.id));
  const pts=[];const n=14;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,r=125+(rnd()-.5)*48;
    pts.push(new THREE.Vector3(Math.cos(a)*r,(rnd()-.5)*4,Math.sin(a)*r*.72));
  }
  return new THREE.CatmullRomCurve3(pts,true,'catmullrom',.28);
}

function roadGeometry(curve,width=12,segments=420){
  const pos=[],uv=[],idx=[];const up=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),t=new THREE.Vector3(),side=new THREE.Vector3();
  for(let i=0;i<=segments;i++){
    const u=i/segments;curve.getPointAt(u,p);curve.getTangentAt(u,t);side.crossVectors(up,t).normalize();
    for(const s of [-1,1]){const q=p.clone().addScaledVector(side,s*width*.5);pos.push(q.x,q.y,q.z);uv.push(s<0?0:1,u*28);}
  }
  for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=a+3;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

function carMesh(primary=0x0b0b0e,accent=0xd0a354){
  const root=new THREE.Group();
  const bodyMat=new THREE.MeshPhysicalMaterial({color:primary,metalness:.88,roughness:.17,clearcoat:1,clearcoatRoughness:.08});
  const dark=new THREE.MeshStandardMaterial({color:0x050508,metalness:.65,roughness:.24});
  const glow=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:3.2,roughness:.2});
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.05,.55,4.35),bodyMat);body.position.y=.62;body.castShadow=true;body.receiveShadow=true;root.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.62,.55,1.75),dark);cabin.position.set(0,1.04,-.18);cabin.scale.x=.92;root.add(cabin);
  const splitter=new THREE.Mesh(new THREE.BoxGeometry(2.12,.1,.5),dark);splitter.position.set(0,.34,-2.05);root.add(splitter);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(2.25,.08,.42),dark);wing.position.set(0,1.12,1.73);root.add(wing);
  for(const x of [-.63,.63]){const tail=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.04),glow);tail.position.set(x,.72,2.19);root.add(tail);}
  const wheelGeo=new THREE.CylinderGeometry(.38,.38,.28,20);wheelGeo.rotateZ(Math.PI/2);const wheelMat=new THREE.MeshStandardMaterial({color:0x030304,metalness:.2,roughness:.55});
  for(const x of [-1.05,1.05])for(const z of [-1.42,1.42]){const w=new THREE.Mesh(wheelGeo,wheelMat);w.position.set(x,.39,z);w.castShadow=true;root.add(w);}
  root.scale.set(.92,.92,.92);return root;
}

function brokenCircle(){
  const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0xc9a45e,metalness:.9,roughness:.22,emissive:0x6c4a18,emissiveIntensity:1.8});
  const segments=[[.12,.78],[.9,1.35],[1.48,2.08],[2.22,2.82],[2.97,3.57],[3.72,4.28],[4.45,5.08],[5.22,6.12]];
  for(const [a,b] of segments){const arc=b-a,geo=new THREE.TorusGeometry(18,.48,12,56,arc),m=new THREE.Mesh(geo,mat);m.rotation.z=a;m.position.y=21;group.add(m);}
  group.rotation.x=Math.PI/2;return group;
}

export class ThreeRaceView{
  constructor(canvas,event){
    this.canvas=canvas;this.event=event;this.curve=trackCurve(event);this.clock=new THREE.Clock();
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x03060d);this.scene.fog=new THREE.FogExp2(0x050912,.0048);
    this.camera=new THREE.PerspectiveCamera(66,1,.1,1000);this.camera.position.set(0,4,-8);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.buildWorld();this.resize();
  }
  buildWorld(){
    const hemi=new THREE.HemisphereLight(0x7699d9,0x130d09,1.25);this.scene.add(hemi);
    const moon=new THREE.DirectionalLight(0xa8c7ff,3.1);moon.position.set(-90,130,-70);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);moon.shadow.camera.left=-180;moon.shadow.camera.right=180;moon.shadow.camera.top=180;moon.shadow.camera.bottom=-180;this.scene.add(moon);
    const road=new THREE.Mesh(roadGeometry(this.curve,13),new THREE.MeshPhysicalMaterial({color:0x11141b,metalness:.32,roughness:.24,clearcoat:.78,clearcoatRoughness:.13}));road.receiveShadow=true;this.scene.add(road);
    const shoulder=new THREE.Mesh(roadGeometry(this.curve,17),new THREE.MeshStandardMaterial({color:0x08090d,metalness:.1,roughness:.68}));shoulder.position.y=-.08;shoulder.receiveShadow=true;this.scene.add(shoulder);
    const ground=new THREE.Mesh(new THREE.CircleGeometry(340,96),new THREE.MeshStandardMaterial({color:0x040609,roughness:.96}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.4;ground.receiveShadow=true;this.scene.add(ground);
    this.addBuildings();this.addLamps();this.addRain();
    const circle=brokenCircle();circle.position.set(0,0,0);this.scene.add(circle);this.circle=circle;
    this.player=carMesh(0x07090d,0xd9b35e);this.scene.add(this.player);
    this.aiCars=Array.from({length:8},(_,i)=>{const m=carMesh(i%2?0x101319:0x090a0d,i%2?0x3f78ff:0xe64444);m.scale.multiplyScalar(.96);this.scene.add(m);return m;});
  }
  addBuildings(){
    const rnd=randomFrom(hash(this.event.id+'city')),geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:0x10141b,metalness:.08,roughness:.76}),count=180;
    const mesh=new THREE.InstancedMesh(geo,mat,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){
      const a=rnd()*Math.PI*2,r=155+rnd()*135,h=8+rnd()*54,w=5+rnd()*13,d=5+rnd()*13;
      dummy.position.set(Math.cos(a)*r,h*.5-1,Math.sin(a)*r*.74);dummy.scale.set(w,h,d);dummy.rotation.y=rnd()*Math.PI;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);
  }
  addLamps(){
    const warm=0xffb56a;for(let i=0;i<22;i++){const u=i/22,p=this.curve.getPointAt(u);const l=new THREE.PointLight(warm,22,32,2);l.position.set(p.x,p.y+5.5,p.z);this.scene.add(l);}
  }
  addRain(){
    const count=1600,arr=new Float32Array(count*3),rnd=randomFrom(hash(this.event.id+'rain'));
    for(let i=0;i<count;i++){arr[i*3]=(rnd()-.5)*280;arr[i*3+1]=rnd()*70;arr[i*3+2]=(rnd()-.5)*220;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));const mat=new THREE.PointsMaterial({color:0xa9c8ff,size:.075,transparent:true,opacity:.5,depthWrite:false});this.rain=new THREE.Points(geo,mat);this.scene.add(this.rain);
  }
  resize(){const w=this.canvas.clientWidth||1,h=this.canvas.clientHeight||1;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  place(mesh,distance,total,lane=0){
    const u=((distance/Math.max(1,total))%1+1)%1,p=this.curve.getPointAt(u),t=this.curve.getTangentAt(u).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();
    mesh.position.copy(p).addScaledVector(side,lane*4.3);mesh.position.y+=.38;mesh.rotation.y=Math.atan2(t.x,t.z);return {p,t,side};
  }
  render(session,dt=.016){
    const total=session.totalDistanceM,{p,t,side}=this.place(this.player,session.player.distanceM,total,session.player.lane);
    session.ai.forEach((ai,i)=>{if(this.aiCars[i]){this.aiCars[i].visible=true;this.place(this.aiCars[i],ai.distanceM,total,ai.lane);}});for(let i=session.ai.length;i<this.aiCars.length;i++)this.aiCars[i].visible=false;
    const back=10+clamp(session.player.state.speedMps*.035,0,3),target=p.clone().add(new THREE.Vector3(0,1.1,0)),cam=target.clone().addScaledVector(t,-back).add(new THREE.Vector3(0,4.2,0)).addScaledVector(side,session.player.lane*.25);
    this.camera.position.lerp(cam,1-Math.pow(.003,dt));const look=target.clone().addScaledVector(t,10);this.camera.lookAt(look);
    if(this.circle)this.circle.rotation.z+=dt*.08;
    if(this.rain){this.rain.position.x=p.x;this.rain.position.z=p.z;this.rain.rotation.y+=dt*.01;}
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){
    this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose?.());}});this.renderer.dispose();
  }
}
