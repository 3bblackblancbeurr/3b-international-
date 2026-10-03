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
export function cityArchitectureVariant(code,seed='') {
 let state=2166136261;for(const c of String(code)+':'+String(seed))state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
 const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return {form:Math.floor(next()*8),width:.83+next()*.14,depth:.83+next()*.14,height:.85+next()*.27,offset:(next()-.5)*.08,facade:Math.floor(next()*6),roof:Math.floor(next()*4),columns:2+Math.floor(next()*3),terrace:next()>.5,accent:[0x406775,0x557b71,0x73688d,0x9b785b,0x437ba1,0x838875][Math.floor(next()*6)]};
}
export function buildCityArchitecture(api,group,options) {
 const {sphereGeo,cylinderGeo,tree}=api;
 const variant=cityArchitectureVariant(options.code,options.seed),unique=options.code!=='CITY_HALL_3B';
 const shape=(parent,geo,color,x,y,z,w,h,d,...rest)=>api.shape(parent,geo,color,unique?x*variant.width+options.w*variant.offset:x,unique?y*variant.height:y,unique?z*variant.depth:z,unique?w*variant.width:w,unique?h*variant.height:h,unique?d*variant.depth:d,...rest);
 const box=(...args)=>realBox(...args);
 // Real renderer and projection share the same transformations and meshes.
 const realBox=(parent,color,x,y,z,w,h,d,...rest)=>api.box(parent,color,unique?x*variant.width+options.w*variant.offset:x,unique?y*variant.height:y,unique?z*variant.depth:z,unique?w*variant.width:w,unique?h*variant.height:h,unique?d*variant.depth:d,...rest);

 const {w,d,height,kind,code,definition={},ivory=0xe1ded0,glass=0x31596e,night=false}=options;
 const small=Math.min(w,d),gold=0xc5ac76,dark=0x253a46,light=0x55bde7;
 const family=cityArchitectureFamily({...definition,code});
 const plant=(x,y,z,scale)=>{box(group,ivory,x,y,z,scale*.7,scale*.2,scale*.65);shape(group,sphereGeo,0x488369,x,y+scale*.23,z,scale*.3,scale*.3,scale*.28);};
 if(unique&&!['green','mobility'].includes(options.kind)&&!/(STADIUM|ARENA|TENNIS|BASKET|POOL|PLAYGROUND|GYM)/.test(options.code)){
  for(let i=0;i<variant.columns;i++)box(group,variant.accent,(i/(variant.columns-1)-.5)*options.w*.55,options.height*.38,options.d*.37,options.w*.04,options.height*(.25+variant.facade*.035),.045);
  if(variant.terrace)box(group,0xc5ac76,options.w*.24,options.height*.5,options.d*.32,options.w*.24,.08,options.d*.24);
 }
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
  const h=family==='horizon'?height*1.35:family==='matrix'?height*1.35:height;
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
   volume(0,-d*.06,w*(.62+variant.form*.02),d*.60,h);
   if(variant.form%2)volume(-w*.30,-d*.19,w*.20,d*.27,h*.62);
   for(const x of [-.32,-.19,.19,.32])box(group,ivory,x*w,h*.42,d*.32,w*.05,h*.82,d*.06);
   box(group,gold,0,h+.34,0,w*.8,.09,d*.63);
   if(code==='COURTHOUSE_3B'){for(const side of [-1,1]){const pediment=box(group,gold,side*w*.16,h+.47,d*.24,w*.38,.07,d*.12);pediment.rotation.z=-side*.25;}}
   else if(code==='POLICE_3B'){volume(w*.30,-d*.18,w*.18,d*.28,h*1.15);box(group,light,w*.30,h*1.18,-d*.18,w*.22,.08,d*.32,true);}
   else shape(group,variant.form%2?cylinderGeo:sphereGeo,glass,0,h+.40,-d*.04,w*.28,h*.23,d*.24);
  }else if(family==='heritage'){
   volume(0,-d*.06,w*.76,d*.64,h*.85);
   volume(variant.form%2?w*.12:0,-d*.02,w*.40,d*.42,h*1.15);
   shape(group,sphereGeo,gold,0,h*1.23,-d*.02,w*.23,h*.2,d*.23);
   shape(group,sphereGeo,glass,0,h*1.23+.03,-d*.02,w*.205,h*.18,d*.205);
   for(const x of [-.3,-.15,.15,.3]){shape(group,cylinderGeo,ivory,x*w,h*.45,d*.34,w*.025,h*.9,d*.025);box(group,gold,x*w,h*.9,d*.34,w*.07,.035,.05);}
  }else if(family==='nexus'){
   for(const [x,z] of (variant.form%2?[[-.23,0],[.23,0]]:[[-.23,-.09],[.23,-.09],[0,.22]])){
    shape(group,cylinderGeo,ivory,x*w,h*.39,z*d,w*.21,h*.75,d*.21);
    shape(group,cylinderGeo,glass,x*w,h*.40,z*d,w*.215,h*.55,d*.215,night);
    for(const yy of [.15,.45,.78])shape(group,cylinderGeo,gold,x*w,h*yy,z*d,w*.225,.045,d*.225);
    plant(x*w,h*.8,z*d,small*.19);
   }
   tree(group,0,-d*.09,small*.32);
  }else{
   volume(-w*.10,0,w*.68,d*.67,h*.32);
   volume((variant.form%2?-.19:.19)*w,-d*.13,w*.30,d*.39,h);
   if(variant.form>4)volume(w*.29,d*.19,w*.18,d*.25,h*.60);
   for(let i=1;i<4;i++){box(group,gold,w*.19,h*i/4,-d*.13,w*.34,.05,d*.43);plant(-w*.12,h*.34+i*.025,d*.13-i*d*.12,small*.14);}
  }
  if(/FACTORY|WORKS/.test(code)){for(const side of [-1,1]){box(group,dark,side*w*.34,h*.76,-d*.30,w*.08,h*.65,d*.09);box(group,gold,side*w*.34,h*1.1,-d*.30,w*.12,.08,d*.13);}box(group,variant.accent,0,h*.14,d*.39,w*.30,h*.24,.03);}
  if(code==='SUPERMARKET_3B'){box(group,variant.accent,0,h*.31,d*.38,w*.75,.10,d*.20);for(const side of [-1,1])box(group,dark,side*w*.26,.24,d*.38,w*.08,.30,d*.09);}
  if(code==='RAIL_STATION_3B')box(group,gold,0,h*.25,d*.32,w*.85,.06,d*.27);
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
 if(/POOL|AQUATIC/.test(code)){box(group,ivory,0,.12,0,w*.88,.24,d*.85);box(group,0x438fae,0,.25,0,w*.7,.03,d*.65);for(const x of [-.39,.39])box(group,gold,x*w,.27,0,.04,.04,d*.7);for(let i=-2;i<=2;i++)box(group,0xd6d6b2,i*w*.13,.28,0,.015,.015,d*.63);volume(0,-d*.36,w*.8,d*.12,height*.3);return;}
 if(/BASKET|TENNIS|GYM|STADIUM|ARENA|PLAYGROUND/.test(code)){
  const tennis=/TENNIS/.test(code),basket=/BASKET/.test(code),gym=/GYM/.test(code),arena=/ARENA|PLAYGROUND/.test(code),football=!tennis&&!basket&&!gym&&!arena;
  box(group,tennis?0x64846a:basket?0x986d50:arena?0x4b607c:0x307d6e,0,.12,0,w*.85,.2,d*.8);
  for(const x of [-1,1])box(group,ivory,x*w*.40,.24,0,.035,.025,d*.75);
  for(const z of [-1,1])box(group,ivory,0,.24,z*d*.36,w*.8,.025,.035);
  if(tennis){box(group,dark,0,.44,0,w*.78,.4,.02);for(let i=-6;i<=6;i++)box(group,ivory,i*w*.057,.44,0,.008,.36,.025);for(const z of [-.18,.18])box(group,ivory,0,.24,z*d,w*.78,.02,.025);for(const x of [-.27,.27])box(group,ivory,x*w,.24,0,.025,.02,d*.73);}
  else if(basket){for(const side of [-1,1]){box(group,dark,0,.75,side*d*.34,.055,1.10,.055);box(group,ivory,0,1.18,side*d*.32,w*.15,.26,.04);shape(group,cylinderGeo,gold,0,1.07,side*d*.29,w*.055,.015,w*.055);box(group,ivory,0,.24,side*d*.21,w*.28,.02,.025);}shape(group,cylinderGeo,ivory,0,.23,0,small*.14,.015,small*.14);shape(group,cylinderGeo,0x986d50,0,.25,0,small*.125,.017,small*.125);}
  else if(arena){shape(group,cylinderGeo,dark,0,.28,0,w*.32,.30,d*.32);for(const side of [-1,1]){box(group,gold,side*w*.34,.65,0,.055,.80,d*.62);for(const z of [-.30,.30])box(group,light,side*w*.34,.75,z*d,.04,1.10,.04,true);}}
  else if(gym){volume(-w*.31,0,w*.16,d*.68,height*.55);volume(w*.31,0,w*.16,d*.68,height*.55);box(group,ivory,0,height*.62,-d*.02,w*.80,.10,d*.73);for(const x of [-.19,.19]){box(group,variant.accent,x*w,.27,0,w*.19,.12,d*.40);box(group,gold,x*w,.65,-d*.1,.04,.65,.04);}box(group,glass,0,height*.39,-d*.37,w*.75,height*.38,.025,night);}
  else {box(group,ivory,0,.24,0,w*.8,.025,.035);for(const side of [-1,1]){box(group,ivory,0,.70,side*d*.34,w*.21,.90,.035);for(let i=-2;i<=2;i++)box(group,ivory,i*w*.05,.65,side*d*.36,.012,.8,.04);for(let i=0;i<4;i++){box(group,i%2?dark:variant.accent,side*(w*.39+i*w*.022),.27+i*.15,0,w*.045,.12,d*.78);}box(group,gold,side*w*.43,1.15,0,w*.13,.07,d*.83);}}
  return;
 }
 if(code==='TELECOM_3B'){volume(0,0,w*.66,d*.63,height*.65);box(group,dark,0,height*.9,0,.10,height*.65,.10);for(const y of [.7,1,1.2])box(group,light,0,height*y,0,w*.30,.05,.05,true);return;}
 if(code==='BUS_STOP_3B'||code==='SCOOTER_DOCK_3B'){box(group,dark,0,.10,0,w*.85,.16,d*.7);box(group,gold,0,small*.7,-d*.1,w*.88,.07,d*.7);box(group,glass,0,small*.4,-d*.38,w*.8,small*.5,.03);for(const x of [-.36,.36])box(group,dark,x*w,small*.4,0,.04,small*.7,.04);return;}
    if(kind==='housing'){
      const floors=code==='HOME_ORIGIN'?2:Math.max(2,Math.min(12,Math.ceil(height/1.5))),roofColor=[0x40525b,0x816655,0x5e7062,0x425d7a][variant.roof],wall=[0xdcd9cb,0xcac7bd,0xd8c9b5,0xb8c9c5,0xc5c7cf,0xd4d5be][variant.facade];
      const bh=height*(variant.form===0?.72:variant.form===1?1.08:.90),bw=w*(variant.form<3?.70:.53),bd=d*.64;
      box(group,wall,-w*.09,bh/2+.08,-d*.05,bw,bh,bd);
      if(variant.form>=3){const side=variant.form%2?1:-1;box(group,wall,side*w*.27,bh*.32,d*.12,w*.29,bh*.64,d*.58);box(group,roofColor,side*w*.27,bh*.64+.10,d*.12,w*.32,.10,d*.61);}
      if(variant.roof===0||variant.roof===2){for(const side of [-1,1]){const slope=box(group,roofColor,-w*.09+side*bw*.22,bh+.16,-d*.05,bw*.56,.07,bd*1.08);slope.rotation.z=-side*.32;}box(group,roofColor,-w*.09,bh+.26,-d*.05,.055,.10,bd*1.08);}
      else {box(group,roofColor,-w*.09,bh+.12,-d*.05,bw*1.06,.12,bd*1.06);if(variant.roof===3)for(const xx of [-.17,.07])box(group,glass,xx*w,bh+.22,-d*.10,w*.17,.04,d*.29);}
      for(let level=0;level<floors;level++)for(let column=0;column<variant.columns;column++){
       const x=-w*.09+(column/(variant.columns-1)-.5)*bw*.73,y=(level+.55)*bh/floors;
       for(const side of [-1,1]){box(group,dark,x,y,-d*.05+side*bd*.505,bw*.17,bh/floors*.46,.045);box(group,glass,x,y,-d*.05+side*bd*.52,bw*.14,bh/floors*.40,.025,night);}
       if(level&&variant.form%3===0){box(group,ivory,x,y-.14,d*.34,bw*.22,.04,d*.13);box(group,variant.accent,x,y-.04,d*.40,bw*.22,.12,.025);}
      }
      box(group,dark,-w*.07,bh*.14,d*.28,w*.13,bh*.28,.045);box(group,gold,-w*.07,bh*.29,d*.32,w*.20,.04,d*.16);
      for(const side of [-1,1]){box(group,variant.accent,side*w*.43,.20,0,.025,.28,d*.84);plant(side*w*.31,.15,d*.34,small*.11);}
      if(variant.form===2||variant.form===5)volume(w*.22,-d*.14,w*.21,d*.27,bh*1.2);
      box(group,gold,-w*.07,bh*.30,d*.34,w*.22,.025,.025);
      box(group,dark,w*.34,.24,d*.34,w*.06,.34,.05);box(group,light,w*.34,.34,d*.37,w*.055,.06,.02,true);
      if(variant.roof===1||variant.roof===3)plant(-w*.16,bh+.23,-d*.12,small*.13);
      return;
    }
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

