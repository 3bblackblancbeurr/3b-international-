import * as THREE from 'three';
import {surfaceTexture} from './surfaces.js';
import {buildingDimensions} from './building-scale.js';

// A facade is assembled as piers, spandrels, recessed glazing and cornices.
// Keeping real depth lets the same daylight describe every country's architecture.
export function createArchitecture(occlusion){
 const geometries=[],materials=new Map(),textures=new Map();
 const geo=g=>(geometries.push(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,16)),dome=geo(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2));
 const hip=geo(new THREE.CylinderGeometry(.56,1,1,4));hip.rotateY(Math.PI/4);
 const triangular=new THREE.Shape();triangular.moveTo(-.5,0);triangular.lineTo(.5,0);triangular.lineTo(0,1);triangular.closePath();const gable=geo(new THREE.ExtrudeGeometry(triangular,{depth:1,bevelEnabled:false}));gable.translate(0,0,-.5);
 const archShape=new THREE.Shape();archShape.moveTo(-.5,0);archShape.lineTo(-.5,.7);archShape.absarc(0,.7,.5,Math.PI,0,true);archShape.lineTo(.5,0);archShape.closePath();const arch=geo(new THREE.ShapeGeometry(archShape));
 const ring=geo(new THREE.TorusGeometry(1,.06,5,40,Math.PI*1.72));
 const styles={
  france:{wall:['#d3c8b4','#c3baa9','#e0d7c4'],trim:'#e7dfcb',roof:'#35444f',wood:'#30454b',kind:'limestone'},
  italie:{wall:['#cdae84','#cda390','#debd8f'],trim:'#ddc6a2',roof:'#914e36',wood:'#3c5146',kind:'plaster'},
  estonie:{wall:['#c6b8a4','#bdaa96','#bdc4b8'],trim:'#e4daca',roof:'#863f32',wood:'#4c625e',kind:'plaster'},
  turquie:{wall:['#ccb898','#b7a395','#d8c3ac'],trim:'#e6d9be',roof:'#854d39',wood:'#523b30',kind:'timber'},
  algerie:{wall:['#e2e1d3','#d6d5c6','#eee6d2'],trim:'#f1e8d5',roof:'#c0ad88',wood:'#326765',kind:'plaster'},
  tunisie:{wall:['#eeeada','#e4e4d9','#ece6d1'],trim:'#fcf1da',roof:'#c5b996',wood:'#1f66a1',kind:'plaster'},
  maroc:{wall:['#b77b59','#c59170','#b98666'],trim:'#dcc29d',roof:'#8d5b42',wood:'#2d5b50',kind:'plaster'},
  espagne:{wall:['#d6b990','#c9ae90','#ddd0b5'],trim:'#ead7b7',roof:'#98543c',wood:'#3e6059',kind:'limestone'},
 };
 const mat=(color,kind='stone')=>{
  const key=color+kind;if(materials.has(key))return materials.get(key);
  const glass=kind==='glass',metal=kind==='metal',surface=glass||metal?null:kind;
  if(surface&&!textures.has(surface))textures.set(surface,surfaceTexture(surface));
  const m=new THREE.MeshStandardMaterial({color,map:surface?textures.get(surface):null,roughness:glass?.19:metal?.36:.82,metalness:glass?.25:metal?.75:0,envMapIntensity:glass?1.65:1});
  if(surface)m.userData.worldTexScale=kind==='limestone'?5:kind==='timber'?4:3;
  occlusion?.apply(m);materials.set(key,m);return m;
 };
 function building(region,variant=0,{urban=true}={}){
  const s=styles[region]||styles.france,d=buildingDimensions(region,variant,urban),{width:w,depth,height:h,storey,floors}=d,type=variant%5,wall=s.wall[variant%3],g=new THREE.Group();g.userData.dimensions=d;
  function mesh(geometry,color,x,y,z,sx,sy,sz,parent=g,kind='stone'){const m=new THREE.Mesh(geometry,mat(color,kind));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const b=(color,x,y,z,sx,sy,sz,parent=g,kind='stone')=>mesh(box,color,x,y,z,sx,sy,sz,parent,kind);
  // Deep cores make windows shaded reveals, not decals on a solid facade.
  b('#6d6c60',0,h/2,0,w-.85,h,depth-.85,g,s.kind);
  b(s.trim,0,.3,0,w+.35,.6,depth+.35);
  for(let face=0;face<4;face++){
   const front=new THREE.Group();front.rotation.y=face*Math.PI/2;g.add(front);const span=face%2?depth:w,z=(face%2?w:depth)/2,bays=3,pitch=(span-.75)/bays,opening=pitch*.63;
   const east=['maroc','tunisie','algerie'].includes(region);
   for(let floor=0;floor<floors;floor++){
    const y=floor*storey,winHeight=floor?3.25:3.8,sill=floor?1.0:.55;
    b(wall,0,y+sill/2,z,span,sill,.52,front,s.kind);
    b(wall,0,y+(sill+winHeight+storey)/2,z,span,storey-sill-winHeight,.52,front,s.kind);
    for(let col=0;col<=bays;col++){const x=-span/2+.2+col*(span-.4)/bays;b(wall,x,y+storey/2,z,pitch-opening,storey,.62,front,s.kind);}
    for(let col=0;col<bays;col++){
     const x=(col-1)*pitch,door=floor===0&&face===0&&col===1,base=y+(door?.08:sill),height=door?d.doorHeight:winHeight,ww=door?d.doorWidth:opening;
     b(s.wood,x,base+height/2,z-.28,ww+.08,height,.11,front,'timber');
     if(!door){
      b('#183942',x,base+height/2+.03,z-.20,ww-.22,height-.22,.055,front,'glass');
      if(east){mesh(arch,s.trim,x,base-.13,z+.14,ww+.35,(height+.4)/1.2,1,front);mesh(arch,'#294e55',x,base+.03,z+.17,ww-.15,(height-.15)/1.2,1,front,'glass');}
      for(const side of [-1,1]){b(s.trim,x+side*(ww/2+.12),base+height/2,z+.09,.23,height+.38,.35,front);}
      b(s.trim,x,base+height+.12,z+.12,ww+.6,.25,.46,front);
      b(s.trim,x,base-.12,z+.25,ww+.65,.23,.75,front);
      b(east?s.wood:s.trim,x,base+height/2,z-.1,.085,height-.12,.10,front);
      b(east?s.wood:s.trim,x,base+height*.57,z-.1,ww-.15,.085,.10,front);
      // Interior curtains catch a little daylight behind the mullions.
      for(const side of [-1,1])b('#b7b6a2',x+side*ww*.32,base+height*.52,z-.155,ww*.16,height*.85,.018,front,'cloth');
      if(['italie','estonie','tunisie','espagne'].includes(region))for(const side of [-1,1]){const shutter=b(s.wood,x+side*(ww/2+.52),base+height/2,z+.25,.55,height+.06,.16,front,'timber');shutter.rotation.y=side*.16;}
      if(floor>0&&face===0&&['france','espagne','turquie'].includes(region)){
       b(s.trim,x,base-.22,z+.78,ww+.95,.22,1.6,front);
       for(let j=0;j<7;j++)b('#283d3c',x-ww*.55+j*ww*1.1/6,base+.43,z+1.48,.045,1.15,.065,front,'metal');
       b('#aa8d55',x,base+1.01,z+1.48,ww+1,.08,.12,front,'metal');
      }
     }else{
      mesh(arch,s.trim,x,base,z+.13,ww+.75,height/1.12,1,front);mesh(arch,s.wood,x,base+.1,z+.18,ww,height/1.22,1,front,'timber');
      for(const side of [-1,1]){b('#ad905b',x+side*.17,2.25,z+.26,.045,.48,.04,front,'metal');b('#253b3d',x+side*ww*.26,1.4,z+.25,ww*.36,1.7,.03,front);}
     }
    }
    for(const [dy,over,thick] of [[storey-.12,.3,.2],[storey+.12,.65,.16]])b(s.trim,0,y+dy,z+.12,span+over,thick,.72,front);
   }
   // Real cornice overhangs, brackets and rainwater pipes establish scale.
   b(s.trim,0,h+.32,z+.23,span+.8,.3,1.0,front);b(s.trim,0,h+.6,z+.28,span+1,.16,1.1,front);
   if(['france','italie','espagne'].includes(region))for(let x=-span/2+.6;x<span/2;x+=.85)b(s.trim,x,h-.15,z+.35,.2,.42,.56,front);
   for(const x of [-span/2+.16,span/2-.16])b(s.trim,x,h/2,z+.04,.3,h,.56,front);
   mesh(cylinder,s.roof,span/2-.35,h/2,z+.47,.045,h,.045,front,'metal');
  }
  if(['maroc','tunisie','algerie'].includes(region)){
   b(s.roof,0,h+.68,0,w+.3,.18,depth+.3);
   for(const x of [-w/2,w/2])b(wall,x,h+1.12,0,.35,1.05,depth+.35,g,s.kind);
   for(const z of [-depth/2,depth/2])b(wall,0,h+1.12,z,w,1.05,.35,g,s.kind);
   if(type%2===0){b(wall,-w*.22,h+1.9,-depth*.2,w*.4,2.5,depth*.42,g,s.kind);b(s.trim,-w*.22,h+3.2,-depth*.2,w*.43,.18,depth*.46);}
   if(region==='tunisie'&&type===0)mesh(dome,s.trim,-w*.22,h+3.3,-depth*.2,2.2,1.75,2.2);
   if(region==='maroc')for(let i=0;i<10;i++)b(s.trim,-w/2+.35+i*(w-.7)/9,h+1.78,depth/2,.48,.42,.5);
   for(const x of [1,4]){b(s.wood,x,h+2.25,1,.13,2.9,.13,g,'timber');b(s.wood,x,h+2.25,4,.13,2.9,.13,g,'timber');}
   for(let i=0;i<8;i++)b(s.wood,2.5,h+3.7,.8+i*.47,3.5,.12,.12,g,'timber');
  }else if(region==='estonie'){
   mesh(gable,s.roof,0,h+.64,0,w+1,5.2,depth+1,g,'tile');
   for(const side of [-1,1]){mesh(gable,wall,0,h+.64,side*(depth/2),w,5,.35,g,s.kind);for(let step=0;step<4;step++){const sw=w*(1-step*.23);b(wall,0,h+.95+step*1.22,side*(depth/2+.15),sw,1.3,.38,g,s.kind);b(s.trim,0,h+1.62+step*1.22,side*(depth/2+.18),sw+.22,.16,.56);}}
  }else{
   mesh(hip,s.roof,0,h+2.45,0,(w+1.4)/Math.SQRT2,3.6,(depth+1.4)/Math.SQRT2,g,region==='france'?'slate':'tile');
   if(region==='france')for(const x of [-w*.3,0,w*.3]){b(wall,x,h+1.95,depth/2-.28,1.6,2.2,1.4);b('#20424d',x,h+1.95,depth/2+.45,1.03,1.4,.06,g,'glass');mesh(gable,s.roof,x,h+3.06,depth/2-.05,2,.9,1.9,g,'slate');}
   const x=w*.3;b(wall,x,h+3.0,-depth*.2,.8,3.5,1);b(s.trim,x,h+4.82,-depth*.2,1.12,.22,1.3);
  }
  if(region==='france'&&type===2){const x=w*.32,z=depth*.30;mesh(cylinder,wall,x,h+1.5,z,2.3,4,2.3);mesh(dome,s.roof,x,h+3.5,z,2.5,3.4,2.5,g,'slate');mesh(cylinder,'#b59a60',x,h+7.4,z,.07,1.7,.07,g,'metal');}
  if(region==='turquie'&&floors>1){b(s.wood,0,storey+2.4,depth/2+.55,w*.6,4.5,1.7,g,'timber');for(const x of [-w*.2,0,w*.2]){b(s.trim,x,storey+2.6,depth/2+1.44,w*.17,3.3,.15);b('#224751',x,storey+2.6,depth/2+1.53,w*.14,2.9,.05,g,'glass');}b(s.roof,0,storey+4.8,depth/2+.65,w*.7,.25,2.4,g,'tile');}
  if(urban){
   const z=depth/2,shop=variant%3===0;
   if(shop){b('#234349',-w*.31,2.3,z+.2,2.5,3.65,.1,g,'glass');const awning=b(s.wood,-w*.28,4.75,z+1.3,w*.45,.15,2.8,g,'cloth');awning.rotation.x=.12;b('#283f42',-w*.28,5.35,z+.25,w*.44,.7,.17);for(let i=0;i<7;i++)b('#bba36c',-w*.46+i*w*.06,4.47,z+2.65,.1,.38,.12);}
   const sign=b(s.wood,w*.39,4.2,z+.8,.12,1.55,1.2);mesh(ring,'#c6a765',w*.39,4.3,z+1.44,.4,.4,.4,g,'metal');
   for(const x of [-w*.31,w*.31]){b('#6e5640',x,storey+1,z+.58,2,.42,.68);for(let i=0;i<4;i++){mesh(dome,'#385f39',x-.65+i*.42,storey+1.3,z+.58,.32,.44,.32);mesh(dome,variant%2?'#be7188':'#c7ab63',x-.65+i*.42,storey+1.61,z+.65,.13,.13,.13);}}
  }
  return g;
 }
 return{building,dispose(){textures.forEach(t=>t?.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
