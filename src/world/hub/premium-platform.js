import * as THREE from 'three';

const TAU=Math.PI*2;
const GOLD='#d6b46a';
const BLUE='#38c8ff';
const DEEP='#071018';
const STONE='#202b31';
const GLASS='#163844';
const GREEN='#365b4a';
const WATER='#0b5b76';

export const HUB_PREMIUM_METRICS=Object.freeze({
  version:'platform-final-v1',
  // The current avatar is ~3.8 world units tall. 2.05 units ~= 1 metre.
  unitsPerMetre:2.05,
  playableRadius:188,
  perceivedRadius:460,
  arrivalPlazaRadius:34,
  towerFootprint:28,
  towerHeight:168,
  innerPromenadeRadius:48,
  civicRingRadius:86,
  mobilityRingRadius:136,
  outerBoulevardRadius:176,
  lowerLevel:-7,
  mainLevel:1.35,
  upperLevel:4.1,
  pedestrianClearance:4.8,
  bridgeWidth:12,
  waterDepth:18,
  negativeSpaceRatio:.27,
  targetLandmarkVisibility:160,
});

export const HUB_PREMIUM_DISTRICTS=Object.freeze([
  {id:'archives',name:'Archives de la Mémoire',x:-74,z:-62,w:40,d:30,h:28,kind:'archive'},
  {id:'community',name:'Quartier Communauté',x:-82,z:-4,w:44,d:32,h:25,kind:'community'},
  {id:'innovation',name:'Innovation & IA',x:64,z:-98,w:46,d:30,h:42,kind:'innovation'},
  {id:'arena',name:'Arène 3B',x:82,z:-50,w:58,d:48,h:25,kind:'arena'},
  {id:'commerce',name:'Quartier Commerce',x:86,z:14,w:50,d:34,h:31,kind:'commerce'},
  {id:'gardens',name:'Jardins de l’Unité',x:-112,z:88,w:58,d:46,h:16,kind:'gardens'},
  {id:'docks',name:'Docks & Transports',x:-38,z:112,w:64,d:34,h:21,kind:'docks'},
  {id:'city3b',name:'Portail Ville 3B',x:62,z:108,w:54,d:34,h:30,kind:'city3b'},
]);
const DISTRICTS=HUB_PREMIUM_DISTRICTS;

function seeded(index){
  let x=(index+1)*1103515245+12345;
  x=(x^(x>>>16))>>>0;
  return (x%10000)/10000;
}

export function createPremiumHubPlatform({
  root,shape,box,cylinder,ball,geo,mat,asset,resident,height,collisions,owned,
}){
  const staticGroup=new THREE.Group(),detailGroup=new THREE.Group(),ultraGroup=new THREE.Group(),waterGroup=new THREE.Group();
  staticGroup.name='Hub3B Premium Platform · Static';
  detailGroup.name='Hub3B Premium Platform · Detail';
  ultraGroup.name='Hub3B Premium Platform · Skyline';
  waterGroup.name='Hub3B Premium Platform · Water';
  root.add(staticGroup,detailGroup,ultraGroup,waterGroup);

  const materials={
    dark:mat(DEEP,{metalness:.28,roughness:.66}),
    stone:mat(STONE,{metalness:.18,roughness:.8}),
    stone2:mat('#39444a',{metalness:.2,roughness:.72}),
    gold:mat(GOLD,{metalness:.76,roughness:.26,emissive:'#6a5424',emissiveIntensity:.22}),
    blue:mat(BLUE,{metalness:.34,roughness:.34,emissive:'#149dc5',emissiveIntensity:.46}),
    glass:mat(GLASS,{metalness:.42,roughness:.22,emissive:'#0b2631',emissiveIntensity:.13}),
    green:mat(GREEN,{metalness:.04,roughness:.92}),
    water:mat(WATER,{metalness:.14,roughness:.24,emissive:'#0d4156',emissiveIntensity:.18,transparent:true,opacity:.78,depthWrite:false}),
  };

  const ring=(inner,outer,y,material,parent=staticGroup,segments=128)=>{
    const g=geo(new THREE.RingGeometry(inner,outer,segments));g.rotateX(-Math.PI/2);
    const m=shape(g,material,0,y,0,1,1,1,parent);m.receiveShadow=true;m.castShadow=false;return m;
  };
  const torus=(radius,tube,y,material,parent=detailGroup,x=0,z=0)=>{
    const g=geo(new THREE.TorusGeometry(radius,tube,6,128));g.rotateX(-Math.PI/2);
    const m=shape(g,material,x,y,z,1,1,1,parent);m.castShadow=false;return m;
  };
  const slab=(x,z,w,d,y,thickness=1.2,material=materials.stone,parent=staticGroup)=>{
    const m=shape(box,material,x,y-thickness/2,z,w,thickness,d,parent);m.receiveShadow=true;return m;
  };
  const post=(x,z,y,h=3.8,parent=detailGroup)=>{
    shape(cylinder,materials.stone2,x,y+h/2,z,.08,h,.08,parent);
    shape(ball,materials.blue,x,y+h+.22,z,.16,.26,.16,parent);
  };
  const rail=(x,z,length,angle,y,parent=detailGroup)=>{
    const segment=shape(box,materials.gold,x,y+1.02,z,.08,.08,length,parent);
    segment.rotation.y=angle;
    for(const side of [-1,1]){
      const px=x+Math.sin(angle)*length*.5*side,pz=z+Math.cos(angle)*length*.5*side;
      shape(cylinder,materials.stone2,px,y+.55,pz,.065,1.1,.065,parent);
    }
  };
  function roadSegment(a,b,width=10,material=materials.dark,parent=staticGroup){
    const ay=height(a.x,a.z)+.16,by=height(b.x,b.z)+.16;
    const dx=b.x-a.x,dz=b.z-a.z,dy=by-ay,length=Math.hypot(dx,dz),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,cy=(ay+by)/2;
    const m=shape(box,material,cx,cy,cz,width,.22,length,parent);
    const dir=new THREE.Vector3(dx,dy,dz).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
    m.receiveShadow=true;m.castShadow=false;
    return m;
  }
  function bridge(a,b,width=HUB_PREMIUM_METRICS.bridgeWidth){
    const deck=roadSegment(a,b,width,materials.stone2,staticGroup);
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),y=(height(a.x,a.z)+height(b.x,b.z))/2+.36;
    // Gold shoulders and lower truss give the bridge real thickness.
    for(const side of [-1,1]){
      const ox=Math.cos(angle)*width*.46*side,oz=-Math.sin(angle)*width*.46*side;
      rail((a.x+b.x)/2+ox,(a.z+b.z)/2+oz,len,angle,y,detailGroup);
    }
    const truss=shape(box,materials.dark,(a.x+b.x)/2,y-1.05,(a.z+b.z)/2,width*.82,1.8,len*.98,staticGroup);
    truss.quaternion.copy(deck.quaternion);
  }

  // Deep water plane and a dark substructure establish volume below the playable city.
  const water=geo(new THREE.CircleGeometry(HUB_PREMIUM_METRICS.perceivedRadius,160));
  const waterMesh=shape(water,materials.water,0,-HUB_PREMIUM_METRICS.waterDepth,0,1,1,1,waterGroup);
  waterMesh.rotation.x=-Math.PI/2;waterMesh.castShadow=false;
  ring(154,194,-4.4,materials.dark,staticGroup,160);
  ring(157,190,-3.7,materials.stone2,staticGroup,160);
  for(let i=0;i<64;i++){
    const a=i/64*TAU,r=190,x=Math.cos(a)*r,z=Math.sin(a)*r,y=height(x,z);
    const wall=shape(box,materials.dark,x,y-6.5,z,5.8,13,2.2,staticGroup);wall.rotation.y=-a;
  }

  // Three concentric circulation layers recreate the map's premium, legible radial composition.
  ring(38,58,height(48,0)+.12,materials.stone,staticGroup);
  ring(78,94,height(86,0)+.13,materials.dark,staticGroup);
  ring(128,144,height(136,0)+.15,materials.dark,staticGroup);
  ring(168,184,height(176,0)+.16,materials.stone2,staticGroup);
  for(const r of [39,57,79,93,129,143,169,183])torus(r,.08,height(r,0)+.27,r%2?materials.gold:materials.blue,detailGroup);

  // Arrival plaza: generous negative space. It must remain readable even with a crowd.
  const plazaZ=18,plazaY=height(0,plazaZ);
  const plaza=geo(new THREE.CircleGeometry(HUB_PREMIUM_METRICS.arrivalPlazaRadius,96));
  const plazaMesh=shape(plaza,mat('#c8bd9c',{metalness:.12,roughness:.74}),0,plazaY+.2,plazaZ,1,1,1,staticGroup);
  plazaMesh.rotation.x=-Math.PI/2;plazaMesh.receiveShadow=true;
  for(const r of [9,18,31])torus(r,.095,plazaY+.31,r===18?materials.blue:materials.gold,detailGroup);
  // Central light well.
  shape(cylinder,materials.dark,0,plazaY-.6,plazaZ,6.8,1.2,6.8,staticGroup);
  shape(cylinder,materials.water,0,plazaY-.02,plazaZ,5.3,.18,5.3,waterGroup);
  const pulseMaterial=new THREE.MeshStandardMaterial({color:BLUE,metalness:.34,roughness:.34,emissive:'#149dc5',emissiveIntensity:.46});
  owned.push(pulseMaterial);
  const lightCore=shape(cylinder,pulseMaterial,0,plazaY+2.8,plazaZ,.35,5.6,.35,detailGroup);
  lightCore.userData.hubPulse=true;
  for(let i=0;i<12;i++){
    const a=i/12*TAU,r=28,x=Math.cos(a)*r,z=plazaZ+Math.sin(a)*r;
    post(x,z,height(x,z),i%3===0?5.1:3.7,detailGroup);
    if(i%2===0)asset('Bench',x+Math.sin(a)*2,z-Math.cos(a)*2,1.05,-a+Math.PI/2,detailGroup);
  }

  // Tour du Cercle Brisé — primary landmark, visible from every Hub axis.
  const towerZ=-48,towerY=height(0,towerZ),tower=new THREE.Group();tower.position.set(0,towerY,towerZ);staticGroup.add(tower);
  shape(cylinder,materials.stone,0,.5,0,30,1,30,tower);
  shape(cylinder,materials.dark,0,4.5,0,24,8,24,tower);
  shape(cylinder,materials.glass,0,62,0,12.5,116,12.5,tower);
  shape(cylinder,materials.dark,0,121,0,9.4,16,9.4,tower);
  for(let i=0;i<12;i++){
    const a=i/12*TAU;
    const fin=shape(box,i%3===0?materials.gold:materials.stone2,Math.cos(a)*13.4,61,Math.sin(a)*13.4,i%3===0?.55:.85,116,1.25,tower);
    fin.rotation.y=-a;
  }
  for(const y of [16,34,52,70,88,106,122])torus(13.2,.12,towerY+y,materials.gold,detailGroup,0,towerZ);
  const crown=shape(cylinder,materials.gold,0,137,0,6.8,2.2,6.8,tower);
  shape(cylinder,materials.blue,0,152,0,1.15,28,1.15,tower);
  shape(ball,materials.gold,0,168,0,1.2,1.8,1.2,tower);
  collisions.push({x:0,z:towerZ,r:17});

  // Ceremonial axis between the arrival plaza and the tower.
  bridge({x:0,z:plazaZ-34},{x:0,z:towerZ+22},14);
  for(const side of [-1,1])for(let i=0;i<9;i++){
    const z=plazaZ-30-i*7.7,x=side*8.3;
    post(x,z,height(x,z),4.4,detailGroup);
  }

  function districtBuilding(d,index){
    const y=height(d.x,d.z),g=new THREE.Group();g.position.set(d.x,y,d.z);staticGroup.add(g);
    const baseMat=d.kind==='gardens'?materials.green:d.kind==='innovation'?materials.glass:d.kind==='docks'?materials.stone2:materials.stone;
    if(d.kind==='arena'){
      shape(cylinder,materials.dark,0,4,0,d.w*.52,8,d.d*.52,g);
      const bowl=geo(new THREE.TorusGeometry(d.w*.34,2.6,10,72));bowl.rotateX(-Math.PI/2);shape(bowl,materials.gold,0,9,0,1,1,d.d/d.w,g);
      shape(cylinder,materials.stone2,0,11.2,0,d.w*.39,4.5,d.d*.39,g);
    }else if(d.kind==='gardens'){
      slab(d.x,d.z,d.w,d.d,y+.25,.8,materials.green,staticGroup);
      for(let j=0;j<14;j++){
        const a=j/14*TAU,r=8+(j%4)*4.4,x=d.x+Math.cos(a)*r,z=d.z+Math.sin(a)*r;
        asset(j%3===0?'Tree':'Planter',x,z,j%3===0?.78:1.0,a,detailGroup);
      }
      const pond=geo(new THREE.CircleGeometry(8,48));const pm=shape(pond,materials.water,d.x,y+.34,d.z,1,1,1,waterGroup);pm.rotation.x=-Math.PI/2;
      torus(8.4,.09,y+.46,materials.gold,detailGroup,d.x,d.z);
      collisions.push({x:d.x,z:d.z,r:4.5});
      return;
    }else if(d.kind==='docks'){
      slab(d.x,d.z,d.w,d.d,y+.15,1.1,baseMat,staticGroup);
      for(let side=-1;side<=1;side+=2)for(let j=0;j<4;j++){
        const px=d.x+side*(d.w*.34),pz=d.z-d.d*.28+j*6.4;
        shape(box,materials.stone2,px,y-.6,pz,4.2,2.6,8,staticGroup);
        rail(px+side*2.05,pz,7.2,0,y+.25,detailGroup);
      }
      shape(box,materials.glass,d.x,y+8,d.z-d.d*.2,25,16,9,g);
      shape(box,materials.gold,d.x,y+16.4,d.z-d.d*.2,27,.38,10,g);
    }else{
      shape(box,baseMat,0,d.h*.5,0,d.w,d.h,d.d,g);
      // Stepped roofs and recessed glazed cores make every service readable at distance.
      shape(box,materials.dark,0,d.h*.86,0,d.w*.78,d.h*.28,d.d*.78,g);
      shape(box,materials.glass,0,d.h*.54,d.d*.505,d.w*.58,d.h*.56,.16,g);
      for(let col=-2;col<=2;col++)shape(box,materials.gold,col*d.w*.13,d.h*.54,d.d*.52,.12,d.h*.58,.22,g);
      shape(box,materials.gold,0,d.h+1.1,0,d.w*.86,.28,d.d*.86,g);
      if(d.kind==='innovation'){
        for(const side of [-1,1])shape(box,materials.blue,side*d.w*.35,d.h+10,0,.6,22,.6,g);
      }
      if(d.kind==='archive'){
        shape(box,materials.dark,0,-2.8,0,d.w*1.12,5.6,d.d*1.12,g);
      }
    }
    collisions.push({x:d.x,z:d.z,width:d.w*.9,depth:d.d*.9});
    // Forecourt intentionally empty: clear approach and readable entrance.
    const forward={x:d.x,z:d.z+d.d*.66},fy=height(forward.x,forward.z);
    slab(forward.x,forward.z,d.w*.58,12,fy+.2,.5,materials.stone2,staticGroup);
    for(const side of [-1,1])post(forward.x+side*d.w*.22,forward.z,fy,4.1,detailGroup);
    if(index%2===0)resident(forward.x+3.4,forward.z+3.2,index%4===0?'#d7bd83':'#66cde8',root,index%3===0?'artisan':'traveler');
  }
  DISTRICTS.forEach(districtBuilding);

  // Radial boulevards connect the centre to services; they create the map's spoke rhythm.
  const targets=[
    {x:-74,z:-62},{x:-82,z:-4},{x:64,z:-98},{x:82,z:-50},
    {x:86,z:14},{x:-112,z:88},{x:-38,z:112},{x:62,z:108},
  ];
  for(const [i,t] of targets.entries()){
    const len=Math.hypot(t.x,t.z)||1,nx=t.x/len,nz=t.z/len;
    roadSegment({x:nx*54,z:nz*54},{x:nx*166,z:nz*166},i%3===0?12:9,materials.stone2,staticGroup);
    for(let j=0;j<5;j++){
      const r=66+j*23,x=nx*r,z=nz*r;
      if(j%2===0)post(x+(-nz)*5.2,z+nx*5.2,height(x,z),3.5,detailGroup);
    }
  }

  // Water cuts + bridges: visible void around the core without forcing the player through unsafe gaps.
  const cuts=[
    [{x:-150,z:30},{x:-92,z:58}],
    [{x:132,z:46},{x:92,z:70}],
    [{x:-72,z:148},{x:-28,z:122}],
    [{x:82,z:144},{x:56,z:116}],
  ];
  for(const [index,[a,b]] of cuts.entries()){
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,y=Math.min(height(a.x,a.z),height(b.x,b.z))-1.9;
    const channel=shape(box,materials.water,cx,y,cz,13,.22,len,waterGroup);channel.rotation.y=angle;
    for(const side of [-1,1]){
      const bank=shape(box,materials.dark,cx+Math.cos(angle)*side*7.1,y-1.8,cz-Math.sin(angle)*side*7.1,2.2,4.2,len,staticGroup);bank.rotation.y=angle;
    }
    const t=.52,mid={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},n={x:-dz/len,z:dx/len};
    bridge({x:mid.x+n.x*13,z:mid.z+n.z*13},{x:mid.x-n.x*13,z:mid.z-n.z*13},10);
  }

  // Distant skyline is deliberately non-interactive. It gives the same "city continues forever" feeling as the reference.
  for(let i=0;i<56;i++){
    const a=i/56*TAU+(seeded(i)-.5)*.08,r=220+(i%6)*18,w=8+(i%4)*2.4,d=7+(i%3)*2.8,h=28+(i%9)*7.5;
    const x=Math.cos(a)*r,z=Math.sin(a)*r,y=height(Math.cos(a)*188,Math.sin(a)*188)-4;
    const m=shape(box,i%5===0?materials.glass:materials.dark,x,y+h/2,z,w,h,d,ultraGroup);m.rotation.y=-a;
    if(i%4===0)shape(box,materials.gold,x,y+h*.66,z+Math.sin(a)*d*.52,w*.54,.2,.16,ultraGroup);
  }

  // Premium micro-detail band: railings, lamps, benches, planters, service pylons.
  for(let i=0;i<40;i++){
    const a=i/40*TAU,r=108+(i%3)*19,x=Math.cos(a)*r,z=Math.sin(a)*r,y=height(x,z);
    if(i%2===0)post(x,z,y,3.4+(i%4)*.35,detailGroup);
    else asset(i%5===0?'Planter':'Bench',x,z,i%5===0?1.15:.92,-a+Math.PI/2,detailGroup);
  }

  const diagnostics={
    version:HUB_PREMIUM_METRICS.version,
    districts:DISTRICTS.length,
    landmarkHeight:HUB_PREMIUM_METRICS.towerHeight,
    playableRadius:HUB_PREMIUM_METRICS.playableRadius,
    negativeSpaceRatio:HUB_PREMIUM_METRICS.negativeSpaceRatio,
    rings:4,
    waterCuts:cuts.length,
    skylineMasses:56,
  };

  function setQuality(mode){
    const fluid=mode==='fluid',detail=mode==='detail';
    detailGroup.visible=!fluid;
    ultraGroup.visible=detail;
    waterGroup.visible=true;
  }
  function update(){
    // Reserved for visible Hub evolution. Keep geometry deterministic for save compatibility.
  }
  function tick(time){
    lightCore.scale.y=1+Math.sin(time*1.25)*.045;
    lightCore.material.emissiveIntensity=.38+Math.sin(time*1.1)*.08;
  }

  setQuality('auto');
  return{root:staticGroup,qualityGroups:[detailGroup,ultraGroup],detailGroup,ultraGroup,waterGroup,diagnostics,setQuality,update,tick,dispose(){}};
}
