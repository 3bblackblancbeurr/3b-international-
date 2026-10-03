import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cityMapBlueprint,cityMapRoads,cityBuildingKind} from './city3b-map.js';
import {cityResidentRoutes} from './city3b-life.js';
import {cityTrafficRoutes} from './city3b-simulation.js';
import {cityFootprint,cityPlacementCheck} from './city3b-construction.js';
import {premiumEffectsFromCodes} from '../store/premium-effects.js';
import {cityConstructionIsNight} from './city3b-environment.js';
import {matrixTree,buildingDetails} from './city3b-architecture.js';
import {cityLandscape,isWater,isRelief,terrainHeight} from './city3b-landscape.js';
import {cityConstructionState} from './city3b-building-progress.js';

// One coordinate system for the planner, saved placements, picking and 3D.
// No building exists here unless it is in the confirmed city snapshot.
export function createCityScene(host,{onPoint,onSelect,onError,onViewChange,onStroke,onHover}={}) {
  const mobile=matchMedia('(pointer: coarse), (max-height: 540px)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Carte 3D de construction. Glisser pour déplacer la vue, pincer pour zoomer.');
  renderer.domElement.tabIndex=0;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,3000);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.12;
  controls.minDistance=9;controls.maxDistance=2100;controls.screenSpacePanning=false;
  controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
  controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
  const hemi=new THREE.HemisphereLight(0xc8e8ff,0x6b714b,2.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffedcc,3.2);sun.position.set(-100,170,80);scene.add(sun);sun.castShadow=true;sun.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:400});sun.shadow.bias=-.0008;sun.shadow.normalBias=.03;scene.add(sun.target);
  const world=new THREE.Group(),ghost=new THREE.Group(),people=new THREE.Group(),sites=new THREE.Group();scene.add(world,ghost,people,sites);
  const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.IcosahedronGeometry(1,1),cylinderGeo=new THREE.CylinderGeometry(1,1,1,10),coneGeo=new THREE.ConeGeometry(1,1,4),ringGeo=new THREE.TorusGeometry(2.8,.25,8,32,Math.PI*1.7);
  const geometries=new Set([boxGeo,sphereGeo,cylinderGeo,coneGeo,ringGeo]),materials=new Map();
  const mat=(color,emissive=false,opacity=1)=>{
    const key=`${color}:${emissive}:${opacity}`;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:emissive?.35:.62,metalness:emissive?.2:.16,emissive:emissive?color:0,emissiveIntensity:emissive?.7:0,transparent:opacity<1,opacity,depthWrite:opacity===1}));
    return materials.get(key);
  };
  function shape(parent,geo,color,x,y,z,w,h,d,emissive=false,opacity=1){const mesh=new THREE.Mesh(geo,mat(color,emissive,opacity));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=opacity===1;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const box=(parent,color,x,y,z,w,h,d,emissive=false,opacity=1)=>shape(parent,boxGeo,color,x,y,z,w,h,d,emissive,opacity);
  function terrainGeometry(half,features,segments=Math.min(256,Math.ceil(half/2))){
    const geometry=new THREE.PlaneGeometry(half*2,half*2,segments,segments);geometry.rotateX(-Math.PI/2);
    const positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setY(i,terrainHeight(features,positions.getX(i),positions.getZ(i))-.05);
    geometry.computeVertexNormals();return geometry;
  }
  const sky=new THREE.Group();scene.add(sky);
  const skyGeometry=new THREE.SphereGeometry(2600,32,16);geometries.add(skyGeometry);
  const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 direction;void main(){float h=clamp(normalize(direction).y,0.0,1.0);gl_FragColor=vec4(mix(vec3(.79,.91,1.),vec3(.16,.49,.85),pow(h,.55)),1.0);}'});materials.set('sky',skyMaterial);sky.add(new THREE.Mesh(skyGeometry,skyMaterial));
  const cloudMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.92,depthWrite:false,fog:false}),sunMaterial=new THREE.MeshBasicMaterial({color:0xfff0b3,fog:false});materials.set('cloud',cloudMaterial);materials.set('sunDisc',sunMaterial);
  const sunDisc=new THREE.Mesh(sphereGeo,sunMaterial);sunDisc.position.set(-650,950,-900);sunDisc.scale.setScalar(58);sky.add(sunDisc);
  for(let i=0;i<12;i++){const cloud=new THREE.Group(),angle=i*Math.PI/6;cloud.position.set(Math.cos(angle)*1250,380+(i%3)*90,Math.sin(angle)*1250);for(let j=0;j<4;j++){const puff=new THREE.Mesh(sphereGeo,cloudMaterial);puff.position.set(j*55-80,(j%2)*16,0);puff.scale.set(75,24+(j%2)*12,45);cloud.add(puff);}sky.add(cloud);}
  function tree(parent,x,z,size=1){
    matrixTree({box,shape,sphereGeo,cylinderGeo},parent,x,z,size);
  }
  function road(parent,x1,z1,x2,z2,width=4){
    const length=Math.hypot(x2-x1,z2-z1);if(length<.01)return;
    const strip=box(parent,0x555f63,(x1+x2)/2,.055,(z1+z2)/2,width,.1,length+.35);
    strip.rotation.y=Math.atan2(x2-x1,z2-z1);
    const sidewalk=box(parent,0xb7b7a4,(x1+x2)/2,-.02,(z1+z2)/2,width+1,.11,length);sidewalk.rotation.y=strip.rotation.y;
    for(const side of [-1,1]){const dx=Math.cos(strip.rotation.y)*side*(width/2-.12),dz=-Math.sin(strip.rotation.y)*side*(width/2-.12);const edge=box(parent,0x58afce,(x1+x2)/2+dx,.12,(z1+z2)/2+dz,.055,.025,length,true);edge.rotation.y=strip.rotation.y;}
    for(const p of [[x1,z1],[x2,z2]])shape(parent,cylinderGeo,0x555f63,p[0],.055,p[1],width/2,.1,width/2);
    const dashCount=Math.min(70,Math.floor(length/5));
    for(let i=1;i<dashCount;i++){const t=i/dashCount;const dash=box(parent,0xe2d8b2,x1+(x2-x1)*t,.117,z1+(z2-z1)*t,.1,.025,1.4);dash.rotation.y=strip.rotation.y;}
  }
  function landscape(parent,f,preview=false){
    const x=(f.x1+f.x2)/2,z=(f.z1+f.z2)/2,r=f.width/2;
    if(isRelief(f)){if(preview){const geometry=terrainGeometry(r,[{...f,x1:0,z1:0}],40);previewGeometries.push(geometry);const mesh=new THREE.Mesh(geometry,mat(f.kind==='hill'?0x6ad2b1:0x6acaff,true,.55));mesh.position.set(x,.1,z);parent.add(mesh);}return;}
    if(isWater(f)){
      const color=preview?0x66caff:night?0x124d68:0x267b97;
      if(f.kind==='lake'){
        shape(parent,cylinderGeo,0x7796a0,x,.02,z,r+.5,.08,r+.5);
        shape(parent,cylinderGeo,color,x,.08,z,r,.07,r,true);
        shape(parent,cylinderGeo,0x44b4d1,x,.12,z,r*.75,.012,r*.75);
      }else{
        const length=Math.hypot(f.x2-f.x1,f.z2-f.z1),angle=Math.atan2(f.x2-f.x1,f.z2-f.z1);
        const bank=box(parent,0x7796a0,x,.025,z,f.width+1,.08,length);bank.rotation.y=angle;
        const water=box(parent,color,x,.085,z,f.width,.08,length);water.rotation.y=angle;
        for(const p of [[f.x1,f.z1],[f.x2,f.z2]]){shape(parent,cylinderGeo,0x7796a0,p[0],.025,p[1],r+.5,.08,r+.5);shape(parent,cylinderGeo,color,p[0],.085,p[1],r,.08,r,true);}
      }
    }else if(f.kind==='tree')tree(parent,x,z,r);
    else if(f.kind==='garden'){shape(parent,cylinderGeo,0x334e59,x,.025,z,r,.1,r);for(const side of [-1,1])tree(parent,x+side*r*.4,z,r*.38);box(parent,0xc9b07c,x,.15,z,r*.12,.1,r*1.7);}
    else if(f.kind==='bench'){box(parent,0x2d4653,x,.55,z,1.5,.12,.48);box(parent,0xc7ad79,x,.9,z-.22,1.5,.55,.08);for(const side of [-1,1])box(parent,0x61c1ee,x+side*.55,.27,z,.08,.5,.38,true);}
    else if(f.kind==='light'){box(parent,0xc7ad79,x,1.6,z,.09,3.2,.09);box(parent,0x63c6ed,x,3.2,z,.9,.09,.22,true);shape(parent,cylinderGeo,0x2b4d5b,x,.08,z,.4,.16,.4);}
  }
  let groundPick=null,previewGeometries=[];
  let data={},night=false,premium={},picks=[],animated=[],latest={},dead=false,visible=true,reduced=false,frame=0,last=0,dirty=true,first=true,mergedGeometries=[],constructionSites=[];
  let clock={time:Date.now(),tick:performance.now()};
  const syncClock=value=>{const parsed=Date.parse(value);if(Number.isFinite(parsed))clock={time:parsed,tick:performance.now()};};
  const serverNow=()=>clock.time+performance.now()-clock.tick;
  function building(row,definition,parent=world,preview=false){
    const group=new THREE.Group(),worldW=Math.max(.7,Number(row.footprint_w)||1),worldD=Math.max(.7,Number(row.footprint_h)||1);
    const quarter=(Number(row.rotation)||0)%180!==0,w=quarter?worldD:worldW,d=quarter?worldW:worldD;
    group.position.set(Number(row.x)+worldW/2,.08,Number(row.z)+worldD/2);group.rotation.y=-(Number(row.rotation)||0)*Math.PI/180;parent.add(group);
    const kind=cityBuildingKind(definition),code=String(definition.code||row.building_code),small=Math.min(w,d);
    const height=Math.min(18,Math.max(.9,small*(code==='HOME_ORIGIN'?.8:kind==='housing'?1.15:kind==='landmark'?2.5:.8)));
    const ivory=premium.champagneArchitecture?0xdbcca1:0xbecbd1,glass=night?0x69c8f4:0x2c6680;
    box(group,0x657459,0,.012,0,w*1.05,.02,d*1.05);
    box(group,0xc1bdaa,0,.04,0,w,.07,d);
    if(kind==='green'){
      box(group,0x76a45d,0,.085,0,w*.91,.1,d*.91);
      box(group,0xd5c6a2,0,.15,0,w*.94,.03,d*.17);
      for(const [x,z] of [[-.25,-.23],[.27,-.18],[-.2,.28]])tree(group,x*w,z*d,small*.26);
      box(group,0x76533c,w*.22,small*.17,d*.24,w*.27,small*.08,d*.09);
    }else if(/ARENA|sport|stadium/i.test(code+' '+definition.category)){
      box(group,0x2e8d7b,0,.17,0,w*.85,.15,d*.8);
      for(const x of [-1,1])box(group,0xe7e4cd,x*w*.4,.25,0,.05,.02,d*.78);
      for(const z of [-1,1])box(group,0xe7e4cd,0,.25,z*d*.38,w*.8,.02,.05);
      box(group,0xe7e4cd,0,.25,0,w*.8,.02,.05);
      for(const z of [-1,1])box(group,0xbbbeb4,0,.55,z*d*.38,w*.2,.65,.05);
    }else if(/SOLAR|energy/.test(code)){
      for(const x of [-.24,.24])for(const z of [-.24,.24]){const panel=box(group,0x204b70,x*w,.4,z*d,w*.35,.07,d*.35);panel.rotation.x=-.18;}
    }else if(/WATER/.test(code)){
      shape(group,cylinderGeo,0xd5ded5,0,small*.4,0,w*.31,small*.7,d*.31);
      shape(group,cylinderGeo,0x439eab,0,small*.76,0,w*.3,.05,d*.3);
    }else if(kind==='mobility'){
      box(group,0x263c43,0,small*.2,0,w*.7,small*.4,d*.42);
      box(group,ivory,0,small*.55,0,w*.84,.14,d*.58);
      box(group,glass,0,small*.32,d*.22,w*.62,small*.28,.04,night);
      box(group,0x3b96ca,w*.4,small*.6,-d*.3,.08,small*1.1,.08);
    }else{
      box(group,ivory,0,height/2,0,w*.79,height,d*.74);
      box(group,kind==='housing'?0x936d59:0x465c61,0,height+.1,0,w*.85,.2,d*.82);
      if(kind==='housing'){
        box(group,0x283b48,0,height+.21,0,w*.68,.22,d*.65);
      } else if(kind==='landmark') {
        box(group,0xccb479,0,height+small*.28,0,w*.28,small*.4,d*.28);
      }
      const floors=Math.min(5,Math.max(1,Math.floor(height/.9))),columns=Math.min(5,Math.max(2,Math.floor(w)));
      for(let level=0;level<floors;level++)for(let column=0;column<columns;column++){
        const x=(column/(columns-1)-.5)*w*.53,y=(level+.6)*height/floors;
        for(const z of [-1,1])box(group,glass,x,y,z*d*.374,w*.11,height/floors*.45,.025,night);
      }
      box(group,0x354a52,0,height*.18,d*.38,w*.17,height*.34,.05);
      box(group,0xb6aa8e,0,.13,d*.43,w*.24,.16,d*.15);
      if(w>=3){for(const x of [-.37,.37]){box(group,0x8b7357,x*w,.22,d*.36,w*.14,.34,d*.16);shape(group,sphereGeo,0x619259,x*w,.49,d*.36,w*.1,.25,d*.11);}}
      if(kind==='housing'&&w>=3){for(const side of [-1,1]){box(group,0xd9d4bd,side*w*.27,height*.55,d*.45,w*.22,.08,d*.2);box(group,0x547174,side*w*.27,height*.64,d*.54,w*.22,height*.18,.04);}}
      if(kind==='commerce'){
        box(group,0x668c69,0,height*.5,d*.45,w*.88,.13,d*.2);
        for(const x of [-.28,.28]){shape(group,cylinderGeo,0xe9dec0,x*w,.75*small,d*.65,.16*small,.05,.16*small);}
      }
      if(/CLINIC/.test(code)){
        box(group,0x4db6d0,0,height*.8,d*.382,w*.28,.1,.045,true);
        box(group,0x4db6d0,0,height*.8,d*.383,.1,small*.28,.045,true);
      }
      if(/SCHOOL/.test(code))box(group,0xc4b780,w*.42,.15,0,w*.1,.2,d*.8);
    }
    buildingDetails({box,shape,sphereGeo},group,{w,d,height,kind});
    if(!preview){const pick=new THREE.Mesh(boxGeo,mat(ivory));pick.position.set(group.position.x,height/2,group.position.z);pick.scale.set(worldW,height,worldD);pick.userData.placement=row;pick.updateMatrixWorld();picks.push(pick);}
    return group;
  }
  function clear(group){while(group.children.length)group.remove(group.children[0]);}
  function rebuild(snapshot,codes){
    data=snapshot;syncClock(snapshot.serverTime);premium=premiumEffectsFromCodes(codes);picks=[];animated=[];constructionSites=[];clear(world);clear(people);clear(sites);
    for(const geometry of mergedGeometries)geometry.dispose();mergedGeometries=[];
    const plan=cityMapBlueprint(data),roads=cityMapRoads(plan),half=plan.half;
    night=cityConstructionIsNight(data.city);
    scene.background=new THREE.Color(night?0x476585:0xa3d6ff);scene.fog=new THREE.Fog(scene.background,half*3,half*10);
    hemi.intensity=night?1.9:3.1;sun.intensity=night?1.1:3.4;sun.color.set(night?0x96bded:0xffedcc);
    const groundGeometry=terrainGeometry(half,cityLandscape(data));
    groundPick=new THREE.Mesh(groundGeometry,mat(night?0x678c71:0xa8bf83));groundPick.receiveShadow=true;world.add(groundPick);mergedGeometries.push(groundGeometry);groundPick.updateMatrixWorld();
    // Four ocean strips surround all edges without covering the player's land.
    for(const side of [-1,1]){box(world,0x379dbe,side*half*2,-.18,0,half*2,.1,half*6);box(world,0x379dbe,0,-.18,side*half*2,half*2,.1,half*2);}
    for(const side of [-1,1]){box(world,0xd5cca4,side*(half+.7),-.06,0,1.4,.1,half*2);box(world,0xd5cca4,0,-.06,side*(half+.7),half*2,.1,1.4);}
    sky.visible=!night;

    // Distant scenery is outside the playable land and never counted as player buildings.
    for(let i=0;i<13;i++){
      const mountain=shape(world,coneGeo,night?0x243d46:0x779286,-half*2+i*half/3,half*.17,-half*1.7-(i%3)*half*.16,half*.48,half*(.35+(i%3)*.1),half*.43);mountain.rotation.y=i*.9;
    }
    for(const ring of roads.rings)for(let i=0;i<80;i++){
      const a=i*Math.PI/40,b=(i+1)*Math.PI/40;
      road(world,Math.cos(a)*ring.radius,Math.sin(a)*ring.radius,Math.cos(b)*ring.radius,Math.sin(b)*ring.radius,ring.width);
    }
    for(const r of [...roads.boulevards,...roads.radials.filter(r=>r.unlocked),...roads.custom])road(world,r.x1,r.z1,r.x2,r.z2,r.width||4);
    for(const feature of cityLandscape(data))landscape(world,feature);
    const definitions=new Map((data.buildings||[]).map(b=>[b.code,b]));
    for(const row of (data.placements||[]).filter(p=>p.placement_state!=='stored')){
      const state=cityConstructionState(row,serverNow()),definition=definitions.get(row.building_code)||{};
      if(state.progress>=1){building(row,definition);continue;}
      const group=new THREE.Group();sites.add(group);
      const final=building(row,definition,group),w=Math.max(.7,Number(row.footprint_w)||1),d=Math.max(.7,Number(row.footprint_h)||1),x=Number(row.x),z=Number(row.z);
      const work=new THREE.Group();group.add(work);
      box(work,0xa79678,x+w/2,.09,z+d/2,w+.25,.16,d+.25);
      const frame=new THREE.Group();work.add(frame);
      const h=Math.min(14,Math.max(1.6,Math.min(w,d)*1.3));
      for(const dx of [.06,.94])for(const dz of [.06,.94])box(frame,0xdac39a,x+w*dx,h/2,z+d*dz,.07,h,.07);
      for(let level=1;level<=3;level++){
        for(const dz of [.06,.94])box(frame,0xcfc0a0,x+w/2,h*level/3,z+d*dz,w,.055,.055);
        for(const dx of [.06,.94])box(frame,0xcfc0a0,x+w*dx,h*level/3,z+d/2,.055,.055,d);
      }
      for(const dx of [0,1])box(work,0xe8b452,x+w*dx,.25,z+d/2,.1,.45,d);
      for(const dz of [0,1])box(work,0xe8b452,x+w/2,.25,z+d*dz,w,.45,.1);
      const crane=new THREE.Group();crane.position.set(x+w*.83,0,z+d*.2);work.add(crane);
      box(crane,0xd4aa4b,0,h*.65,0,.09,h*1.3,.09);box(crane,0xe7bc59,0,h*1.3,0,w*.95,.1,.1);
      box(crane,0x6c6b5e,-w*.35,h*1.27,0,.045,h*.3,.045);
      constructionSites.push({row,group,final,work,frame,crane});
    }
    // Collection displays belong to the saved city, including in public visits.
    for(const display of data.displays||[]){
      const x=Number(display.x),z=Number(display.z);if(!Number.isFinite(x)||!Number.isFinite(z))continue;
      shape(world,cylinderGeo,0xbbae89,x,.2,z,.7,.4,.7);
      const gem=shape(world,sphereGeo,0x67b5d5,x,.95,z,.4,.6,.4,night);gem.rotation.y=Number(display.rotation||0)*Math.PI/180;
    }
    // Locked districts are marked, but do not masquerade as built neighborhoods.
    for(const d of plan.districts.filter(d=>!d.unlocked)){
      const marker=shape(world,cylinderGeo,0x799099,d.x,.12,d.z,2,.2,2);marker.material=mat(0x799099,false,.45);
    }
    if(premium.brokenCircleMonument){
      const geometry=ringGeo;
      const monument=new THREE.Mesh(geometry,mat(0xd1b575));monument.position.set(0,3,0);world.add(monument);
    }
    if(premium.waterfront)for(let i=-2;i<=2;i++)box(world,0xd1bc8e,i*12,.02,plan.coastZ+4,2,.2,10);
    if(premium.nightLuxe&&night)for(let i=-8;i<=8;i++){
      box(world,0x77c6ef,i*half/9,.22,plan.coastZ-1,.5,.08,1.2,true);
      box(world,0xe5c586,i*half/9,.2,plan.coastZ-1,2,.05,.12,true);
    }
    if(premium.matrixRoads)for(const r of roads.custom){const line=box(world,0x48b2ee,(r.x1+r.x2)/2,.13,(r.z1+r.z2)/2,.12,.03,Math.hypot(r.x2-r.x1,r.z2-r.z1),true);line.rotation.y=Math.atan2(r.x2-r.x1,r.z2-r.z1);}
    // Batch static architecture/roads by material: tens of draw calls, not thousands.
    world.updateMatrixWorld(true);const batches=new Map();
    world.traverse(object=>{if(!object.isMesh)return;const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.applyMatrix4(object.matrixWorld);const key=object.material;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(geometry);});
    clear(world);for(const [material,parts] of batches){const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();if(geometry){mergedGeometries.push(geometry);const merged=new THREE.Mesh(geometry,material);merged.castShadow=material.opacity===1;merged.receiveShadow=true;world.add(merged);}}
    for(const resident of cityResidentRoutes(data,mobile?12:24)){
      const points=resident.path.match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[];
      const path=[];for(let i=0;i<points.length;i+=2)path.push(new THREE.Vector3(points[i],.3,points[i+1]));
      const person=new THREE.Group();box(person,0x324a6a,0,.32,0,.23,.55,.22);shape(person,sphereGeo,0xbb9675,0,.72,0,.15,.15,.15);people.add(person);
      if(path.length)person.position.copy(path[0]);
      if(path.length>1)animated.push({object:person,path,duration:resident.duration,offset:Math.abs(resident.delay),lengths:path.slice(1).map((p,i)=>p.distanceTo(path[i]))});
    }
    const transit=(data.placements||[]).some(p=>p.placement_state!=='stored'&&cityBuildingKind(definitions.get(p.building_code)||{})==='mobility');
    for(const [index,v] of cityTrafficRoutes(data).slice(0,mobile?8:16).entries()){
      const vehicle=new THREE.Group(),bus=transit&&index%4===0;
      box(vehicle,bus?0xdbd7be:[0x9eb5b4,0x365d77,0xbdb4a8][index%3],0,.32,0,bus?.7:.48,bus?.65:.4,bus?2.3:1);
      box(vehicle,0x294e62,0,.6,bus?.15:.1,bus?.71:.4,.19,bus?1.8:.5);people.add(vehicle);
      const path=[new THREE.Vector3(v.x1,.12,v.z1),new THREE.Vector3(v.x2,.12,v.z2)];vehicle.position.copy(path[0]);
      animated.push({object:vehicle,path,duration:v.duration,offset:v.delay,lengths:[path[0].distanceTo(path[1])]});
    }
    if(first){setView({center:{x:0,z:0},zoom:1.6});first=false;}
    updateDraft(latest);dirty=true;
  }
  function updateDraft(props={}){
    latest=props;clear(ghost);for(const geometry of previewGeometries)geometry.dispose();previewGeometries=[];controls.enabled=!!props.pan||(props.tool!=='road'&&!(props.tool==='landscape'&&props.landscapeKind==='river'));
    if(props.previewOnly){dirty=true;return;}
    if(props.selectedId&&!props.activeDefinition&&!props.activePlacement){
      const selected=(data.placements||[]).find(p=>p.id===props.selectedId&&p.placement_state!=='stored');
      if(selected){const w=Number(selected.footprint_w)||1,d=Number(selected.footprint_h)||1,x=Number(selected.x),z=Number(selected.z);for(const dz of [0,d])box(ghost,0xf2d38d,x+w/2,.21,z+dz,w,.09,.1,true);for(const dx of [0,w])box(ghost,0xf2d38d,x+dx,.21,z+d/2,.1,.09,d,true);}
    }
    if(props.activeDefinition||props.activePlacement){
      const size=cityFootprint(props.activeDefinition,props.draft?.rotation,props.activePlacement);
      const check=cityPlacementCheck(data,props.draft,size,props.activePlacement?.id);
      const color=check.valid?0x49baff:0xef746f;
      const x=props.draft.x+size.width/2,z=props.draft.z+size.height/2;
      const model=building({x:props.draft.x,z:props.draft.z,footprint_w:size.width,footprint_h:size.height,rotation:props.draft.rotation},props.activeDefinition||{},ghost,true);
      model.traverse(child=>{if(child.isMesh)child.material=mat(child.material.color.getHex(),false,.4);});
      box(ghost,color,x,.2,z,size.width,.12,size.height,true,.45);
      for(const dx of [-1,1])box(ghost,color,x+dx*size.width/2,.45,z,.1,.5,size.height,true);
      for(const dz of [-1,1])box(ghost,color,x,.45,z+dz*size.height/2,size.width,.5,.1,true);
    }
    for(const f of props.drawPreview||[]){if(f.kind)landscape(ghost,f,true);else road(ghost,f.x1,f.z1,f.x2,f.z2,f.width);}
    if(props.roadStart)shape(ghost,cylinderGeo,0x49baff,props.roadStart.x,.3,props.roadStart.z,1,.3,1,true);
    dirty=true;
  }
  function setView({center,zoom}){
    const half=cityMapBlueprint(data).half,radius=Math.max(10,half/(zoom||1.6)),target=new THREE.Vector3(center?.x||0,0,center?.z||0);
    controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(radius*.85,radius*1.1,radius*1.3));controls.update();dirty=true;
  }
  function district(code){const d=cityMapBlueprint(data).districts.find(d=>d.code===code);setView({center:d?{x:d.x,z:d.z}:{x:0,z:0},zoom:3.5});}
  const resize=()=>{const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);
  const intersect=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;dirty=true;});intersect.observe(host);
  const media=matchMedia('(prefers-reduced-motion: reduce)');const motion=()=>{reduced=media.matches||document.documentElement.dataset.motion==='reduced';dirty=true;};motion();media.addEventListener('change',motion);
  const motionObserver=new MutationObserver(motion);motionObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
  let down=null,pointers=new Set();
  const terrainPoint=e=>{const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const intersection=groundPick?ray.intersectObject(groundPick,false)[0]:null;const point=intersection?.point||ray.ray.intersectPlane(plane,hit);return point?{x:Math.round(point.x),z:Math.round(point.z)}:null;};
  const drawing=()=>!latest.pan&&(latest.tool==='road'||latest.tool==='landscape'&&latest.landscapeKind==='river');
  const pointerDown=e=>{pointers.add(e.pointerId);if(pointers.size>1)down=null;else down={x:e.clientX,y:e.clientY,id:e.pointerId,point:terrainPoint(e)};};
  const pointerMove=e=>{if(latest.previewOnly||pointers.size>1||!drawing())return;const p=terrainPoint(e);if(p)onHover?.(p,down?.point);};
  const pointerUp=e=>{
    const start=down;pointers.delete(e.pointerId);down=null;
    if(!start||start.id!==e.pointerId||pointers.size||latest.previewOnly||latest.pan||e.button>0)return;
    if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>7){if(drawing()){const end=terrainPoint(e);if(start.point&&end)onStroke?.(start.point,end);}return;}
    const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
    const pick=!['road','landscape','build','move'].includes(latest.tool)?ray.intersectObjects(picks,false)[0]:null;
    if(pick?.object.userData.placement){onSelect?.(pick.object.userData.placement);return;}
    const point=terrainPoint(e);if(point)onPoint?.(point);
  };
  const cancel=e=>{pointers.delete(e.pointerId);down=null;};
  const lost=e=>{e.preventDefault();onError?.('Le rendu 3D a été interrompu. Relance la vue pour continuer ; tes constructions sont sauvegardées.');};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',lost);
  const controlChanged=()=>{const half=cityMapBlueprint(data).half,clampedX=Math.max(-half,Math.min(half,controls.target.x)),clampedZ=Math.max(-half,Math.min(half,controls.target.z));camera.position.x+=clampedX-controls.target.x;camera.position.z+=clampedZ-controls.target.z;controls.target.x=clampedX;controls.target.z=clampedZ;camera.near=Math.max(.5,camera.position.distanceTo(controls.target)/100);camera.updateProjectionMatrix();sun.position.set(clampedX-100,170,clampedZ+80);sun.target.position.set(clampedX,0,clampedZ);dirty=true;onViewChange?.();};controls.addEventListener('change',controlChanged);
  const key=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='+'||e.key==='-'){const v=camera.position.clone().sub(controls.target).multiplyScalar(e.key==='+'?.85:1.15);camera.position.copy(controls.target).add(v);}else{const dx=e.key==='ArrowLeft'?-3:e.key==='ArrowRight'?3:0,dz=e.key==='ArrowUp'?-3:e.key==='ArrowDown'?3:0;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;}controls.update();dirty=true;};renderer.domElement.addEventListener('keydown',key);
  function animate(time){
    if(dead)return;frame=requestAnimationFrame(animate);
    if(document.hidden||!visible||time-last<(mobile?1000/30:1000/45))return;
    if(!dirty&&!constructionSites.length&&(reduced||!animated.length))return;last=time;
    for(const site of constructionSites){
      const state=cityConstructionState(site.row,serverNow());
      site.work.visible=state.progress<1;site.final.visible=state.progress>=.25;site.frame.visible=state.progress>=.25;
      site.final.scale.y=state.progress>=1?1:Math.max(.03,Math.min(1,(state.progress-.2)/.8));
      if(!reduced)site.crane.rotation.y=Math.sin(time*.00035)*.5;
    }
    if(!reduced)for(const actor of animated){
      const total=actor.lengths.reduce((a,b)=>a+b,0);let left=((time/1000+actor.offset)%actor.duration)/actor.duration*total;
      for(let i=0;i<actor.lengths.length;i++){const length=actor.lengths[i];if(left<=length||i===actor.lengths.length-1){actor.object.position.lerpVectors(actor.path[i],actor.path[i+1],length?left/length:0);actor.object.rotation.y=Math.atan2(actor.path[i+1].x-actor.path[i].x,actor.path[i+1].z-actor.path[i].z);break;}left-=length;}
    }
    sky.position.copy(camera.position);renderer.render(scene,camera);dirty=false;
  }
  frame=requestAnimationFrame(animate);resize();
  return {rebuild,syncClock,updateDraft,setView,district,zoom:factor=>{const v=camera.position.clone().sub(controls.target);v.multiplyScalar(factor);v.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,v.length())));camera.position.copy(controls.target).add(v);controls.update();dirty=true;},rotate:()=>{const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4);camera.position.copy(controls.target).add(v);controls.update();dirty=true;},dispose(){dead=true;cancelAnimationFrame(frame);observer.disconnect();intersect.disconnect();motionObserver.disconnect();media.removeEventListener('change',motion);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('keydown',key);for(const geo of [...geometries,...mergedGeometries,...previewGeometries])geo.dispose();for(const m of materials.values())m.dispose();renderer.dispose();renderer.domElement.remove();}};
}
