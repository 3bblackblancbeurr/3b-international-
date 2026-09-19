import * as T from 'three';
import plan from './data/hub-master-plan-v2.json';
import npcs from './data/npcs-v1.json';
import missions from './data/missions-v1.json';
import {buildHubLayout,hubDistrictAt,hubPopulationBudget,nearestHubInteraction,nextStop} from './runtime-core.js';
import {activeHubMission,applyHubEvent,missionForNpc,normalizeHubProgress,startHubMission} from './mission-runtime.js';

export const HUB_PLAN=plan;
export const HUB_NPCS=npcs;
export const HUB_MISSIONS=missions;
export const HUB_LAYOUT=buildHubLayout(plan,npcs,missions);

const v=(x,y,z)=>new T.Vector3(x,y,z);
const colors={gold:'#d9c28b',matrix:'#52bfe7',stone:'#7b858a',dark:'#121b20',glass:'#214b5b',green:'#637c63'};

function disposableMaterial(material,list){list.add(material);return material;}
function pathLine(points,material){
  const geometry=new T.BufferGeometry().setFromPoints(points.map(p=>v(p.x,.08,p.z)));
  const line=new T.LineLoop(geometry,material);return line;
}
function cableGeometry(lines){
  const positions=[];
  for(const line of lines){
    positions.push(line.from.x,7,line.from.z,line.to.x,7,line.to.z);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));return geometry;
}
function headingAlong(curve,t){
  const tangent=curve.getTangentAt((t+.002)%1);return Math.atan2(tangent.x,tangent.z);
}

export function hubInteractions(){
  const archive=HUB_LAYOUT.districtById.archives;
  return [
    ...HUB_LAYOUT.npcs.map(n=>({id:'hub-npc:'+n.id,type:'hub-npc',name:'Parler à '+n.name,x:n.x,z:n.z,npcId:n.id,range:3.4})),
    ...HUB_LAYOUT.trainStations.map(s=>({...s,type:'hub-train',range:4})),
    ...HUB_LAYOUT.boatStops.map(s=>({...s,type:'hub-boat',range:4})),
    ...HUB_LAYOUT.ziplines.map(z=>({id:'zipline:'+z.id,type:'hub-zipline',name:'Tyrolienne '+z.id,x:z.from.x,z:z.from.z,to:z.to,range:4})),
    ...HUB_LAYOUT.buildings.filter(b=>b.tier===0).map(b=>({id:'hub-building:'+b.id,type:'hub-building',name:b.name,x:b.x,z:b.z,buildingId:b.id,range:4.2})),
    {id:'hub-signal:archive_signal',type:'hub-signal',name:'Analyser le signal des Archives',x:archive.x+5,z:archive.z-1,range:3.5},
    {id:'hub-memory:archive_memory',type:'hub-memory',name:'Restaurer le souvenir des Archives',x:archive.x,z:archive.z-6,range:3.5},
    {id:'hub-beacon:archive_beacon',type:'hub-beacon',name:'Activer la balise des Archives',x:archive.x-5,z:archive.z+2,range:3.5},
  ];
}

function applyEvent(progress,event){
  return applyHubEvent(progress,event,HUB_MISSIONS);
}

export function resolveHubInteraction(interaction,rawProgress){
  let progress=normalizeHubProgress(rawProgress,HUB_MISSIONS),message='',destination=null,completedMission=null,changed=false;
  const merge=result=>{progress=result.progress;changed=changed||result.changed;if(result.completedMission)completedMission=result.completedMission;};
  if(!interaction)return {progress,changed:false,message};
  if(interaction.type==='hub-npc'){
    const npc=HUB_LAYOUT.npcById[interaction.npcId],mission=missionForNpc(npc,progress,HUB_MISSIONS);
    if(mission&&!progress.active){
      const started=startHubMission(progress,mission.id,HUB_MISSIONS);progress=started.progress;changed=started.changed;
      message=npc.name+' · '+npc.role+'. Mission : « '+mission.title+' ». '+(mission.objectives?.[0]||'Explore la Cité.');
    }else if(mission&&progress.active===mission.id){
      const active=activeHubMission(progress,HUB_MISSIONS);message=npc.name+' · '+(active?.currentObjective||'Continue la mission dans la Cité.');
    }else if(progress.active){
      const active=activeHubMission(progress,HUB_MISSIONS);message=npc.name+' · '+npc.role+'. Mission active : '+active?.title+' · '+(active?.currentObjective||'objectif en cours');
    }else message=npc.name+' · '+npc.role+'. La Cité change selon les habitants, les transports et les souvenirs retrouvés.';
  }else if(interaction.type==='hub-building'){
    merge(applyEvent(progress,{type:'visit',id:interaction.buildingId}));
    if(interaction.buildingId==='tower_circle')merge(applyEvent(progress,{type:'reach',id:'broken_circle_tower'}));
    const building=HUB_LAYOUT.buildings.find(b=>b.id===interaction.buildingId);
    message=(building?.name||interaction.name)+' · '+(building?.purpose||building?.functions?.join(' · ')||'Lieu de la Cité des Huit Héritages.');
  }else if(interaction.type==='hub-train'){
    merge(applyEvent(progress,{type:'ride_train'}));
    const next=nextStop(HUB_LAYOUT.trainStations,interaction.id);if(next){destination={x:next.x+2,z:next.z};merge(applyEvent(progress,{type:'arrive',id:next.district}));}
    message='3B Express · trajet vers '+(next?.name?.replace('3B Express · ','')||'la prochaine station')+'.';
  }else if(interaction.type==='hub-boat'){
    merge(applyEvent(progress,{type:'ride_boat'}));
    const next=nextStop(HUB_LAYOUT.boatStops,interaction.id);if(next)destination={x:next.x+2,z:next.z};
    message='Bateau-taxi 3B · liaison vers '+(next?.name?.replace('Bateau-taxi · ','')||'le prochain quai')+'.';
  }else if(interaction.type==='hub-zipline'){
    merge(applyEvent(progress,{type:'ride_zipline'}));destination={x:interaction.to.x+2,z:interaction.to.z+1};message=interaction.name+' · arrivée dans un autre secteur de la Cité.';
  }else if(interaction.type==='hub-signal'){
    merge(applyEvent(progress,{type:'inspect',id:'archive_signal'}));message='Signal des Archives analysé. Une fréquence du Cercle Brisé répond.';
  }else if(interaction.type==='hub-memory'){
    merge(applyEvent(progress,{type:'restore',id:'archive_memory'}));message='Souvenir des Archives restauré. Les fragments de voix se recomposent.';
  }else if(interaction.type==='hub-beacon'){
    merge(applyEvent(progress,{type:'activate',id:'archive_beacon'}));message='Balise des Archives activée. La mémoire du quartier devient plus stable.';
  }
  if(completedMission)message+=' Mission terminée : « '+completedMission.title+' ».';
  return {progress,changed,message,destination,completedMission};
}

export function createHubRuntime(scene,{quality='auto'}={}){
  const root=new T.Group();root.name='Cité des Huit Héritages · runtime';scene.add(root);
  const materials=new Set(),geometries=new Set(),dynamic=[];
  const makeMat=(color,extra={})=>disposableMaterial(new T.MeshStandardMaterial({color,roughness:.72,metalness:.18,...extra}),materials);
  const stone=makeMat(colors.stone),gold=makeMat(colors.gold,{metalness:.5,roughness:.38}),matrix=makeMat(colors.matrix,{emissive:colors.matrix,emissiveIntensity:.7,metalness:.25}),dark=makeMat(colors.dark,{metalness:.35}),glass=makeMat(colors.glass,{transparent:true,opacity:.82,metalness:.35,roughness:.22}),green=makeMat(colors.green);
  const padGeo=new T.CylinderGeometry(1,1,.08,28);geometries.add(padGeo);
  for(const district of HUB_LAYOUT.districts){
    const pad=new T.Mesh(padGeo,district.kind==='nature'?green:district.tier===0?gold:stone);
    pad.position.set(district.x,.01,district.z);pad.scale.set(district.tier===0?7:5,1,district.tier===0?7:5);pad.receiveShadow=true;root.add(pad);
  }
  const buildingGeo=new T.BoxGeometry(1,1,1);geometries.add(buildingGeo);
  const buildings=new T.InstancedMesh(buildingGeo,dark,HUB_LAYOUT.buildings.length);buildings.castShadow=true;buildings.receiveShadow=true;
  const matrix4=new T.Matrix4(),quat=new T.Quaternion(),scale=new T.Vector3();
  HUB_LAYOUT.buildings.forEach((b,i)=>{matrix4.compose(v(b.x,b.h/2,b.z),quat,scale.set(b.w,b.h,b.d));buildings.setMatrixAt(i,matrix4);buildings.setColorAt(i,new T.Color(b.tier===0?colors.gold:b.tier===1?colors.glass:colors.matrix));});
  buildings.instanceMatrix.needsUpdate=true;if(buildings.instanceColor)buildings.instanceColor.needsUpdate=true;root.add(buildings);
  const crownGeo=new T.CylinderGeometry(.9,.9,1,12);geometries.add(crownGeo);const crowns=new T.InstancedMesh(crownGeo,gold,HUB_LAYOUT.buildings.filter(b=>b.tier===0).length);
  HUB_LAYOUT.buildings.filter(b=>b.tier===0).forEach((b,i)=>{matrix4.compose(v(b.x,b.h+.6,b.z),quat,scale.set(1.1,1.2,1.1));crowns.setMatrixAt(i,matrix4);});crowns.instanceMatrix.needsUpdate=true;root.add(crowns);

  const roadMaterial=disposableMaterial(new T.LineBasicMaterial({color:colors.gold,transparent:true,opacity:.38}),materials);
  const roadGeo=new T.BoxGeometry(1,1,1);geometries.add(roadGeo);
  const roadSegments=[...HUB_LAYOUT.districts.map(d=>({a:HUB_LAYOUT.districtById.heritage_square,b:d})),...HUB_LAYOUT.trainStations.map((s,i)=>({a:s,b:HUB_LAYOUT.trainStations[(i+1)%HUB_LAYOUT.trainStations.length]}))];
  const roads=new T.InstancedMesh(roadGeo,stone,roadSegments.length);
  roadSegments.forEach((segment,i)=>{const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,len=Math.hypot(dx,dz),mid=v((segment.a.x+segment.b.x)/2,.035,(segment.a.z+segment.b.z)/2),q=new T.Quaternion().setFromEuler(new T.Euler(0,Math.atan2(dx,dz),0));matrix4.compose(mid,q,scale.set(2.4,.07,len));roads.setMatrixAt(i,matrix4);});roads.instanceMatrix.needsUpdate=true;roads.receiveShadow=true;root.add(roads);
  const stationPath=HUB_LAYOUT.trainStations.map(s=>({x:s.x,z:s.z}));const rail=pathLine(stationPath,roadMaterial);root.add(rail);geometries.add(rail.geometry);
  const cableMat=disposableMaterial(new T.LineBasicMaterial({color:colors.matrix,transparent:true,opacity:.5}),materials),cables=new T.LineSegments(cableGeometry(HUB_LAYOUT.ziplines),cableMat);root.add(cables);geometries.add(cables.geometry);

  const npcBodyGeo=new T.CapsuleGeometry(.22,.72,3,7),npcHeadGeo=new T.SphereGeometry(.21,8,6);geometries.add(npcBodyGeo);geometries.add(npcHeadGeo);
  const npcBody=new T.InstancedMesh(npcBodyGeo,stone,HUB_LAYOUT.npcs.length),npcHead=new T.InstancedMesh(npcHeadGeo,gold,HUB_LAYOUT.npcs.length);npcBody.castShadow=true;npcHead.castShadow=true;root.add(npcBody,npcHead);
  const npcState=HUB_LAYOUT.npcs.map((n,i)=>({baseX:n.x,baseZ:n.z,phase:(i*.73)%6.28}));
  const trainGeo=new T.BoxGeometry(2.8,1.8,5.4),boatGeo=new T.BoxGeometry(2.2,.7,4.8);geometries.add(trainGeo);geometries.add(boatGeo);
  const train=new T.Mesh(trainGeo,matrix);train.castShadow=true;root.add(train);dynamic.push(train);
  const boats=[0,.5].map(offset=>{const boat=new T.Mesh(boatGeo,dark);boat.castShadow=true;root.add(boat);dynamic.push(boat);return {mesh:boat,offset};});
  const trainCurve=new T.CatmullRomCurve3(HUB_LAYOUT.trainStations.map(s=>v(s.x,.95,s.z)),true,'catmullrom',.2);
  const boatCurve=new T.CatmullRomCurve3(HUB_LAYOUT.boatStops.map(s=>v(s.x,.38,s.z)),true,'catmullrom',.25);

  const signalGeo=new T.IcosahedronGeometry(.65,1);geometries.add(signalGeo);
  const archive=HUB_LAYOUT.districtById.archives;
  for(const [x,z] of [[archive.x+5,archive.z-1],[archive.x,archive.z-6],[archive.x-5,archive.z+2]]){const beacon=new T.Mesh(signalGeo,matrix);beacon.position.set(x,1.1,z);root.add(beacon);dynamic.push(beacon);}

  function update(position,time,profile=quality){
    const budget=hubPopulationBudget(plan,profile==='light'?'light':profile==='high'?'high':'auto'),nearDistance=profile==='light'?42:62;
    npcState.forEach((n,i)=>{
      const visible=i<budget.near||Math.hypot(position.x-n.baseX,position.z-n.baseZ)<nearDistance;
      const wander=visible?Math.sin(time*.23+n.phase)*.7:0;
      matrix4.compose(v(n.baseX+wander,.58,n.baseZ+Math.cos(time*.19+n.phase)*.45),quat,scale.setScalar(visible?1:0));npcBody.setMatrixAt(i,matrix4);
      matrix4.compose(v(n.baseX+wander,1.43,n.baseZ+Math.cos(time*.19+n.phase)*.45),quat,scale.setScalar(visible?1:0));npcHead.setMatrixAt(i,matrix4);
    });npcBody.instanceMatrix.needsUpdate=true;npcHead.instanceMatrix.needsUpdate=true;
    const tt=(time*.018)%1,tp=trainCurve.getPointAt(tt);train.position.copy(tp);train.rotation.y=headingAlong(trainCurve,tt);
    boats.forEach(b=>{const t=(time*.011+b.offset)%1,p=boatCurve.getPointAt(t);b.mesh.position.copy(p);b.mesh.rotation.y=headingAlong(boatCurve,t);});
    dynamic.filter(x=>x!==train&&!boats.some(b=>b.mesh===x)).forEach((m,i)=>{m.rotation.y=time*.5+i;m.position.y=1.1+Math.sin(time*1.4+i)*.12;});
  }
  function nearest(position){return nearestHubInteraction({npcs:HUB_LAYOUT.npcs,trainStations:HUB_LAYOUT.trainStations,boatStops:HUB_LAYOUT.boatStops,ziplines:HUB_LAYOUT.ziplines,buildings:HUB_LAYOUT.buildings},position)||hubInteractions().filter(i=>Math.hypot(position.x-i.x,position.z-i.z)<(i.range||3.6)).sort((a,b)=>Math.hypot(position.x-a.x,position.z-a.z)-Math.hypot(position.x-b.x,position.z-b.z))[0]||null;}
  return {
    root,layout:HUB_LAYOUT,interactions:hubInteractions,
    nearest,
    district(position){return hubDistrictAt(HUB_LAYOUT,position);},
    update,
    dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  };
}
