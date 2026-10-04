/** Authored side-band furniture. Coordinates are hub layout units (xz ×1.7, y ×1.5).
 * The uninterrupted 4.8-unit centre aisle connects every door to its service counter. */
const ROOM_PROGRAMS=Object.freeze({
 tower_circle:{theme:'civic',accent:'#264e68',label:'Observatoire du Cercle',purpose:'Lire les huit héritages et examiner la tour'},
 heritage_welcome:{theme:'welcome',accent:'#5c7769',label:'Accueil des voyageurs',purpose:'Préparer son parcours dans la cité'},
 mission_hotel:{theme:'dispatch',accent:'#685457',label:'Bureau des missions',purpose:'Consulter les carnets et le tableau des missions'},
 memory_archives:{theme:'library',accent:'#42656d',label:'Salle de lecture',purpose:'Lire les archives de la cité'},
 living_cards_gallery:{theme:'gallery',accent:'#635672',label:'Galerie des cartes vivantes',purpose:'Examiner les œuvres des huit héritages'},
 arena_3b:{theme:'training',accent:'#733e32',label:'Vestiaire de l’Arène',purpose:'Observer le matériel et préparer son entraînement'},
 mobility_center:{theme:'transit',accent:'#33596b',label:'Salon des correspondances',purpose:'Préparer une correspondance et attendre le départ'},
 house_3b:{theme:'atelier',accent:'#776343',label:'Maison des savoir-faire',purpose:'Examiner les échantillons et les créations'},
 garage_3b:{theme:'workshop',accent:'#3e5963',label:'Atelier mécanique',purpose:'Examiner les pièces et les plans techniques'},
 community_house:{theme:'lounge',accent:'#6b7050',label:'Salon de la communauté',purpose:'Se retrouver autour des tables'},
 ai_textile_lab:{theme:'textile',accent:'#405a71',label:'Laboratoire des étoffes',purpose:'Examiner les métiers et les échantillons'},
 mode3_studio:{theme:'studio',accent:'#76535b',label:'Studio de création',purpose:'Examiner les dessins et les silhouettes'},
 central_marina:{theme:'marina',accent:'#336776',label:'Salon de la marina',purpose:'Lire les cartes nautiques et attendre l’embarquement'},
 shipyard_3b:{theme:'shipyard',accent:'#5e6451',label:'Chantier des modèles',purpose:'Examiner les coques et les plans de construction'},
 train_station:{theme:'station',accent:'#485d76',label:'Salle des départs',purpose:'Lire les correspondances et attendre le train'},
 workers_memorial:{theme:'memorial',accent:'#6e6d63',label:'Salle du souvenir',purpose:'Lire les récits des bâtisseurs'},
 wildlife_refuge:{theme:'refuge',accent:'#55735a',label:'Maison du refuge',purpose:'Lire les carnets de soin et observer les espèces'},
 city_planning_office:{theme:'planning',accent:'#4a6468',label:'Atelier d’urbanisme',purpose:'Examiner la maquette et les plans de la cité'},
 city_gallery:{theme:'exhibition',accent:'#735c49',label:'Galerie des cités',purpose:'Examiner les maquettes et les compositions'},
});
export {ROOM_PROGRAMS};

/** Pure deterministic data drives meshes, colliders, interaction anchors and tests. */
export function roomFurniturePlan(b){
 const program=ROOM_PROGRAMS[b.buildingId]||ROOM_PROGRAMS.heritage_welcome;
 const furnishings=[],anchors=[],pieces=[];
 const half=b.width/2,sideX=half-1.45;
 const piece=(material,x,y,z,sx,sy,sz,yaw=0,shape='box',pitch=0,roll=0,color)=>pieces.push({material,x:b.buildingX+x,y,z:b.buildingZ+z,sx,sy,sz,yaw,shape,pitch,roll,color});
 const solid=(id,kind,x,z,width,depth,top)=>furnishings.push({id:`interior:${b.buildingId}:${id}`,buildingId:b.buildingId,kind,x:b.buildingX+x,z:b.buildingZ+z,width,depth,bottom:0,top});
 const anchor=(id,kind,x,z,name,detail,extra={})=>anchors.push({id:`hub:life:${b.buildingId}:${id}`,type:'hubLifeObject',kind,x:b.buildingX+x,z:b.buildingZ+z,buildingId:b.buildingId,name,detail,range:3.2,heading:0,...extra});
 const chair=(id,x,z,yaw=0)=>{
  // Seat feet touch the deck; arms, back, upholstered cushion and metal feet are separate solids.
  piece('wood',x,.51,z,1.12,.16,.94,yaw);
  piece('cloth',x,.61,z,1.03,.12,.83,yaw, 'box',0,0,program.accent);
  const backX=x+Math.sin(yaw)*.4,backZ=z+Math.cos(yaw)*.4;
  piece('wood',backX,.99,backZ,1.1,.86,.12,yaw);
  piece('cloth',backX-Math.sin(yaw)*.07,1.04,backZ-Math.cos(yaw)*.07,.91,.59,.1,yaw,'box',0,0,program.accent);
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const dx=sx*.42,dz=sz*.32;
   piece('metal',x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,.24,z-Math.sin(yaw)*dx+Math.cos(yaw)*dz,.055,.48,.055,yaw);
  }
  for(const side of [-1,1]){
   const ax=x+Math.cos(yaw)*side*.5,az=z-Math.sin(yaw)*side*.5;
   piece('wood',ax,.83,az,.11,.1,.8,yaw);
   piece('metal',ax,.68,az,.045,.34,.045,yaw);
  }
  solid(id,'seat',x,z,1.22,1.05,1.47);
  const approachX=x-Math.sign(x)*1.48;
  anchor(id,'seat',approachX,z,'S’asseoir · '+program.label,'Prendre un moment dans '+program.label.toLocaleLowerCase('fr'),{seatX:b.buildingX+x,seatZ:b.buildingZ+z,seatHeight:.68,heading:yaw+Math.PI});
 };
 const table=(id,x,z,width=1.95,depth=1.35,kind='examine')=>{
  piece('wood',x,.88,z,width,.15,depth);
  piece('metal',x,.955,z,width+.035,.025,depth+.035);
  for(const sx of [-1,1])for(const sz of [-1,1])piece('wood',x+sx*(width/2-.17),.41,z+sz*(depth/2-.17),.105,.82,.105);
  piece('metal',x,.39,z,width-.23,.04,.045);
  solid(id,'table',x,z,width,depth,.98);
  anchor(id,kind,x-Math.sign(x)*(width/2+.9),z,kind==='read'?'Lire · '+program.label:'Examiner · '+program.label,program.purpose,{heading:Math.sign(x)*Math.PI/2});
 };
 const book=(x,z,open=false)=>{
  if(open){
   for(const side of [-1,1]){
    piece('wood',x+side*.18,.996,z,.36,.035,.48,0,'box',0,side*-.055,'#665244');
    piece('paper',x+side*.18,1.025,z,.33,.035,.44,0,'box',0,side*-.055);
    for(let row=0;row<5;row++)piece('ink',x+side*.18,1.05,z-.13+row*.058,.24,.004,.008);
   }
  }else{
   piece('wood',x,1.002,z,.46,.065,.59,0,'box',0,0,program.accent);
   piece('paper',x,1.046,z,.42,.05,.55);
   piece('wood',x,1.078,z,.46,.022,.59,0,'box',0,0,program.accent);
  }
 };
 const shelf=(id,side,length=4.6,books=true)=>{
  const xx=side*(half-.8);
  // Shelves grow upwards from a floor plinth; rear casing and dividers give visible depth.
  piece('wood',xx,.15,-.85,.83,.3,length);
  piece('wood',xx+side*.36,1.85,-.85,.11,3.45,length);
  for(const end of [-1,1])piece('wood',xx,1.85,-.85+end*(length/2-.06),.8,3.45,.12);
  for(let row=0;row<5;row++){
   const yy=.34+row*.68;
   piece('wood',xx,yy,-.85,.83,.09,length);
   for(let j=0;j<Math.floor(length/.31)-1;j++){
    const zz=-.85-length/2+.28+j*.31;
    const height=.3+((row*11+j*3)%5)*.052;
    if(books){
     const tint=['#50616b','#857046','#6c4f4b','#728278','#514a62'][(j+row)%5];
     piece('wood',xx-side*.17,yy+.06+height/2,zz,.38,height,.20,0,'box',0,0,tint);
     piece('metal',xx-side*.368,yy+.15,zz,.022,.035,.13);
    }else{
     piece(j%3?'cloth':'wood',xx-side*.13,yy+.16,zz,.45,.2,.22,0,'box',0,0,j%3?program.accent:'#887657');
    }
   }
  }
  solid(id,'shelf',xx,-.85,.92,length,3.6);
 };
 const cabinet=(id,x,z,width=1.95,depth=1.3)=>{
  piece('wood',x,.48,z,width,.96,depth);
  piece('metal',x,.99,z,width+.08,.07,depth+.08);
  for(const part of [-1,1]){
   piece('wood',x+part*width*.245,.54,z+depth/2+.015,width*.465,.69,.04,0,'box',0,0,'#6c6150');
   piece('metal',x+part*width*.245,.77,z+depth/2+.06,.3,.035,.04);
  }
  solid(id,'cabinet',x,z,width+.1,depth+.1,1.04);
 };
 const lamp=(x,z)=>{
  piece('metal',x,1.04,z,.29,.025,.29);
  piece('metal',x,1.29,z,.035,.5,.035);
  piece('light',x,1.55,z,.36,.14,.3);
  piece('metal',x,1.64,z,.43,.035,.35);
 };
 const wallDisplay=(side,kind='art')=>{
  const xx=side*(half-.39),zz=.55;
  piece('metal',xx,2.82,zz,.10,2.15,2.55);
  piece('paper',xx-side*.055,2.82,zz,.06,1.97,2.37,0,'box',0,0,kind==='plants'?'#677f62':'#d6ccae');
  for(let k=0;k<5;k++){
   const hh=kind==='chart'?.08:.36+((k*3)%4)*.26;
   piece('cloth',xx-side*.097,2.15+k*.24,zz-.82+k*.38,.02,hh,.24,0,'box',0,0,program.accent);
  }
 };
 // A woven runner is flush to the floor and creates a legible clear central aisle.
 piece('cloth',0,.068,.45,Math.min(4.55,b.width*.35),.025,b.depth*.59,0,'box',0,0,program.accent);
 for(const side of [-1,1])piece('metal',side*Math.min(2.14,b.width*.165),.083,.45,.024,.004,b.depth*.55);
 for(let row=0;row<9;row++)piece('cloth',0,.084,.45+(row-4)*b.depth*.055,Math.min(4.1,b.width*.32),.003,.027,0,'box',0,0,'#a59470');
 // Bracket-mounted luminaires illuminate the near view visually without 19 point-light passes.
 for(const side of [-1,1]){
  const xx=side*(half-.48);
  piece('metal',xx,3.72,2,.08,.64,.22);
  piece('light',xx-side*.04,3.75,2,.14,.42,.18);
  piece('metal',xx,3.45,2,.25,.06,.32);
 }
 switch(program.theme){
  case 'library':
   shelf('archive-shelves',-1,Math.min(7.5,b.depth-.9),true);table('reading-desk',sideX-.23,-1.3,2.12,1.6,'read');book(sideX-.5,-1.3,true);lamp(sideX+.32,-1.57);chair('reading-chair',sideX,1.08,Math.PI);break;
  case 'dispatch':
   shelf('mission-folios',-1,4.4,true);table('dispatch-desk',sideX-.25,-1.15,2,1.45,'read');book(sideX-.35,-1.2,true);lamp(sideX+.37,-1.28);chair('dispatch-chair',sideX,1.24,Math.PI);wallDisplay(1,'chart');break;
  case 'lounge':
   for(const side of [-1,1]){chair('conversation-seat-'+side,side*sideX,1.55,side*Math.PI/2);table('conversation-table-'+side,side*(sideX-.2),-.85,1.95,1.4);book(side*(sideX-.25),-.8);lamp(side*(sideX+.28),-1.02);}break;
  case 'atelier': case 'textile': case 'studio':
   shelf('sample-cabinet',-1,4.45,false);table('pattern-table',sideX-.25,-1.16,2.03,1.62,'examine');
   for(let k=0;k<3;k++)piece('cloth',sideX-.35,1.01+k*.06,-1.3,.98,.055,.79,0,'box',0,0,['#526e7b','#af855b','#82585a'][k]);
   piece('metal',sideX+.4,1.08,-.83,.56,.055,.035,.4);
   chair('creator-seat',sideX,1.33,Math.PI);
   // Full garment rail occupies the closed side band, with hanging shoulders and fabric panels.
   for(const end of [-1,1])piece('metal',-sideX,1.6,2.5+end*.65,.055,3.2,.055);
   piece('metal',-sideX,3.225,2.5,.055,.055,1.42);
   for(let k=0;k<4;k++){const zz=1.98+k*.35;piece('wood',-sideX,3.02,zz,.68,.045,.04);piece('cloth',-sideX,2.5,zz,.63,.94,.06,0,'box',0,0,k%2?program.accent:'#b8aa89');}
   solid('garment-rail','rack',-sideX,2.5,.86,1.53,3.27);break;
  case 'training':
   cabinet('equipment-lockers',-sideX,-1.2,2,3.8);cabinet('armour-rack',sideX,-1.2,2,3.8);
   for(const side of [-1,1]){
    // Blunt training equipment on anchored stands, clear of the large central sparring space.
    for(let k=0;k<3;k++)piece('wood',side*sideX,1.65,-2.5+k*1.12,.18,1.3,.18,0,'box',0,.13*k);
    chair('training-bench-'+side,side*sideX,2.18,side*Math.PI/2);
   }
   wallDisplay(-1,'chart');break;
  case 'workshop': case 'shipyard':
   cabinet('parts-cabinet',-sideX,-1.1,2.1,3.4);table('technical-bench',sideX-.22,-1.05,2.05,1.65,'examine');
   for(let k=0;k<4;k++){piece('metal',sideX-.65+k*.3,1.10,-1.05,.22,.24,.45);piece('ink',sideX-.65+k*.3,1.23,-1.05,.12,.05,.3);}
   piece('paper',sideX-.22,1.001,-1.05,1.4,.024,1.18);for(let k=0;k<6;k++)piece('ink',sideX-.22,1.015,-1.46+k*.15,1.15,.004,.015);
   chair('craft-seat',sideX,1.5,Math.PI);wallDisplay(-1,'chart');break;
  case 'transit': case 'station': case 'marina':
   for(const side of [-1,1])chair('waiting-seat-'+side,side*sideX,1.46,side*Math.PI/2);cabinet('travel-cabinet',-sideX,-1.45,1.97,1.55);
   for(let k=0;k<3;k++){piece('wood',-sideX,1.24+k*.24,-1.45,.95,.22,.61,0,'box',0,0,k%2?program.accent:'#9c8460');piece('metal',-sideX,1.37+k*.24,-1.45,.4,.025,.08);}
   table('route-table',sideX-.28,-1.45,1.8,1.3,'read');book(sideX-.3,-1.44,true);wallDisplay(1,'chart');break;
  case 'memorial':
   shelf('oral-history-shelves',-1,4.55,true);chair('memorial-seat',sideX,1.42,Math.PI);table('memory-book',sideX-.24,-1.15,1.98,1.44,'read');book(sideX-.4,-1.1,true);lamp(sideX+.34,-1.2);break;
  case 'refuge':
   cabinet('care-cabinet',-sideX,-1.2,1.94,2.7);table('field-journal',sideX-.25,-1.16,2.02,1.42,'read');book(sideX-.4,-1.2,true);chair('refuge-seat',sideX,1.2,Math.PI);wallDisplay(-1,'plants');
   for(let k=0;k<4;k++)piece('paper',-sideX+(k%2)*.36-.18,1.27+Math.floor(k/2)*.29,-1.25,.25,.43,.24,0,'box',0,0,'#c9c5a2');break;
  case 'gallery': case 'exhibition':
   for(const side of [-1,1]){wallDisplay(side);cabinet('exhibit-plinth-'+side,side*sideX,-1.25,1.95,1.85);}
   for(const side of [-1,1])for(let k=0;k<3;k++){const xx=side*sideX+side*(k-1)*.42;piece(k===1?'metal':'glass',xx,1.31+(k%2)*.25,-1.25,.31,.48+(k%2)*.5,.32);}
   chair('gallery-seat',-sideX,1.64,-Math.PI/2);
   anchor('artwork','examine',sideX-2.06,-1.25,'Examiner les créations',program.purpose,{heading:Math.PI/2});break;
  case 'planning': case 'civic': case 'welcome':
   table('city-model',sideX-.25,-1.15,2.1,1.7,'examine');
   piece('paper',sideX-.25,1.005,-1.15,1.88,.035,1.51,0,'box',0,0,'#9aa7a0');
   for(let k=0;k<8;k++){const a=k*Math.PI/4,xx=sideX-.25+Math.cos(a)*.58,zz=-1.15+Math.sin(a)*.48;piece(k===2?'metal':'glass',xx,1.18+(k%3)*.07,zz,.19,.32+(k%3)*.14,.22);}
   piece('metal',sideX-.25,1.55,-1.15,.12,1.02,.12);
   shelf('plan-folios',-1,4.5,true);chair('welcome-seat',-sideX,2.17,-Math.PI/2);wallDisplay(1,'chart');break;
 }
 return {buildingId:b.buildingId,program,pieces,furnishings,anchors,aisleHalfWidth:2.4,floorSurfaces:[{id:'rug:'+b.buildingId,kind:'textile',x:b.buildingX,z:b.buildingZ+.45,width:Math.min(4.55,b.width*.35),depth:b.depth*.59}]};
}
