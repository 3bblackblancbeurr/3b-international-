import {worldCartographyArt as mapArt} from '../../design-system/tokens.js';
/** One catalogue for reference geography, rendered equipment and usable anchors.
 * Sites/pieces are layout units. Public interactions and map sites are world metres.
 * Distant viewTarget coordinates describe scenery, never walk destinations. */
import {HUB_SCALE} from './platform-layout.js';
import {CITE_GATE_SITES,CITE_CONNECTORS,CITE_DOCK_SPANS} from './platform-topology.js';

function gateCourt(sector,z=24){
 const gate=CITE_GATE_SITES[sector],rotation=Math.atan2(gate.x,gate.z);
 return {x:gate.x+Math.sin(rotation)*z,z:gate.z+Math.cos(rotation)*z,rotation,width:12,depth:12,baseY:gate.baseY||0,surfaceId:'gate-'+sector};
}
const bridge=CITE_CONNECTORS.find(p=>p.id==='country-causeway-1');
const bridgeSite=()=>({x:bridge.x,z:bridge.z,rotation:Math.PI/2-bridge.angle,width:8,depth:12,surfaceId:bridge.id});
const berth=CITE_DOCK_SPANS[0];
const baySite=()=>({x:berth.x,z:berth.z,rotation:Math.PI/2-berth.angle,width:Math.min(8,berth.width-1),depth:10,surfaceId:berth.id});
const entry=(id,name,district,site,kind,activity,detail,viewTarget,feature)=>Object.freeze({id,name,district,...site,kind,activity,detail,viewTarget:Object.freeze(viewTarget),feature:feature?Object.freeze(feature):undefined,units:'layout'});
export const REFERENCE_LANDMARKS=Object.freeze([
 entry('mont_savoirs','Mont des Savoirs','archives',gateCourt(7),'knowledge','Lire la chronique des bâtisseurs','Des ouvriers de huit pays ont dessiné les premiers îlots. Compare la pierre, les ponts et les inscriptions : transmettre un savoir permet à chacun de construire sans effacer ce qui existe déjà.',{x:-226,z:-178},{kind:'mountain',x:-226,z:-178,r:26}),
 entry('lac_reflets','Lac des Reflets','innovation',gateCourt(0,-24),'reflection','Examiner la table des reflets','Le miroir compare trois états du réseau : une source, son reflet et son signal. Observe la vraie poche d’eau sous l’observatoire, puis rejoins les relais du Quartier Innovation & IA pour retrouver ce qui brouille la mémoire.',{x:-35,z:-152},{kind:'lake',x:-35,z:-152,r:12}),
 entry('pont_civilisations','Pont des Civilisations','broken_circle_tower',bridgeSite(),'bridge','Examiner les assemblages du pont','La maquette montre les portées, les appuis et les liaisons de ce pont praticable. Le passage relie la porte de Turquie aux promenades communes : chaque rive apporte sa technique, et les deux doivent supporter le même chemin.',{x:CITE_GATE_SITES[1].x,z:CITE_GATE_SITES[1].z}),
 entry('falaises_orient','Falaises d’Orient','arena',gateCourt(1),'lookout','Observer les Falaises d’Orient','Utilise cette lunette pour lire le relief oriental et les passages entre Turquie et Italie. Les courants, la brume et les silhouettes aident les voyageurs à reconnaître leur chemin avant de rejoindre l’Arène 3B.',{x:207,z:-182},{kind:'cliff',x:207,z:-182,r:23}),
 entry('place_sol','Place du Sol','community',gateCourt(6),'square','Lire la table des rencontres','La mosaïque rappelle que huit héritages partagent un seul sol. Ici, les habitants comparent leurs récits avant de prendre une décision. Rejoins le Quartier Communauté pour retrouver les personnes qui cherchent à se réunir.',{x:CITE_GATE_SITES[6].x,z:CITE_GATE_SITES[6].z}),
 entry('souks_monde','Souks du Monde','commerce',gateCourt(5),'market','Examiner les matières des souks','Pierre, métal, tissu et pigments passent de main en main. Compare les échantillons des étals : un motif peut changer de matière sans perdre son histoire. Les commandes et les collections se préparent au Quartier Commerce.',{x:CITE_GATE_SITES[5].x,z:CITE_GATE_SITES[5].z}),
 entry('jardins_dolce_vita','Jardins de la Dolce Vita','gardens',gateCourt(2),'garden','Lire l’herbier des jardins','L’herbier décrit les feuillages, leurs ombres et les sols qui retiennent l’eau. La porte d’Italie porte l’Élégance ; dans ce jardin, elle vient d’un équilibre entre la matière, la lumière et le vivant.',{x:CITE_GATE_SITES[2].x+15,z:CITE_GATE_SITES[2].z}),
 entry('rives_soleil','Rives du Soleil','docks',gateCourt(3,-24),'sundial','Examiner le cadran des rives','Le cadran compare la direction du soleil aux cartes des navigateurs. La porte de Tunisie porte l’Ambition : avancer commence par vérifier son cap, l’heure et les courants avant de choisir une correspondance.',{x:196,z:167},{kind:'shore',x:196,z:167,r:24}),
 entry('terrasses_onis','Terrasses de l’Onis','gardens',gateCourt(4),'memorial','Lire les noms des bâtisseurs','Sous la pergola, des plaques conservent les noms de celles et ceux qui ont relié les îlots. La porte d’Algérie porte la Loyauté : garder ces noms, c’est reconnaître le travail transmis à la cité.',{x:CITE_GATE_SITES[4].x+12,z:CITE_GATE_SITES[4].z+20}),
 entry('mer_infinie','Mer Infinie','docks',gateCourt(3),'horizon','Observer l’horizon marin','La longue-vue et la rose des vents aident à distinguer un départ, une rive et un retour. La Mer Infinie entoure la cité ; ses panoramas n’ouvrent aucun nouveau royaume. Les trajets utilisables partent des stations des Docks & Transports.',{x:270,z:232},{kind:'sea',x:270,z:232,r:48}),
 entry('baie_horizons','Baie des Horizons','docks',baySite(),'harbour','Lire la carte des embarquements','Le plan distingue les quais accessibles, les coques à l’amarrage et les stations de bateau-taxi. Examine la Baie des Horizons avant d’embarquer : une silhouette de navire est un décor, un arrêt signalé est un départ utilisable.',{x:0,z:235},{kind:'bay',x:0,z:235,width:126,depth:76}),
 entry('vallee_cascades','Vallée des Cascades','gardens',gateCourt(5,-24),'listening','Écouter et lire les cascades','La station d’écoute suit l’eau depuis les rochers jusqu’au pied des falaises. Regarde la brume, compare les sons proches et lointains, puis retrouve les graines des Jardins de l’Unité sans quitter les chemins protégés.',{x:-192,z:107},{kind:'waterfall',x:-192,z:107,r:24}),
]);

export function hubReferenceLandmarkItems(){return REFERENCE_LANDMARKS.map(site=>({id:'hub:reference:'+site.id,type:'hubPublicPlace',kind:'landmark',landmarkId:site.id,surfaceId:site.surfaceId,district:site.district,name:site.name,detail:site.detail,activity:site.activity,actions:['use','inspect'],x:site.x*HUB_SCALE,z:site.z*HUB_SCALE,elevation:(site.baseY||0)*1.5,range:4.5,color:mapArt.landmarkAccent}));}

export function referenceLandmarkPlan(site){
 const pieces=[],solids=[],anchors=[],c=Math.cos(site.rotation),s=Math.sin(site.rotation);
 const point=(x,z)=>({x:site.x+c*x+s*z,z:site.z-s*x+c*z});
 const piece=(material,x,y,z,sx,sy,sz,shape='box',yaw=0,pitch=0,roll=0)=>pieces.push({material,...point(x,z),y:y+(site.baseY||0),sx,sy,sz,shape,yaw:site.rotation+yaw,pitch,roll});
 const solid=(id,x,z,width,depth,top)=>solids.push({id:'reference:'+site.id+':'+id,...point(x,z),width,depth,rotation:site.rotation,bottom:site.baseY||0,top:top+(site.baseY||0)});
 const anchor=(id,kind,x,z,name,extra={})=>anchors.push({id:'hub:reference-life:'+site.id+':'+id,type:'hubLifeObject',kind,landmarkId:site.id,district:site.district,name,detail:site.detail,...point(x,z),heading:(site.rotation+Math.PI)*180/Math.PI,range:3.2,...extra});
 // This actual paving footprint appears in the atlas. It stays flush and walkable.
 piece('stone',0,.055,0,site.width,.07,site.depth);
 for(const side of [-1,1])piece('gold',side*(site.width/2-.13),.099,0,.09,.025,site.depth-.3);
 const tableX=-2.3,tableZ=-2.15;
 piece('wood',tableX,.9,tableZ,2.15,.14,1.24);piece('gold',tableX,.984,tableZ,2.2,.024,1.27);
 for(const side of [-1,1])piece('dark',tableX+side*.87,.42,tableZ,.1,.84,.95);
 solid('table',tableX,tableZ,2.24,1.3,1.02);
 const read=['knowledge','square','garden','memorial','harbour','listening'].includes(site.kind);
 anchor('display',read?'read':'examine',tableX,.02,site.activity);
 if(read){
  for(const side of [-1,1]){piece('stone',tableX+side*.32,1.03,tableZ,.6,.052,.9,'box',0,0,side*-.05);for(let row=0;row<6;row++)piece('dark',tableX+side*.3,1.062,tableZ-.3+row*.1,.43,.007,.012);}
 }else if(site.kind==='reflection'){
  piece('glass',tableX,1.04,tableZ,1.8,.08,.97);for(let i=0;i<3;i++)piece('blue',tableX-.55+i*.55,1.1,tableZ,.2,.035,.2,'cylinder');
 }else if(site.kind==='bridge'){
  for(const side of [-1,1])piece('stone',tableX+side*.7,1.17,tableZ,.18,.31,.6);
  piece('gold',tableX,1.36,tableZ,1.9,.07,.48);for(const side of [-1,1])piece('gold',tableX,1.48,tableZ+side*.28,1.9,.08,.04);
 }else if(site.kind==='market'){
  for(let i=0;i<3;i++)piece(['gold','glass','green'][i],tableX-.6+i*.6,1.09,tableZ,.45,.19,.75);
 }else if(site.kind==='sundial'){
  piece('stone',tableX,1.04,tableZ,.48,.08,.48,'cylinder');piece('gold',tableX,1.34,tableZ,.055,.57,.045,'box',0,0,.3);
 }else{
  piece('dark',tableX,1.31,tableZ,.13,.68,.13,'cylinder');piece('gold',tableX,1.68,tableZ,.2,.8,.2,'cylinder',0,Math.PI/2);piece('glass',tableX,1.68,tableZ-.43,.19,.04,.19,'cylinder',0,Math.PI/2);
 }
 if(site.kind==='market')for(const side of [-1,1]){
  piece('wood',side*3,.82,2,1.85,.15,1.2);piece('stone',side*3,1.07,2,1.55,.34,.84);
  for(const edge of [-1,1])piece('gold',side*3+edge*.82,1.31,2.48,.065,2.5,.065);
  piece('green',side*3,2.6,2.04,2.05,.13,1.5);solid('stall-'+side,side*3,2,2.05,1.5,2.7);
 }
 if(site.kind==='garden')for(let i=0;i<4;i++){
  const x=3.3,z=-3.8+i*2;piece('stone',x,.35,z,.55,.7,.55,'cylinder');piece('green',x,.99,z,.58,.65,.58,'sphere');solid('planter-'+i,x,z,1.2,1.2,1.6);
 }
 if(site.kind==='memorial'){
  for(const x of [-3.5,3.5])for(const z of [-4.6,4.6]){piece('stone',x,1.5,z,.22,3,.22);solid('pergola-'+x+'-'+z,x,z,.28,.28,3.1);}
  for(let i=0;i<7;i++)piece('wood',0,3.08,-4.5+i*1.5,7.7,.16,.16);
  for(let i=0;i<3;i++)piece('gold',2.4,1.25,-3.5+i*1.2,1.15,1.8,.16);
  solid('memory-wall',2.4,-2.3,1.2,3.65,2.2);
 }
 if(site.kind==='square'){
  piece('gold',0,.103,2,1.25,.015,1.25,'cylinder');for(let i=0;i<8;i++){const a=i*Math.PI/4;piece(i%2?'dark':'blue',Math.sin(a)*1.6,.109,2+Math.cos(a)*1.6,.42,.02,.42,'box',a);}
 }
 if(site.kind==='knowledge')for(let i=0;i<4;i++)piece(i%2?'dark':'gold',2.1,1+i*.27,-3,1.15,.24,.7,'box',i*.15);
 if(site.kind==='listening'){piece('dark',2.1,1.3,-2.6,1.2,1.8,.55);for(const x of [1.82,2.38])piece('gold',x,1.52,-2.94,.16,.16,.16,'sphere');solid('listening-post',2.1,-2.6,1.25,.65,2.2);}
 if(!['bridge','market','memorial','garden'].includes(site.kind)){
  const seat=point(2.8,2.8);piece('wood',2.8,.55,2.8,1.35,.15,1.0);piece('wood',3.38,.95,2.8,.15,.8,1.0);
  for(const x of [2.3,3.3])for(const z of [2.45,3.15])piece('gold',x,.26,z,.055,.52,.055);
  solid('seat',2.8,2.8,1.45,1.12,1.4);
  anchor('seat','seat',.7,2.8,'S’asseoir · '+site.name,{seatX:seat.x,seatZ:seat.z,seatHeight:.68,heading:(site.rotation-Math.PI/2)*180/Math.PI});
 }
 return {site,pieces,solids,anchors,sign:{...point(0,-4.8),y:2.55+(site.baseY||0),width:Math.min(10,site.width),rotation:site.rotation}};
}
export function referenceLandmarkPlans(){return REFERENCE_LANDMARKS.map(referenceLandmarkPlan);}
export function referenceLandmarkLifeItems(){return referenceLandmarkPlans().flatMap(plan=>plan.anchors.map(anchor=>({...anchor,x:anchor.x*HUB_SCALE,z:anchor.z*HUB_SCALE,...(Number.isFinite(anchor.seatX)?{seatX:anchor.seatX*HUB_SCALE,seatZ:anchor.seatZ*HUB_SCALE,seatHeight:anchor.seatHeight*1.5}:{})})));}

/** Root calls before its existing batching and collision/world scaling pass. */
export function addReferenceLandmarks({mesh,box,cylinder,sphere,materials,sign,collisions,cameraSolids}){
 const plans=referenceLandmarkPlans();
 for(const plan of plans){
  for(const p of plan.pieces){const o=mesh(({box,cylinder,sphere})[p.shape],materials[p.material]||materials.stone,p.x,p.y,p.z,p.sx,p.sy,p.sz);o.rotation.set(p.pitch,p.yaw,p.roll);}
  const label=sign(plan.site.name,plan.sign.x,plan.sign.y,plan.sign.z,plan.sign.width);if(label)label.rotation.y=plan.sign.rotation;
  collisions.push(...plan.solids.map(solid=>({...solid})));cameraSolids?.push(...plan.solids.map(solid=>({...solid})));
 }
 return {count:plans.length,places:hubReferenceLandmarkItems(),lifeItems:referenceLandmarkLifeItems(),mapSites:plans.map(({site})=>({id:'reference-site:'+site.id,kind:'landmark',landmarkId:site.id,name:site.name,x:site.x*HUB_SCALE,z:site.z*HUB_SCALE,width:site.width*HUB_SCALE,depth:site.depth*HUB_SCALE,rotation:site.rotation,height:4.8,elevation:(site.baseY||0)*1.5,units:'world',color:site.kind==='garden'?mapArt.landmarkGarden:mapArt.landmarkSite}))};
}
