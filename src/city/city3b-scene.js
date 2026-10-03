import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cityMapBlueprint,cityMapRoads,cityBuildingKind} from './city3b-map.js';
import {cityResidentRoutes} from './city3b-life.js';
import {cityTrafficRoutes} from './city3b-simulation.js';
import {cityFootprint,cityPlacementCheck} from './city3b-construction.js';
import {premiumEffectsFromCodes} from '../store/premium-effects.js';
import {cityIsNight} from './city3b-environment.js';

// One coordinate system for the planner, saved placements, picking and 3D.
// No building exists here unless it is in the confirmed city snapshot.
export function createCityScene(host,{onPoint,onSelect,onError,onViewChange}={}) {
  const mobile=matchMedia('(max-width: 700px)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Carte 3D de construction. Glisser pour déplacer la vue, pincer pour zoomer.');
  renderer.domElement.tabIndex=0;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,3000);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.12;
  controls.minDistance=9;controls.maxDistance=1300;controls.screenSpacePanning=false;
  controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
  controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
  const hemi=new THREE.HemisphereLight(0xc8e8ff,0x6b714b,2.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffedcc,3.2);sun.position.set(-100,170,80);scene.add(sun);
  const world=new THREE.Group(),ghost=new THREE.Group(),people=new THREE.Group();scene.add(world,ghost,people);
  const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.IcosahedronGeometry(1,1),cylinderGeo=new THREE.CylinderGeometry(1,1,1,10),coneGeo=new THREE.ConeGeometry(1,1,4),ringGeo=new THREE.TorusGeometry(2.8,.25,8,32,Math.PI*1.7);
  const geometries=new Set([boxGeo,sphereGeo,cylinderGeo,coneGeo,ringGeo]),materials=new Map();
  const mat=(color,emissive=false,opacity=1)=>{
    const key=`${color}:${emissive}:${opacity}`;
    if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.05,emissive:emissive?color:0,emissiveIntensity:emissive?.7:0,transparent:opacity<1,opacity,depthWrite:opacity===1}));
    return materials.get(key);
  };
  function shape(parent,geo,color,x,y,z,w,h,d,emissive=false,opacity=1){const mesh=new THREE.Mesh(geo,mat(color,emissive,opacity));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}
  const box=(parent,color,x,y,z,w,h,d,emissive=false,opacity=1)=>shape(parent,boxGeo,color,x,y,z,w,h,d,emissive,opacity);
  function tree(parent,x,z,size=1){
    box(parent,0x775b3d,x,size*.65,z,.15*size,1.3*size,.15*size);
    shape(parent,sphereGeo,0x477d53,x,size*1.5,z,.8*size,.95*size,.8*size);
    shape(parent,sphereGeo,0x76a46a,x+.3*size,size*1.75,z-.1*size,.5*size,.6*size,.5*size);
  }
  function road(parent,x1,z1,x2,z2,width=4){
    const length=Math.hypot(x2-x1,z2-z1);if(length<.01)return;
    const strip=box(parent,0x555f63,(x1+x2)/2,.055,(z1+z2)/2,width,.1,length+.35);
    strip.rotation.y=Math.atan2(x2-x1,z2-z1);
    const sidewalk=box(parent,0xb7b7a4,(x1+x2)/2,-.02,(z1+z2)/2,width+1,.11,length);sidewalk.rotation.y=strip.rotation.y;
    const dashCount=Math.min(70,Math.floor(length/5));
    for(let i=1;i<dashCount;i++){const t=i/dashCount;const dash=box(parent,0xe2d8b2,x1+(x2-x1)*t,.117,z1+(z2-z1)*t,.1,.025,1.4);dash.rotation.y=strip.rotation.y;}
  }
  let data={},night=false,premium={},picks=[],animated=[],latest={},dead=false,visible=true,reduced=false,frame=0,last=0,dirty=true,first=true,mergedGeometries=[];
  function building(row,definition,parent=world,preview=false){
    const group=new THREE.Group(),w=Math.max(.7,Number(row.footprint_w)||1),d=Math.max(.7,Number(row.footprint_h)||1);
    group.position.set(Number(row.x)+w/2,.08,Number(row.z)+d/2);parent.add(group);
    const kind=cityBuildingKind(definition),code=String(definition.code||row.building_code),small=Math.min(w,d);
    const height=Math.min(18,Math.max(.9,small*(kind==='housing'?1.15:kind==='landmark'?2.5:.8)));
    const ivory=premium.champagneArchitecture?0xdbcca1:0xd6d4c3,glass=night?0xf2c986:0x4e7b89;
    box(group,0xc1bdaa,0,.03,0,w,.07,d);
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
        const roof=shape(group,coneGeo,0xaa7461,0,height+small*.23,0,w*.6,small*.5,d*.6);roof.rotation.y=Math.PI/4;
      } else if(kind==='landmark') {
        box(group,0xccb479,0,height+small*.28,0,w*.28,small*.4,d*.28);
      }
      const floors=Math.min(5,Math.max(1,Math.floor(height/.9))),columns=Math.min(5,Math.max(2,Math.floor(w)));
      for(let level=0;level<floors;level++)for(let column=0;column<columns;column++){
        const x=(column/(columns-1)-.5)*w*.53,y=(level+.6)*height/floors;
        for(const z of [-1,1])box(group,glass,x,y,z*d*.374,w*.11,height/floors*.45,.025,night);
      }
      box(group,0x354a52,0,height*.18,d*.38,w*.17,height*.34,.05);
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
    if(!preview){const pick=new THREE.Mesh(boxGeo,mat(ivory));pick.position.set(group.position.x,height/2,group.position.z);pick.scale.set(w,height,d);pick.userData.placement=row;pick.updateMatrixWorld();picks.push(pick);}
    return group;
  }
  function clear(group){while(group.children.length)group.remove(group.children[0]);}
  function rebuild(snapshot,codes){
    data=snapshot;premium=premiumEffectsFromCodes(codes);picks=[];animated=[];clear(world);clear(people);
    for(const geometry of mergedGeometries)geometry.dispose();mergedGeometries=[];
    const plan=cityMapBlueprint(data),roads=cityMapRoads(plan),half=plan.half;
    night=cityIsNight(data.city);
    scene.background=new THREE.Color(night?0x132636:0xbbd9df);scene.fog=new THREE.Fog(scene.background,half*3,half*10);
    hemi.intensity=night?.8:2.5;sun.intensity=night?.45:3.2;sun.color.set(night?0x96bded:0xffedcc);
    box(world,night?0x405547:0x97ad76,0,-.7,0,half*2,1.3,half*2);
    box(world,night?0x173f58:0x478da1,0,-.13,half*1.47,half*4,.1,half*1.14);
    box(world,0xb1b2a0,0,.05,plan.coastZ-1,half*2,.15,2);
    // Distant scenery is outside the playable land and never counted as player buildings.
    for(let i=0;i<13;i++){
      const mountain=shape(world,coneGeo,night?0x243d46:0x779286,-half*2+i*half/3,half*.17,-half*1.7-(i%3)*half*.16,half*.48,half*(.35+(i%3)*.1),half*.43);mountain.rotation.y=i*.9;
    }
    for(const ring of roads.rings)for(let i=0;i<80;i++){
      const a=i*Math.PI/40,b=(i+1)*Math.PI/40;
      road(world,Math.cos(a)*ring.radius,Math.sin(a)*ring.radius,Math.cos(b)*ring.radius,Math.sin(b)*ring.radius,ring.width);
    }
    for(const r of [...roads.boulevards,...roads.radials.filter(r=>r.unlocked),...roads.custom])road(world,r.x1,r.z1,r.x2,r.z2,r.width||4);
    // Civic fountain and compact promenade are fixed map infrastructure.
    shape(world,cylinderGeo,0xd2c9af,0,.12,0,6,.22,6);
    shape(world,cylinderGeo,night?0x41bddd:0x508ea4,0,.27,0,3.2,.12,3.2,night);
    shape(world,cylinderGeo,0xcbb585,0,1,0,.4,1.5,.4);
    const definitions=new Map((data.buildings||[]).map(b=>[b.code,b]));
    for(const row of (data.placements||[]).filter(p=>p.placement_state!=='stored'))building(row,definitions.get(row.building_code)||{});
    // Collection displays belong to the saved city, including in public visits.
    for(const display of data.displays||[]){
      const x=Number(display.x),z=Number(display.z);if(!Number.isFinite(x)||!Number.isFinite(z))continue;
      shape(world,cylinderGeo,0xbbae89,x,.2,z,.7,.4,.7);
      const gem=shape(world,sphereGeo,0x67b5d5,x,.95,z,.4,.6,.4,night);gem.rotation.y=Number(display.rotation||0)*Math.PI/180;
    }
    for(let i=0;i<36;i++){
      const x=-half+5+i*(half*2-10)/36,z=plan.coastZ-3.2;
      tree(world,x,z,1.2);
      if(i%3===0){box(world,0x465358,x,1.4,z+1,.12,2.8,.12);shape(world,sphereGeo,night?0xf2d8a1:0xe9e6c9,x,2.85,z+1,.25,.25,.25,night);}
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
    clear(world);for(const [material,parts] of batches){const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();if(geometry){mergedGeometries.push(geometry);world.add(new THREE.Mesh(geometry,material));}}
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
    latest=props;clear(ghost);
    if(props.previewOnly){dirty=true;return;}
    if(props.activeDefinition||props.activePlacement){
      const size=cityFootprint(props.activeDefinition,props.draft?.rotation,props.activePlacement);
      const check=cityPlacementCheck(data,props.draft,size,props.activePlacement?.id);
      const color=check.valid?0x49baff:0xef746f;
      const x=props.draft.x+size.width/2,z=props.draft.z+size.height/2;
      const model=building({x:props.draft.x,z:props.draft.z,footprint_w:size.width,footprint_h:size.height},props.activeDefinition||{},ghost,true);
      model.traverse(child=>{if(child.isMesh)child.material=mat(child.material.color.getHex(),false,.4);});
      box(ghost,color,x,.2,z,size.width,.12,size.height,true,.45);
      for(const dx of [-1,1])box(ghost,color,x+dx*size.width/2,.45,z,.1,.5,size.height,true);
      for(const dz of [-1,1])box(ghost,color,x,.45,z+dz*size.height/2,size.width,.5,.1,true);
    }
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
  const pointerDown=e=>{pointers.add(e.pointerId);if(pointers.size>1)down=null;else down={x:e.clientX,y:e.clientY,id:e.pointerId};};
  const pointerUp=e=>{
    const start=down;pointers.delete(e.pointerId);down=null;
    if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>7||latest.previewOnly||e.button>0)return;
    const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
    const pick=latest.tool!=='road'?ray.intersectObjects(picks,false)[0]:null;
    if(pick?.object.userData.placement){onSelect?.(pick.object.userData.placement);return;}
    if(ray.ray.intersectPlane(plane,hit))onPoint?.({x:Math.round(hit.x),z:Math.round(hit.z)});
  };
  const cancel=e=>{pointers.delete(e.pointerId);down=null;};
  const lost=e=>{e.preventDefault();onError?.('Le rendu 3D a été interrompu. Le plan 2D reste disponible.');};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',lost);
  const controlChanged=()=>{dirty=true;onViewChange?.();};controls.addEventListener('change',controlChanged);
  const key=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='+'||e.key==='-'){const v=camera.position.clone().sub(controls.target).multiplyScalar(e.key==='+'?.85:1.15);camera.position.copy(controls.target).add(v);}else{const dx=e.key==='ArrowLeft'?-3:e.key==='ArrowRight'?3:0,dz=e.key==='ArrowUp'?-3:e.key==='ArrowDown'?3:0;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;}controls.update();dirty=true;};renderer.domElement.addEventListener('keydown',key);
  function animate(time){
    if(dead)return;frame=requestAnimationFrame(animate);
    if(document.hidden||!visible||time-last<(mobile?1000/30:1000/45))return;
    if(!dirty&&(reduced||!animated.length))return;last=time;
    if(!reduced)for(const actor of animated){
      const total=actor.lengths.reduce((a,b)=>a+b,0);let left=((time/1000+actor.offset)%actor.duration)/actor.duration*total;
      for(let i=0;i<actor.lengths.length;i++){const length=actor.lengths[i];if(left<=length||i===actor.lengths.length-1){actor.object.position.lerpVectors(actor.path[i],actor.path[i+1],length?left/length:0);actor.object.rotation.y=Math.atan2(actor.path[i+1].x-actor.path[i].x,actor.path[i+1].z-actor.path[i].z);break;}left-=length;}
    }
    renderer.render(scene,camera);dirty=false;
  }
  frame=requestAnimationFrame(animate);resize();
  return {rebuild,updateDraft,setView,district,rotate:()=>{const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4);camera.position.copy(controls.target).add(v);controls.update();dirty=true;},dispose(){dead=true;cancelAnimationFrame(frame);observer.disconnect();intersect.disconnect();motionObserver.disconnect();media.removeEventListener('change',motion);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.domElement.removeEventListener('keydown',key);for(const geo of [...geometries,...mergedGeometries])geo.dispose();for(const m of materials.values())m.dispose();renderer.dispose();renderer.domElement.remove();}};
}
