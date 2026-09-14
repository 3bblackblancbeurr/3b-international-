import * as THREE from 'three';
import {COUNTRY_VISUALS,QUALITY_PROFILES,wetRoughness,zoneAt,sprayIntensity} from './visualConfig.js';

const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function color(hex){return new THREE.Color(hex);}

function ribbonGeometry(curve,width=13,offset=0,segments=480,y=0){
  const positions=[],uv=[],indices=[],up=new THREE.Vector3(0,1,0),p=new THREE.Vector3(),t=new THREE.Vector3(),side=new THREE.Vector3();
  for(let i=0;i<=segments;i++){
    const u=i/segments;curve.getPointAt(u,p);curve.getTangentAt(u,t);side.crossVectors(up,t).normalize();
    for(const s of [-1,1]){const q=p.clone().addScaledVector(side,offset+s*width*.5);positions.push(q.x,q.y+y,q.z);uv.push(s<0?0:1,u*36);}
  }
  for(let i=0;i<segments;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function transformOnCurve(curve,u,{offset=0,y=0,scale=[1,1,1],yawOffset=0}={}){
  const p=curve.getPointAt(((u%1)+1)%1),t=curve.getTangentAt(((u%1)+1)%1).normalize(),side=new THREE.Vector3(-t.z,0,t.x).normalize();
  const o=new THREE.Object3D();o.position.copy(p).addScaledVector(side,offset);o.position.y+=y;o.rotation.y=Math.atan2(t.x,t.z)+yawOffset;o.scale.set(...scale);o.updateMatrix();return {object:o,p,t,side};
}

function instanced(geometry,material,transforms){
  const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,transforms.length));mesh.count=transforms.length;transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

function skyDome(palette){
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:color(palette.sky)},horizon:{value:color(palette.horizon)},bottom:{value:color(0x010205)}},vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vPos;uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;void main(){float h=normalize(vPos).y;vec3 c=h>0.0?mix(horizon,top,smoothstep(0.0,.8,h)):mix(horizon,bottom,smoothstep(0.0,.35,-h));gl_FragColor=vec4(c,1.0);}'});
  return new THREE.Mesh(new THREE.SphereGeometry(720,32,18),material);
}

function brokenCircle(palette){
  const group=new THREE.Group();
  const dark=new THREE.MeshPhysicalMaterial({color:0x111318,metalness:.92,roughness:.25,clearcoat:.55,clearcoatRoughness:.2});
  const gold=new THREE.MeshStandardMaterial({color:palette.gold,metalness:.86,roughness:.22,emissive:palette.gold,emissiveIntensity:.72});
  const blue=new THREE.MeshStandardMaterial({color:palette.matrix,metalness:.4,roughness:.2,emissive:palette.matrix,emissiveIntensity:1.35});
  const arcs=[[.10,.76],[.90,1.31],[1.45,2.02],[2.18,2.75],[2.91,3.48],[3.64,4.18],[4.36,4.99],[5.17,6.08]];
  for(const [a,b] of arcs){const arc=b-a,body=new THREE.Mesh(new THREE.TorusGeometry(24,.88,16,72,arc),dark);body.rotation.z=a;body.castShadow=true;group.add(body);const inlay=new THREE.Mesh(new THREE.TorusGeometry(24,.18,10,64,arc*.91),gold);inlay.rotation.z=a+arc*.045;inlay.position.z=.76;group.add(inlay);}
  for(const a of [1.36,4.27]){const shard=new THREE.Mesh(new THREE.TorusGeometry(24,.09,8,24,.17),blue);shard.rotation.z=a;shard.position.z=.93;group.add(shard);}
  return group;
}

export class PremiumWorld{
  constructor(scene,curve,event,{quality='high',shadowMap=1536}={}){
    this.scene=scene;this.curve=curve;this.event=event;this.countryId=event.countryId||'france';this.visual=COUNTRY_VISUALS[this.countryId]||COUNTRY_VISUALS.france;this.palette=this.visual.palette;this.quality=QUALITY_PROFILES[quality]||QUALITY_PROFILES.high;this.rnd=rng(hash(event.id+'visual-v3'));this.elapsed=0;this.currentZone=zoneAt(0,this.countryId);
    this.buildSky();this.buildMaterials();this.buildLights(shadowMap);this.buildRoad();this.buildCity();this.buildWindows();this.buildLamps();this.buildFranceLandmarks();this.buildAtmosphere();this.buildRain();this.buildSpray();
  }
  buildSky(){this.sky=skyDome(this.palette);this.scene.add(this.sky);this.scene.background=color(this.palette.sky);this.scene.fog=new THREE.FogExp2(this.palette.fog,.0048);}
  buildMaterials(){
    const p=this.palette,w=this.visual.wetness;
    this.materials={road:new THREE.MeshPhysicalMaterial({color:p.road,metalness:.22,roughness:wetRoughness(.62,w),clearcoat:.88,clearcoatRoughness:.11}),shoulder:new THREE.MeshStandardMaterial({color:p.dark,metalness:.08,roughness:.76}),marking:new THREE.MeshStandardMaterial({color:p.marking,roughness:.42,metalness:.02,emissive:p.marking,emissiveIntensity:.06}),stone:new THREE.MeshStandardMaterial({color:p.stone,roughness:.7,metalness:.03}),dark:new THREE.MeshStandardMaterial({color:p.dark,roughness:.6,metalness:.12}),glass:new THREE.MeshPhysicalMaterial({color:p.glass,roughness:.18,metalness:.5,clearcoat:.75,clearcoatRoughness:.16}),window:new THREE.MeshStandardMaterial({color:p.warm,emissive:p.warm,emissiveIntensity:2.2,roughness:.5}),lamp:new THREE.MeshStandardMaterial({color:p.warm,emissive:p.warm,emissiveIntensity:5,roughness:.25}),blue:new THREE.MeshStandardMaterial({color:p.matrix,emissive:p.matrix,emissiveIntensity:3.3,metalness:.2,roughness:.25}),mountain:new THREE.MeshStandardMaterial({color:0x0a1118,roughness:.95,metalness:0}),water:new THREE.MeshPhysicalMaterial({color:0x071422,roughness:.16,metalness:.15,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.9})};
  }
  buildLights(shadowMap){
    this.hemi=new THREE.HemisphereLight(0x7798cf,0x100c09,1.15);this.scene.add(this.hemi);
    this.key=new THREE.DirectionalLight(0xa9c7ff,2.7);this.key.position.set(-95,135,-80);this.key.castShadow=true;this.key.shadow.mapSize.set(shadowMap,shadowMap);Object.assign(this.key.shadow.camera,{left:-220,right:220,top:220,bottom:-220,near:.5,far:500});this.key.shadow.camera.updateProjectionMatrix();this.key.shadow.bias=-.00025;this.scene.add(this.key);
    this.fill=new THREE.DirectionalLight(this.palette.warm,.55);this.fill.position.set(90,55,80);this.scene.add(this.fill);
    this.headlight=new THREE.SpotLight(0xeaf3ff,24,72,Math.PI/5,.55,1.3);this.headlight.castShadow=false;this.headlightTarget=new THREE.Object3D();this.scene.add(this.headlight,this.headlightTarget);this.headlight.target=this.headlightTarget;
  }
  buildRoad(){
    const road=new THREE.Mesh(ribbonGeometry(this.curve,13,0,520,.02),this.materials.road);road.receiveShadow=true;this.scene.add(road);this.road=road;
    const shoulder=new THREE.Mesh(ribbonGeometry(this.curve,17,0,520,-.06),this.materials.shoulder);shoulder.receiveShadow=true;this.scene.add(shoulder);
    for(const offset of [-2.2,2.2])this.scene.add(new THREE.Mesh(ribbonGeometry(this.curve,.08,offset,520,.055),this.materials.marking));
    for(const offset of [-6.25,6.25])this.scene.add(new THREE.Mesh(ribbonGeometry(this.curve,.12,offset,520,.05),this.materials.marking));
    const ground=new THREE.Mesh(new THREE.CircleGeometry(430,128),new THREE.MeshStandardMaterial({color:0x030509,roughness:.98}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.35;ground.receiveShadow=true;this.scene.add(ground);
  }
  buildCity(){
    const count=this.quality.buildings,categories={stone:[],dark:[],glass:[]};
    for(let i=0;i<count;i++){
      const u=this.rnd(),zone=zoneAt(u,this.countryId);if(this.countryId==='france'&&zone.id==='alps'&&this.rnd()<.72)continue;
      const side=this.rnd()<.5?-1:1,offset=side*(25+this.rnd()*100),heritage=this.countryId==='france'&&['heritage','quays','celiane'].includes(zone.id),modern=this.countryId==='france'&&['matrix','ringroad'].includes(zone.id);
      const h=heritage?8+this.rnd()*25:modern?16+this.rnd()*58:10+this.rnd()*42,w=5+this.rnd()*13,d=5+this.rnd()*13,{object}=transformOnCurve(this.curve,u,{offset,y:h*.5-1,scale:[w,h,d],yawOffset:(this.rnd()-.5)*.28});
      categories[modern&&this.rnd()>.3?'glass':heritage?'stone':this.rnd()>.6?'glass':'dark'].push(object.matrix.clone());
    }
    const geo=new THREE.BoxGeometry(1,1,1);for(const [k,transforms] of Object.entries(categories)){if(transforms.length)this.scene.add(instanced(geo,this.materials[k],transforms));}
  }
  buildWindows(){
    const transforms=[];for(let i=0;i<this.quality.windowClusters;i++){const u=this.rnd(),side=this.rnd()<.5?-1:1,offset=side*(27+this.rnd()*75),h=4+this.rnd()*31,{object}=transformOnCurve(this.curve,u,{offset,y:h,scale:[.18+.6*this.rnd(),.15+.45*this.rnd(),.035],yawOffset:side<0?Math.PI:0});transforms.push(object.matrix.clone());}
    const mesh=instanced(new THREE.BoxGeometry(1,1,1),this.materials.window,transforms);mesh.castShadow=false;mesh.receiveShadow=false;this.scene.add(mesh);
  }
  buildLamps(){
    const length=Math.max(1,this.curve.getLength()),spacing=32,count=Math.floor(length/spacing),pole=[],bulb=[],poleGeo=new THREE.CylinderGeometry(.055,.075,5.4,7),bulbGeo=new THREE.SphereGeometry(.13,8,6),poleMat=new THREE.MeshStandardMaterial({color:0x151a21,metalness:.8,roughness:.32});
    for(let i=0;i<count;i++)for(const side of [-1,1]){const u=i/count,{object}=transformOnCurve(this.curve,u,{offset:side*8.25,y:1.75});pole.push(object.matrix.clone());const {object:b}=transformOnCurve(this.curve,u,{offset:side*8.05,y:4.55});bulb.push(b.matrix.clone());}
    this.scene.add(instanced(poleGeo,poleMat,pole),instanced(bulbGeo,this.materials.lamp,bulb));
    for(let i=0;i<this.quality.actualLights;i++){const u=i/this.quality.actualLights+.013,{p,side}=transformOnCurve(this.curve,u),l=new THREE.PointLight(this.palette.warm,11,31,2);l.position.copy(p).addScaledVector(side,(i%2?1:-1)*7.5);l.position.y+=5.1;this.scene.add(l);}
  }
  buildFranceLandmarks(){if(this.countryId!=='france'){this.buildRegionalLandmark();return;}this.buildQuays();this.buildInterchange();this.buildTunnel();this.buildMatrixDistrict();this.buildAlps();this.buildSanctuary();}
  buildQuays(){
    const {p,side}=transformOnCurve(this.curve,.22),water=new THREE.Mesh(new THREE.PlaneGeometry(1,1),this.materials.water);water.rotation.x=-Math.PI/2;water.position.copy(p).addScaledVector(side,58);water.position.y=-1.05;water.scale.set(180,95,1);this.scene.add(water);this.water=water;
    for(const u of [.175,.225,.275]){const g=new THREE.Group(),deck=new THREE.Mesh(new THREE.BoxGeometry(38,.8,6),this.materials.stone);deck.position.y=3.2;g.add(deck);for(const x of [-14,14]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(2.1,7,2.1),this.materials.stone);pillar.position.set(x,-.2,0);g.add(pillar);}const {object:o}=transformOnCurve(this.curve,u,{yawOffset:Math.PI/2});g.position.copy(o.position);g.rotation.copy(o.rotation);this.scene.add(g);}
  }
  buildInterchange(){
    const mat=new THREE.MeshStandardMaterial({color:0x151a20,metalness:.22,roughness:.62});for(const u of [.33,.365,.40]){const g=new THREE.Group(),deck=new THREE.Mesh(new THREE.BoxGeometry(42,.65,5.2),mat);deck.position.y=5.5;g.add(deck);for(const x of [-15,15]){const p=new THREE.Mesh(new THREE.BoxGeometry(1.5,11,1.5),mat);p.position.set(x,0,0);g.add(p);}const {object:o}=transformOnCurve(this.curve,u,{yawOffset:Math.PI/2});g.position.copy(o.position);g.rotation.copy(o.rotation);this.scene.add(g);}
  }
  buildTunnel(){
    const postGeo=new THREE.BoxGeometry(1,1,1),posts=[],beams=[],lights=[],n=30;for(let i=0;i<n;i++){const u=.43+(i/(n-1))*.13;for(const side of [-1,1]){const {object}=transformOnCurve(this.curve,u,{offset:side*7.5,y:3.5,scale:[.45,7,.8]});posts.push(object.matrix.clone());}const {object:beam}=transformOnCurve(this.curve,u,{y:7,scale:[15.4,.45,.8]});beams.push(beam.matrix.clone());if(i%2===0){const {object:light}=transformOnCurve(this.curve,u,{y:6.55,scale:[7.8,.05,.13]});lights.push(light.matrix.clone());}}
    this.scene.add(instanced(postGeo,this.materials.dark,posts),instanced(postGeo,this.materials.dark,beams),instanced(postGeo,this.materials.lamp,lights));
  }
  buildMatrixDistrict(){
    const transforms=[];for(let i=0;i<20;i++){const u=.565+this.rnd()*.115,side=this.rnd()<.5?-1:1,h=28+this.rnd()*62,{object}=transformOnCurve(this.curve,u,{offset:side*(35+this.rnd()*75),y:h*.5,scale:[7+this.rnd()*10,h,7+this.rnd()*10]});transforms.push(object.matrix.clone());}this.scene.add(instanced(new THREE.BoxGeometry(1,1,1),this.materials.glass,transforms));
    const blue=[];for(let i=0;i<24;i++){const u=.56+i/24*.13,side=i%2?-1:1,{object}=transformOnCurve(this.curve,u,{offset:side*7.1,y:.18,scale:[.06,.08,3.4]});blue.push(object.matrix.clone());}this.scene.add(instanced(new THREE.BoxGeometry(1,1,1),this.materials.blue,blue));
  }
  buildAlps(){
    const transforms=[];for(let i=0;i<34;i++){const u=.68+this.rnd()*.20,side=this.rnd()<.5?-1:1,h=34+this.rnd()*92,{object}=transformOnCurve(this.curve,u,{offset:side*(70+this.rnd()*170),y:h*.45-2,scale:[18+this.rnd()*25,h,18+this.rnd()*25],yawOffset:this.rnd()*TAU});transforms.push(object.matrix.clone());}const mesh=instanced(new THREE.ConeGeometry(1,1,7),this.materials.mountain,transforms);mesh.castShadow=false;this.scene.add(mesh);
  }
  buildSanctuary(){
    const u=.925,{p,t,side,object}=transformOnCurve(this.curve,u,{offset:58,y:24});this.circle=brokenCircle(this.palette);this.circle.position.copy(object.position);this.circle.rotation.y=Math.atan2(t.x,t.z);this.circle.scale.set(1.18,1.18,1.18);this.scene.add(this.circle);
    const plazaMat=new THREE.MeshPhysicalMaterial({color:0x121317,metalness:.36,roughness:.34,clearcoat:.5,clearcoatRoughness:.2}),plaza=new THREE.Mesh(new THREE.CylinderGeometry(33,36,.65,72),plazaMat);plaza.position.copy(p).addScaledVector(side,58);plaza.position.y=-.65;this.scene.add(plaza);
    const glow=new THREE.PointLight(this.palette.gold,20,92,2);glow.position.copy(this.circle.position);glow.position.y+=3;this.scene.add(glow);const blue=new THREE.PointLight(this.palette.matrix,7,55,2);blue.position.copy(this.circle.position);blue.position.y+=16;this.scene.add(blue);
  }
  buildRegionalLandmark(){const u=.88,{p,t,side}=transformOnCurve(this.curve,u),g=brokenCircle(this.palette);g.scale.set(.72,.72,.72);g.position.copy(p).addScaledVector(side,62);g.position.y+=17;g.rotation.y=Math.atan2(t.x,t.z);this.circle=g;this.scene.add(g);}
  buildAtmosphere(){
    const count=this.quality.atmosphere,arr=new Float32Array(count*3);for(let i=0;i<count;i++){arr[i*3]=(this.rnd()-.5)*180;arr[i*3+1]=this.rnd()*36;arr[i*3+2]=(this.rnd()-.5)*180;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));this.atmosphere=new THREE.Points(geo,new THREE.PointsMaterial({color:0xadc7e8,size:.09,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}));this.scene.add(this.atmosphere);
  }
  buildRain(){
    const count=this.quality.rainStreaks,arr=new Float32Array(count*6),rnd=this.rnd;for(let i=0;i<count;i++){const x=(rnd()-.5)*150,y=rnd()*62,z=(rnd()-.5)*150,j=i*6;arr[j]=x;arr[j+1]=y;arr[j+2]=z;arr[j+3]=x+.08;arr[j+4]=y-(.7+rnd()*1.5);arr[j+5]=z+.28;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));this.rain=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xa9c9ff,transparent:true,opacity:.27,depthWrite:false,blending:THREE.AdditiveBlending}));this.rain.frustumCulled=false;this.scene.add(this.rain);
  }
  buildSpray(){
    const count=150,arr=new Float32Array(count*3);this.spraySeed=[];for(let i=0;i<count;i++){const x=(this.rnd()-.5)*2.9,y=this.rnd()*1.2,z=-this.rnd()*10;arr.set([x,y,z],i*3);this.spraySeed.push({phase:this.rnd(),speed:.5+this.rnd()});}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));this.spray=new THREE.Points(geo,new THREE.PointsMaterial({color:0xd8e9f4,size:.12,transparent:true,opacity:0,depthWrite:false}));this.spray.frustumCulled=false;this.scene.add(this.spray);
  }
  update({progress=0,playerPosition,playerTangent,speedKph=0,dt=.016,puddleDepth=.35}){
    this.elapsed+=dt;const z=zoneAt(progress,this.countryId);this.currentZone=z;const bg=color(z.background??this.palette.sky),fog=color(z.fog??this.palette.fog),blend=1-Math.pow(.025,dt);this.scene.background.lerp(bg,blend);this.scene.fog.color.lerp(fog,blend);this.scene.fog.density=THREE.MathUtils.lerp(this.scene.fog.density,z.fogDensity??.0048,blend);
    const wet=clamp((z.wetness??this.visual.wetness)*(/rain|pluie|storm|orage|wet/i.test(this.event.weather||'')?1.08:1));this.materials.road.roughness=wetRoughness(.62,wet);this.materials.road.clearcoatRoughness=THREE.MathUtils.lerp(.21,.075,wet);this.hemi.intensity=THREE.MathUtils.lerp(this.hemi.intensity,.85+(z.cool||.5)*.45,blend);this.fill.intensity=THREE.MathUtils.lerp(this.fill.intensity,.2+(z.warm||.5)*.65,blend);
    if(playerPosition){this.rain.position.set(playerPosition.x,0,playerPosition.z);this.atmosphere.position.set(playerPosition.x,0,playerPosition.z);this.spray.position.copy(playerPosition);}
    if(playerTangent&&playerPosition){const yaw=Math.atan2(playerTangent.x,playerTangent.z);this.spray.rotation.y=yaw;this.headlight.position.copy(playerPosition).add(new THREE.Vector3(0,1.05,0));this.headlightTarget.position.copy(playerPosition).addScaledVector(playerTangent,36);this.headlightTarget.position.y+=.35;}
    if(this.circle)this.circle.rotation.z+=dt*.018;
    const r=this.rain.geometry.attributes.position.array,fall=dt*(30+speedKph*.075);for(let i=0;i<r.length;i+=6){r[i+1]-=fall;r[i+4]-=fall;if(r[i+1]<-2){const h=48+this.rnd()*18,d=r[i+1]-r[i+4];r[i+1]=h;r[i+4]=h-d;}}this.rain.geometry.attributes.position.needsUpdate=true;this.rain.material.opacity=.05+.31*wet;
    const spray=sprayIntensity(speedKph,wet,puddleDepth),a=this.spray.geometry.attributes.position.array;for(let i=0;i<this.spraySeed.length;i++){const s=this.spraySeed[i],j=i*3;s.phase=(s.phase+dt*(.55+s.speed*1.5))%1;a[j]=(s.phase-.5)*3.6;a[j+1]=.12+s.phase*1.15;a[j+2]=-s.phase*(4+speedKph*.035);}this.spray.geometry.attributes.position.needsUpdate=true;this.spray.material.opacity=.38*spray;
    return {zone:z,wetness:wet,exposure:z.exposure||1.03};
  }
}
