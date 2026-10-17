import {worldRealmArt} from '../design-system/tokens.js';

/** Authored architectural inscription for the real boss courts.
 * All pieces join the existing single masonry geometry/material, with the
 * clear forty-metre combat circle and seven collidable pillars unchanged.
 * Strokes are deliberate line-work, not flags or claims about real history.
 */
const crest=(name,symbol,rotation,strokes)=>Object.freeze({
 name,symbol,rotation,
 strokes:Object.freeze(strokes.map(s=>Object.freeze(s))),
});
export const GUARDIAN_COURT_ART=Object.freeze({
 france:crest('Tribunal des Échos','balance',0,[
  [0,0,.085,1.04], [0,.27,.94,.095],[-.35,-.12,.09,.65],[.35,-.12,.09,.65],[-.35,-.42,.40,.09],[.35,-.42,.40,.09],
 ]),
 algerie:crest('Porte des Deux Alliés','links',.07,[
  [-.32,.23,.12,.56],[-.08,.45,.55,.1],[.31,.23,.12,.56],[-.31,-.23,.12,.55],[.08,-.45,.55,.1],[.30,-.23,.12,.55],
 ]),
 maroc:crest('Cour des Serments','diamond',.13,[
  [0,.43,.22,.15],[-.28,.22,.16,.30],[.28,.22,.16,.30],[-.28,-.22,.16,.30],[.28,-.22,.16,.30],[0,-.43,.22,.15],
 ]),
 tunisie:crest('Passage des Vents','wings',-.08,[
  [0,.02,.10,.94],[-.35,.37,.46,.10],[.35,.37,.46,.10],[-.25,.03,.40,.1],[.25,.03,.40,.1],[0,-.42,.60,.11],
 ]),
 espagne:crest('Sept Battements','pulse',.15,[
  [-.43,.02,.13,.42],[-.25,.19,.13,.75],[-.06,.02,.13,1.08],[.13,.22,.13,.67],[.32,.04,.13,.86],[.49,-.1,.1,.34],
 ]),
 italie:crest('Atelier des Retours','steps',-.12,[
  [-.37,-.31,.16,.25],[-.23,-.13,.18,.23],[-.09,.06,.18,.23],[.07,.22,.18,.23],[.23,.39,.20,.18],[.33,-.31,.18,.20],
 ]),
 turquie:crest('Sanctuaire des Repères','compass',.04,[
  [0,0,.095,1.1],[0,0,.95,.095],[-.36,-.35,.16,.16],[.36,-.35,.16,.16],[-.36,.35,.16,.16],[.36,.35,.16,.16],
 ]),
 estonie:crest('Bois des Faux Reflets','branches',-.16,[
  [0,0,.12,1.04],[-.23,.27,.44,.10],[.23,.40,.43,.10],[-.27,-.16,.48,.10],[.26,-.04,.48,.10],[0,-.44,.68,.1],
 ]),
});
/** The art is compiled into the existing in-region court template.
 * The large guard floor stays physically level and freely walkable. */
export function addGuardianCourtArt(region,{columns,box}){
 const art=GUARDIAN_COURT_ART[region],palette=worldRealmArt[region];
 if(!art||!palette)return null;
 const stone=palette.ground,highlight=palette.sun,cloth=palette.cloth;
 let parts=0;
 const paint=(color,x,y,z,width,height,depth,rotation=0,emission=0)=>{
  // The single existing masonry shader already supports a dusk/window emission
  // channel. Mark small highlights only; no dynamic lights or extra draw.
  box(color,x,y,z,width,height,depth,rotation,0,emission);
  parts++;
 };
 // Seven pre-existing stone pillars: inset metallic bands and the Guardian's
 // authored crest occupy the inward facade (inside the collision footprint).
 for(const p of columns){
  const angle=Math.atan2(p.x,p.z),cos=Math.cos(angle),sin=Math.sin(angle);
  const place=(x,y,w,h,color,front=1.29)=>{
   paint(color,p.x+cos*x-sin*front,y,p.z-sin*x-cos*front,w,h,.068,angle);
  };
  place(0,4.25,1.18,.19,highlight);
  for(const [x,dy,w,h] of art.strokes)place(x,10.55+dy,w,h,cloth,1.40);
  // Crown inscription follows the raised 19-metre colonnade.
  place(0,15.57,.89,.11,highlight,1.40);
 }
 // Existing seven columns now form a genuine open-air tribunal or sanctuary.
 // Six overhead lintels connect the adjacent columns; the seventh span is
 // intentionally absent, preserving the same wide unobstructed southern gate.
 // Even below the beams, accepted navigation/collision remains fully open.
 for(let i=0;i<columns.length-1;i++){
  const from=columns[i],to=columns[i+1],dx=to.x-from.x,dz=to.z-from.z,
   middleX=(from.x+to.x)/2,middleZ=(from.z+to.z)/2,
   angle=Math.atan2(-dz,dx),length=Math.hypot(dx,dz)+1.8;
  paint(stone,middleX,16.68,middleZ,length,1.35,1.9,angle);
  paint(highlight,middleX,17.30,middleZ,length-.7,.16,1.55,angle,.19);
  paint(cloth,middleX,15.48,middleZ,1.85,1.0,.5,angle,.14);
 }
 // Eight sector markers are physically thin inlaid stone on the already level
 // slab, not gameplay collision, a glowing attack decal, or new dynamic lights.
 for(let i=0;i<8;i++){
  const a=(i+.5)*Math.PI/4+art.rotation;
  const x=Math.sin(a)*34,z=Math.cos(a)*34;
  paint(highlight,x,.033,z,.30,.022,2.55,a,.22);
  paint(i%2?cloth:stone,Math.sin(a)*31.8,.032,Math.cos(a)*31.8,.93,.02,.20,a);
  // The inner radiating inlay can actually be seen at player-camera height.
  paint(highlight,Math.sin(a)*22,.038,Math.cos(a)*22,.44,.025,12.5,a,.36);
  paint(cloth,Math.sin(a)*22+Math.cos(a)*.72,.037,Math.cos(a)*22-Math.sin(a)*.72,.14,.025,7.6,a,.13);
 }
 // The central eight-link motif is recognizable at Kaïs's feet but leaves
 // actual combat telegraphs and the ground raycast untouched.
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4+art.rotation;
  paint(i%2?highlight:cloth,Math.sin(a)*5.85,.033,Math.cos(a)*5.85,.19,.018,1.05,a,.08);
 }
 // Large floor relief echoes exactly the emblem engraved on the seven pillars.
 // Thin painted stone never protrudes into the accepted collision/navigation.
 for(let i=0;i<art.strokes.length;i++){
  const [x,y,w,h]=art.strokes[i];
  paint(i%2?highlight:palette.stone,x*11.8,.034+i*.001,y*11.8,Math.max(.3,w*10.8),.021,Math.max(.3,h*10.8),0,.24);
 }
 return Object.freeze({name:art.name,symbol:art.symbol,inscriptionParts:parts,phaseSafe:true});
}
