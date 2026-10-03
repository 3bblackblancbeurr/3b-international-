import {buildingDetails} from './city3b-architecture.js';

// One authored recipe drives the map, placement ghost and catalogue projection.
export function cityArchitectureFamily(definition={}) {
 const code=String(definition.code||'');
 if(code==='CITY_HALL_3B')return 'matrix';
 if(definition.metadata?.architecture)return definition.metadata.architecture;
 if(/CLINIC|HEALTH|HOSPITAL|COMMUNITY/.test(code))return 'nexus';
 if(/LIBRARY|MANGA|MUSEUM/.test(code))return 'heritage';
 if(/TOWER|BUSINESS|OFFICE/.test(code))return 'horizon';
 if(/POLICE|COURT|ADMIN/.test(code))return 'civic';
 return 'district';
}
export function buildCityArchitecture(api,group,options) {
 const {box,shape,sphereGeo,cylinderGeo,tree}=api;
 const {w,d,height,kind,code,definition={},ivory=0xe1ded0,glass=0x31596e,night=false}=options;
 const small=Math.min(w,d),gold=0xc5ac76,dark=0x253a46,light=0x55bde7;
 const family=cityArchitectureFamily({...definition,code});
 const plant=(x,y,z,scale)=>{box(group,ivory,x,y,z,scale*.7,scale*.2,scale*.65);shape(group,sphereGeo,0x488369,x,y+scale*.23,z,scale*.3,scale*.3,scale*.28);};
 const volume=(x,z,bw,bd,h)=>{
  box(group,ivory,x,h/2+.15,z,bw,h,bd);
  for(const side of [-1,1]){
   box(group,glass,x,h*.52+.15,z+side*bd*.503,bw*.88,h*.8,.025,night);
   for(let col=-2;col<=2;col++)box(group,gold,x+col*bw*.18,h*.52+.15,z+side*bd*.512,.025,h*.88,.03);
  }
  for(const side of [-1,1])box(group,glass,x+side*bw*.503,h*.52+.15,z,.025,h*.72,bd*.84,night);
  box(group,gold,x,h+.18,z,bw*1.05,.07,bd*1.05);
  box(group,dark,x,h+.24,z,bw*.92,.06,bd*.9);
 };
 const entrance=(h=height)=>{
  for(let i=0;i<4;i++)box(group,ivory,0,.04+i*.035,d*(.39+i*.028),w*.35,.04,d*.11);
  box(group,gold,0,h*.28,d*.385,w*.33,.055,d*.16);
  box(group,glass,0,h*.15,d*.40,w*.18,h*.25,.025,night);
  for(const x of [-.13,.13])box(group,gold,x*w,h*.15,d*.42,.035,h*.3,.04);
  // Physical 3B emblem: no canvas/font downloads, readable close up.
  const y=h*.48,z=d*.403,t=small*.014;
  for(const dx of [-.065,.045]){for(const dy of [-.05,0,.05])box(group,gold,dx*w,y+dy*h,z,w*.075,t,.03);box(group,gold,(dx+.036)*w,y,z,t,h*.11,.03);}
  box(group,gold,.007*w,y,z,t,h*.11,.03);
 };
 if(family==='eiffel'){
  const h=Math.min(18,small*2.4);
  for(const sx of [-1,1])for(const sz of [-1,1]){const leg=box(group,dark,sx*w*.18,h*.32,sz*d*.18,w*.06,h*.7,d*.06);leg.rotation.z=sx*.18;leg.rotation.x=-sz*.18;}
  for(const [y,size] of [[.30,.60],[.55,.38],[.78,.14]]){box(group,gold,0,h*y,0,w*size,.08,d*size);for(const side of [-1,1]){const beam=box(group,gold,side*w*size*.48,h*y,0,.04,.12,d*size);beam.rotation.y=side*.3;}}
  box(group,dark,0,h*.72,0,w*.10,h*.50,d*.10);box(group,light,0,h,0,.07,h*.18,.07,true);return;
 }
 if(family==='triumph'){
  for(const side of [-1,1]){volume(side*w*.27,0,w*.25,d*.65,height*.85);box(group,gold,side*w*.27,height*.53,d*.34,w*.23,.08,.03);}
  box(group,ivory,0,height*.95,0,w*.84,height*.25,d*.75);box(group,gold,0,height*1.09,0,w*.9,.06,d*.8);return;
 }
 if(['matrix','civic','heritage','nexus','horizon'].includes(family)){
  const h=family==='horizon'?height*1.6:family==='matrix'?height*1.35:height;
  if(family==='matrix'){
   // Reference 2: glass central atrium, stepped planted wings and gold floor ribbons.
   volume(0,-d*.03,w*.28,d*.62,h);
   for(const side of [-1,1])for(let tier=0;tier<3;tier++){
    const bw=w*(.34-tier*.065),bd=d*(.69-tier*.09),th=h*(.32+tier*.22),x=side*(w*.14+bw/2);
    volume(x,-d*.07-tier*d*.025,bw,bd,th);
    for(const zz of [-.25,.2])plant(x,th+.28,zz*bd,small*.14);
    box(group,light,x,th*.5,d*.31-tier*d*.045,.025,th*.86,.03,true);
   }
   for(let i=1;i<5;i++)box(group,gold,0,i*h/5,d*.285,w*.30,.035,.03);
   box(group,glass,0,h+.32,-d*.03,w*.29,.1,d*.6);
  }else if(family==='civic'){
   volume(0,-d*.06,w*.76,d*.60,h);
   for(const x of [-.32,-.19,.19,.32])box(group,ivory,x*w,h*.42,d*.32,w*.05,h*.82,d*.06);
   box(group,gold,0,h+.34,0,w*.8,.09,d*.63);
   shape(group,sphereGeo,glass,0,h+.40,-d*.04,w*.28,h*.23,d*.24);
  }else if(family==='heritage'){
   volume(0,-d*.06,w*.76,d*.64,h*.85);
   volume(0,-d*.02,w*.40,d*.42,h*1.15);
   shape(group,sphereGeo,gold,0,h*1.23,-d*.02,w*.23,h*.2,d*.23);
   shape(group,sphereGeo,glass,0,h*1.23+.03,-d*.02,w*.205,h*.18,d*.205);
   for(const x of [-.3,-.15,.15,.3]){shape(group,cylinderGeo,ivory,x*w,h*.45,d*.34,w*.025,h*.9,d*.025);box(group,gold,x*w,h*.9,d*.34,w*.07,.035,.05);}
  }else if(family==='nexus'){
   for(const [x,z] of [[-.23,-.09],[.23,-.09],[0,.22]]){
    shape(group,cylinderGeo,ivory,x*w,h*.39,z*d,w*.21,h*.75,d*.21);
    shape(group,cylinderGeo,glass,x*w,h*.40,z*d,w*.215,h*.55,d*.215,night);
    for(const yy of [.15,.45,.78])shape(group,cylinderGeo,gold,x*w,h*yy,z*d,w*.225,.045,d*.225);
    plant(x*w,h*.8,z*d,small*.19);
   }
   tree(group,0,-d*.09,small*.32);
  }else{
   volume(-w*.10,0,w*.68,d*.67,h*.32);
   volume(w*.19,-d*.13,w*.30,d*.39,h);
   for(let i=1;i<4;i++){box(group,gold,w*.19,h*i/4,-d*.13,w*.34,.05,d*.43);plant(-w*.12,h*.34+i*.025,d*.13-i*d*.12,small*.14);}
  }
  entrance(h);
  for(const x of [-.38,.38])plant(x*w,.20,d*.33,small*.18);
  if(code==='POLICE_3B'){box(group,light,0,h*.7,d*.40,w*.35,.09,.04,true);}
  if(code==='HOSPITAL_3B'||/CLINIC|HEALTH/.test(code)){box(group,light,0,h*.63,d*.41,w*.16,.07,.04,true);box(group,light,0,h*.63,d*.42,.07,h*.16,.04,true);}
  if(code==='PRISON_3B'){for(const side of [-1,1]){box(group,dark,side*w*.44,.4,0,.05,.7,d*.85);volume(side*w*.36,-d*.29,w*.14,d*.14,h*.6);}for(let i=-4;i<=4;i++)box(group,gold,i*w*.1,.4,d*.43,.025,.7,.03);}
  return;
 }
 if(code==='FIRE_STATION_3B'||code==='ROAD_DEPOT_3B'){
  volume(0,-d*.07,w*.82,d*.66,height*.7);
  for(const x of [-.26,0,.26]){box(group,dark,x*w,height*.24,d*.27,w*.22,height*.43,.03);box(group,code==='FIRE_STATION_3B'?0xcb6551:gold,x*w,height*.5,d*.30,w*.23,.07,.04);}
  volume(w*.30,-d*.18,w*.15,d*.2,height*1.2);entrance(height*.7);return;
 }
 if(/POOL|AQUATIC/.test(code)){box(group,ivory,0,.12,0,w*.88,.24,d*.85);box(group,0x438fae,0,.25,0,w*.7,.03,d*.65);for(const x of [-.39,.39])box(group,gold,x*w,.27,0,.04,.04,d*.7);volume(0,-d*.36,w*.8,d*.12,height*.3);return;}
 if(/BASKET|TENNIS|GYM|STADIUM|ARENA|PLAYGROUND/.test(code)){
  box(group,0x307d6e,0,.12,0,w*.85,.2,d*.8);
  for(const x of [-1,1]){box(group,ivory,x*w*.40,.24,0,.035,.02,d*.75);for(let i=0;i<3;i++)box(group,dark,x*(w*.40+i*w*.025),.27+i*.15,0,w*.045,.12,d*.78);}
  for(const z of [-1,1]){box(group,ivory,0,.24,z*d*.36,w*.8,.02,.035);box(group,ivory,0,.6,z*d*.35,w*.18,.7,.03);}
  box(group,ivory,0,.24,0,w*.8,.02,.035);
  if(/STADIUM|ARENA|GYM/.test(code))for(const x of [-1,1]){box(group,gold,x*w*.43,1.05,0,w*.13,.07,d*.85);for(const z of [-.33,.33])box(group,light,x*w*.43,.65,z*d,.04,1.25,.04,true);}
  return;
 }
 if(code==='TELECOM_3B'){volume(0,0,w*.66,d*.63,height*.65);box(group,dark,0,height*.9,0,.10,height*.65,.10);for(const y of [.7,1,1.2])box(group,light,0,height*y,0,w*.30,.05,.05,true);return;}
 if(code==='BUS_STOP_3B'||code==='SCOOTER_DOCK_3B'){box(group,dark,0,.10,0,w*.85,.16,d*.7);box(group,gold,0,small*.7,-d*.1,w*.88,.07,d*.7);box(group,glass,0,small*.4,-d*.38,w*.8,small*.5,.03);for(const x of [-.36,.36])box(group,dark,x*w,small*.4,0,.04,small*.7,.04);return;}
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

}
