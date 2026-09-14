const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const safeColor=(v,fallback='#0a0b0d')=>/^#[0-9a-f]{6}$/i.test(v||'')?v:fallback;
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export const CUSTOMIZATION_CATEGORIES=Object.freeze([
  {id:'body',label:'Carrosserie'},
  {id:'wheels',label:'Roues & stance'},
  {id:'lighting',label:'Phares & lumières'},
  {id:'paint',label:'Peinture & matières'},
  {id:'livery',label:'Stickers & livrées'},
  {id:'interior',label:'Habitacle'},
  {id:'audio',label:'Audio & multimédia'},
  {id:'engineBay',label:'Baie moteur'},
  {id:'identity',label:'Détails & identité'},
]);

const BLUEPRINTS=[
  ['body','frontBumper','Pare-chocs avant',1800,['Origine','Street','Sport','Track','Wide','Nexus']],
  ['body','rearBumper','Pare-chocs arrière',1800,['Origine','Street','Sport','Track','Wide','Nexus']],
  ['body','sideSkirts','Bas de caisse',1300,['Origine','Street','Sport','Track','Wide','Nexus']],
  ['body','hood','Capot',1500,['Origine','Lisse','Ventilé','Carbone','Track','Nexus']],
  ['body','roof','Toit',1000,['Origine','Panoramique','Carbone','Nexus']],
  ['body','fenders','Ailes',1600,['Origine','Sport','Ventilé','Wide','Riveté','Nexus']],
  ['body','spoiler','Aileron',1700,['Aucun','Ducktail','Street','GT','Actif','Nexus']],
  ['body','diffuser','Diffuseur',1400,['Origine','Street','Sport','Track','Canards','Nexus']],
  ['body','mirrors','Rétroviseurs',850,['Origine','Compact','Carbone','Aéro','Caméra','Nexus']],
  ['body','grille','Calandre',900,['Origine','Mesh','Noire','Sport','Minimal','Nexus']],
  ['body','exhaustTips','Sorties échappement',900,['Origine','Double','Quad','Titane','Central','Nexus']],
  ['body','doorHandles','Poignées',650,['Origine','Noires','Carbone','Affleurantes','Nexus']],
  ['wheels','rims','Jantes',2300,['Origine','Mesh','Five','DeepDish','Forged','Aero','Heritage','Nexus']],
  ['wheels','rimFinish','Finition jantes',650,['Graphite','Noir','Argent','Or','Chrome','Bicolore']],
  ['wheels','tiresVisual','Flancs pneus',750,['Route','Sport','Semi-slick','Lettrage blanc','Lettrage or','Nexus']],
  ['wheels','calipers','Étriers',700,['Noir','Rouge','Or','Bleu Matrix','Argent','Carbone']],
  ['wheels','rotors','Disques',900,['Origine','Rainuré','Percé','Carbone-céramique','Track']],
  ['lighting','headlights','Phares',1600,['Origine','LED','Projecteur','Matrix','Laser','Fumé','Nexus']],
  ['lighting','drl','Signature DRL',900,['Origine','Ligne','Double ligne','Pixel','Halo','Nexus']],
  ['lighting','taillights','Feux arrière',1400,['Origine','LED','Barre','Pixel','Fumé','Nexus']],
  ['lighting','fogLights','Antibrouillards',700,['Origine','Blanc','Jaune','Matrix','Supprimés']],
  ['lighting','turnSignals','Clignotants',450,['Origine','Séquentiel','Fumé','Matrix']],
  ['lighting','underglowHardware','Néons sous caisse',1200,['Aucun','Latéraux','Contour','Zones 4','Full RGB','Nexus']],
  ['paint','finish','Finition peinture',900,['Brillant','Satin','Mat','Métallisé','Nacré','Candy','Chrome','Iridescent']],
  ['paint','carbonPattern','Carbone',700,['Aucun','2x2','Forgé','Large weave','Bleu','Or']],
  ['paint','glassTint','Teinte vitres',550,['Claire','Légère','Moyenne','Foncée','Bleu froid','Bronze']],
  ['interior','seats','Fauteuils',2400,['Origine','Confort','Sport','Baquet','Baquet carbone','Luxe','Heritage','Nexus']],
  ['interior','seatMaterial','Matière sièges',1100,['Tissu','Alcantara','Cuir','Nappa','Carbone+Cuir','Velours 3B']],
  ['interior','steeringWheel','Volant',1500,['Origine','Sport','Plat','Alcantara','Carbone','Racing display','Nexus']],
  ['interior','shiftKnob','Levier / palettes',900,['Origine','Alu','Carbone','Titane','Racing','Nexus']],
  ['interior','dashboardTrim','Planche de bord',1200,['Origine','Noire','Alcantara','Carbone','Bois sombre','Or discret','Nexus']],
  ['interior','gauges','Compteurs',1100,['Origine','Analogique','Digital','HUD','Matrix','Heritage']],
  ['interior','headliner','Ciel de toit',750,['Origine','Noir','Alcantara','Étoilé','Matrix points','Heritage']],
  ['interior','floorMats','Tapis',450,['Origine','Noir','Surpiqûre or','Surpiqûre bleu','3B Heritage']],
  ['interior','rollCage','Arceau',1600,['Aucun','Demi','Complet','Track','Titane','Nexus']],
  ['interior','pedals','Pédalier',500,['Origine','Alu','Sport','Carbone','Track']],
  ['audio','headUnit','Poste radio / écran',1600,['Origine','1-DIN','2-DIN','Grand écran','Double écran','Matrix UI','Nexus']],
  ['audio','speakers','Haut-parleurs',1300,['Origine','Premium','Studio','Competition','3B Audio']],
  ['audio','subwoofer','Caisson',1500,['Aucun','Compact','Double','Competition','Coffre vitré','Nexus']],
  ['audio','amplifier','Amplificateur',1200,['Origine','2 canaux','4 canaux','DSP','Competition','3B Audio']],
  ['audio','trunkInstall','Installation coffre',1700,['Origine','Propre','Show','Symétrique','Luxe','Nexus']],
  ['engineBay','engineCover','Cache moteur',1000,['Origine','Noir','Carbone','Or discret','Matrix','Nexus']],
  ['engineBay','intakeVisual','Admission visible',850,['Origine','Noire','Rouge','Bleue','Carbone','Titane']],
  ['engineBay','strutBrace','Barre anti-rapprochement',750,['Aucune','Acier','Alu','Carbone','Titane','Nexus']],
  ['engineBay','hoses','Durites',450,['Noir','Rouge','Bleu Matrix','Or sombre','Transparent']],
  ['engineBay','caps','Bouchons / détails',450,['Origine','Noir','Alu','Or','Bleu Matrix','Nexus']],
  ['identity','plateFrame','Cadre plaque',450,['Origine','Noir','Carbone','Or','3B International','Nexus']],
  ['identity','towHook','Crochet',450,['Aucun','Noir','Rouge','Or','Bleu Matrix']],
  ['identity','antenna','Antenne',350,['Origine','Courte','Aileron requin','Intégrée','Nexus']],
  ['identity','badges','Badges',500,['Origine','Supprimés','Noir','Or','Bleu Matrix','3B']],
];

function optionsFor(category,slot,label,base,names){
  return names.map((name,index)=>({id:`${slot}-${slug(name)}`,category,slot,label:name,price:index===0?0:Math.round(base*Math.pow(1.22,index-1)),rarity:index>=names.length-1?'signature':index>=4?'elite':index>=2?'sport':'street',assetRef:null}));
}

export const CUSTOMIZATION_SLOTS=Object.freeze(BLUEPRINTS.map(([category,id,label,base,names])=>({id,category,label,options:optionsFor(category,id,label,base,names)})));
export const CUSTOMIZATION_OPTIONS=Object.freeze(CUSTOMIZATION_SLOTS.flatMap(s=>s.options));
export const CUSTOMIZATION_OPTION_BY_ID=Object.freeze(Object.fromEntries(CUSTOMIZATION_OPTIONS.map(o=>[o.id,o])));
export const CUSTOMIZATION_SLOT_BY_ID=Object.freeze(Object.fromEntries(CUSTOMIZATION_SLOTS.map(s=>[s.id,s])));
const STOCK_SELECTIONS=Object.fromEntries(CUSTOMIZATION_SLOTS.map(slot=>[slot.id,slot.options[0].id]));
const STOCK_PARTS=Object.values(STOCK_SELECTIONS);

export const DEFAULT_CUSTOMIZATION=Object.freeze({
  selections:STOCK_SELECTIONS,ownedParts:STOCK_PARTS,
  colors:{primary:'#07090d',secondary:'#141820',accent:'#d7b76b',interior:'#090a0c',stitch:'#d7b76b',caliper:'#d7b76b',light:'#eef6ff'},
  stance:{rideHeight:.5,wheelDiameter:.5,wheelWidth:.5,frontTrack:.5,rearTrack:.5,frontCamber:.5,rearCamber:.5,frontOffset:.5,rearOffset:.5},
  neon:{enabled:false,color:'#2f75ff',intensity:.62,front:true,rear:true,left:true,right:true,pulse:'steady'},
  ambient:{enabled:true,color:'#d7b76b',intensity:.35,zones:['dash','doors','footwell']},
  plate:{text:'3B-001',country:'3B',style:'black'},vinylLayers:[],stickers:[],savedLooks:[],
});
function plain(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function normalizeSelections(v){const out={...STOCK_SELECTIONS};if(plain(v))for(const [slot,id] of Object.entries(v)){if(CUSTOMIZATION_SLOT_BY_ID[slot]&&CUSTOMIZATION_OPTION_BY_ID[id]?.slot===slot)out[slot]=id;}return out;}
function normalizeOwned(v){const set=new Set(STOCK_PARTS);if(Array.isArray(v))for(const id of v)if(CUSTOMIZATION_OPTION_BY_ID[id])set.add(id);return [...set].slice(0,1000);}
function normalizeUnitObject(src,keys,defaults){const out={...defaults};if(plain(src))for(const k of keys)out[k]=clamp(Number(src[k]),0,1);return out;}
function normalizeVinylLayer(layer,index=0){const v=plain(layer)?layer:{};return {id:typeof v.id==='string'?v.id:`vinyl-${index+1}`,kind:['shape','text','logo'].includes(v.kind)?v.kind:'shape',shape:['stripe','circle','square','triangle','chevron','flame','tribal','gradient','custom'].includes(v.shape)?v.shape:'stripe',text:String(v.text||'').slice(0,24),color:safeColor(v.color,'#ffffff'),secondaryColor:safeColor(v.secondaryColor,'#000000'),opacity:clamp(Number(v.opacity??1),0,1),x:clamp(Number(v.x??.5),0,1),y:clamp(Number(v.y??.5),0,1),scaleX:clamp(Number(v.scaleX??.25),.01,2),scaleY:clamp(Number(v.scaleY??.25),.01,2),rotation:clamp(Number(v.rotation??.5),0,1),mirror:Boolean(v.mirror),surface:['left','right','hood','roof','rear','front'].includes(v.surface)?v.surface:'left',assetRef:null};}
function normalizeSticker(sticker,index=0){const v=plain(sticker)?sticker:{};return {id:typeof v.id==='string'?v.id:`sticker-${index+1}`,design:String(v.design||'3B').slice(0,40),color:safeColor(v.color,'#ffffff'),x:clamp(Number(v.x??.5),0,1),y:clamp(Number(v.y??.5),0,1),scale:clamp(Number(v.scale??.2),.01,1),rotation:clamp(Number(v.rotation??.5),0,1),surface:['left','right','hood','roof','rear','front','glass'].includes(v.surface)?v.surface:'left',assetRef:null};}

export function normalizeCustomization(value){const d=structuredClone(DEFAULT_CUSTOMIZATION),v=plain(value)?value:{};d.selections=normalizeSelections(v.selections);d.ownedParts=normalizeOwned(v.ownedParts);if(plain(v.colors))for(const k of Object.keys(d.colors))d.colors[k]=safeColor(v.colors[k],d.colors[k]);d.stance=normalizeUnitObject(v.stance,Object.keys(d.stance),d.stance);if(plain(v.neon)){d.neon={...d.neon,...v.neon};d.neon.enabled=Boolean(v.neon.enabled);d.neon.color=safeColor(v.neon.color,d.neon.color);d.neon.intensity=clamp(Number(v.neon.intensity),0,1);for(const side of ['front','rear','left','right'])d.neon[side]=v.neon[side]!==false;d.neon.pulse=['steady','soft','beat','chase'].includes(v.neon.pulse)?v.neon.pulse:'steady';}if(plain(v.ambient)){d.ambient={...d.ambient,...v.ambient};d.ambient.enabled=v.ambient.enabled!==false;d.ambient.color=safeColor(v.ambient.color,d.ambient.color);d.ambient.intensity=clamp(Number(v.ambient.intensity),0,1);d.ambient.zones=Array.isArray(v.ambient.zones)?v.ambient.zones.filter(x=>['dash','doors','footwell','console','roof','seats'].includes(x)).slice(0,6):d.ambient.zones;}if(plain(v.plate)){d.plate.text=String(v.plate.text||d.plate.text).replace(/[^A-Z0-9 -]/gi,'').slice(0,12).toUpperCase();d.plate.country=String(v.plate.country||'3B').slice(0,4);d.plate.style=['white','black','gold','matrix'].includes(v.plate.style)?v.plate.style:'black';}d.vinylLayers=Array.isArray(v.vinylLayers)?v.vinylLayers.slice(0,128).map((x,i)=>normalizeVinylLayer(x,i)):[];d.stickers=Array.isArray(v.stickers)?v.stickers.slice(0,64).map((x,i)=>normalizeSticker(x,i)):[];d.savedLooks=Array.isArray(v.savedLooks)?v.savedLooks.filter(plain).slice(0,12).map(x=>({name:String(x.name||'Look').slice(0,30),data:plain(x.data)?x.data:{}})):[];for(const [slot,id] of Object.entries(d.selections))if(!d.ownedParts.includes(id))d.selections[slot]=STOCK_SELECTIONS[slot];return d;}
export function equipVisualPart(customization,optionId){const c=normalizeCustomization(customization),o=CUSTOMIZATION_OPTION_BY_ID[optionId];if(!o||!c.ownedParts.includes(optionId))return c;return {...c,selections:{...c.selections,[o.slot]:optionId}};}
export function ownVisualPart(customization,optionId){const c=normalizeCustomization(customization),o=CUSTOMIZATION_OPTION_BY_ID[optionId];if(!o)return c;return {...c,ownedParts:c.ownedParts.includes(optionId)?c.ownedParts:[...c.ownedParts,optionId]};}
export function setCustomizationColor(customization,key,value){const c=normalizeCustomization(customization);if(!(key in c.colors))return c;return {...c,colors:{...c.colors,[key]:safeColor(value,c.colors[key])}};}
export function setStanceValue(customization,key,value){const c=normalizeCustomization(customization);if(!(key in c.stance))return c;return {...c,stance:{...c.stance,[key]:clamp(Number(value),0,1)}};}
export function setNeonValue(customization,key,value){const c=normalizeCustomization(customization);if(!(key in c.neon))return c;const neon={...c.neon};if(key==='color')neon.color=safeColor(value,neon.color);else if(key==='intensity')neon.intensity=clamp(Number(value),0,1);else if(key==='pulse')neon.pulse=['steady','soft','beat','chase'].includes(value)?value:neon.pulse;else neon[key]=Boolean(value);return {...c,neon};}
export function setPlate(customization,patch){const c=normalizeCustomization(customization),next={...c.plate,...patch};return normalizeCustomization({...c,plate:next});}
export function addVinylLayer(customization,layer={}){const c=normalizeCustomization(customization);if(c.vinylLayers.length>=128)return c;const id=`vinyl-${Date.now().toString(36)}-${c.vinylLayers.length}`;return {...c,vinylLayers:[...c.vinylLayers,normalizeVinylLayer({...layer,id},c.vinylLayers.length)]};}
export function updateVinylLayer(customization,id,patch){const c=normalizeCustomization(customization);return {...c,vinylLayers:c.vinylLayers.map((v,i)=>v.id===id?normalizeVinylLayer({...v,...patch,id},i):v)};}
export function removeVinylLayer(customization,id){const c=normalizeCustomization(customization);return {...c,vinylLayers:c.vinylLayers.filter(v=>v.id!==id)};}
export function addSticker(customization,sticker={}){const c=normalizeCustomization(customization);if(c.stickers.length>=64)return c;const id=`sticker-${Date.now().toString(36)}-${c.stickers.length}`;return {...c,stickers:[...c.stickers,normalizeSticker({...sticker,id},c.stickers.length)]};}
export function removeSticker(customization,id){const c=normalizeCustomization(customization);return {...c,stickers:c.stickers.filter(v=>v.id!==id)};}
export function saveLook(customization,name='Look 3B'){const c=normalizeCustomization(customization),data={selections:c.selections,colors:c.colors,stance:c.stance,neon:c.neon,ambient:c.ambient,plate:c.plate,vinylLayers:c.vinylLayers,stickers:c.stickers};return {...c,savedLooks:[...c.savedLooks,{name:String(name).slice(0,30),data:structuredClone(data)}].slice(-12)};}
export function applySavedLook(customization,index){const c=normalizeCustomization(customization),look=c.savedLooks[index];if(!look)return c;return normalizeCustomization({...c,...structuredClone(look.data),ownedParts:c.ownedParts,savedLooks:c.savedLooks});}
export function customizationStats(customization){const c=normalizeCustomization(customization);const equipped=Object.values(c.selections).filter(id=>!STOCK_PARTS.includes(id)).length;return {slots:CUSTOMIZATION_SLOTS.length,options:CUSTOMIZATION_OPTIONS.length,equipped,owned:c.ownedParts.length,vinylLayers:c.vinylLayers.length,stickers:c.stickers.length};}
