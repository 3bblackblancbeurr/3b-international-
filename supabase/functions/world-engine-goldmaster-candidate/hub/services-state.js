export const HUB_SERVICE_PATTERNS=Object.freeze({uni:'Uni',bandes:'Bandes',damier:'Damier',insigne:'Insigne 3B',broderie:'Broderie'});
export const HUB_SERVICE_STYLES=Object.freeze({voyageur:'Veste de voyage',sentinelle:'Manteau',mystique:'Cape'});
export const HUB_SERVICE_VEHICLES=Object.freeze({roadster:'Roadster de collection',navette:'Navette des Docks'});
export const HUB_REFUGE_CARE=Object.freeze({water:'Préparer de l’eau',shelter:'Aménager un abri calme',observe:'Observer à distance'});
export const HUB_SERVICE_LIMITS=Object.freeze({designs:24,tributes:32});
const kinds=new Set(['textile','vehicle','postcard']);
const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const text=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const validId=value=>typeof value==='string'&&/^creation-[1-9][0-9]{0,8}$/.test(value);
const tributeId=value=>typeof value==='string'&&/^hommage-[1-9][0-9]{0,8}$/.test(value);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const requireThat=(condition,message)=>{if(!condition)throw Error(message);};

export function blankHubServices(){return {version:1,nextId:1,designs:[],tributes:[],care:{wolf_signal:[]},featured:null};}
export function normalizeHubDesign(raw={}){
 return {id:validId(raw.id)?raw.id:null,kind:kinds.has(raw.kind)?raw.kind:'textile',title:text(raw.title,48)||'Création 3B',caption:text(raw.caption,180),baseColor:color(raw.baseColor)?raw.baseColor.toLowerCase():'#152b40',accentColor:color(raw.accentColor)?raw.accentColor.toLowerCase():'#d4b574',pattern:own(HUB_SERVICE_PATTERNS,raw.pattern)?raw.pattern:'uni',style:own(HUB_SERVICE_STYLES,raw.style)?raw.style:'voyageur',vehicle:own(HUB_SERVICE_VEHICLES,raw.vehicle)?raw.vehicle:'roadster'};
}
export function normalizeHubServices(input){
 const base=blankHubServices(),source=input&&typeof input==='object'?input:{};
 const seen=new Set();
 base.designs=(Array.isArray(source.designs)?source.designs:[]).filter(row=>row&&validId(row.id)&&kinds.has(row.kind)&&!seen.has(row.id)&&seen.add(row.id)).slice(0,HUB_SERVICE_LIMITS.designs).map(normalizeHubDesign);
 const tributeSeen=new Set();
 base.tributes=(Array.isArray(source.tributes)?source.tributes:[]).filter(row=>row&&tributeId(row.id)&&text(row.name,48)&&!tributeSeen.has(row.id)&&tributeSeen.add(row.id)).slice(0,HUB_SERVICE_LIMITS.tributes).map(row=>({id:row.id,name:text(row.name,48),message:text(row.message,180)}));
 base.care.wolf_signal=[...new Set(Array.isArray(source.care?.wolf_signal)?source.care.wolf_signal:[])].filter(key=>own(HUB_REFUGE_CARE,key));
 base.featured=base.designs.some(row=>row.id===source.featured)?source.featured:null;
 const highest=Math.max(0,...base.designs.map(row=>Number(row.id.split('-')[1])),...base.tributes.map(row=>Number(row.id.split('-')[1])));
 base.nextId=Math.max(highest+1,Math.min(999999999,Math.max(1,Math.floor(Number(source.nextId)||1))));
 return base;
}

// This helper owns cosmetic portfolio data only. It never grants money, XP, mission progress or Guardian fragments.
export function applyHubServiceAction(input,action,{wolfEncountered=false}={}){
 const state=normalizeHubServices(input);
 requireThat(action&&action.type==='hubService','Action de service inconnue.');
 switch(action.operation){
  case 'saveDesign':{
   const raw=action.design;
   requireThat(raw&&kinds.has(raw.kind),'Type de création invalide.');
   requireThat(text(raw.title,48).length>0,'Donne un nom à ta création.');
   requireThat(color(raw.baseColor)&&color(raw.accentColor),'Choisis deux couleurs valides.');
   requireThat(own(HUB_SERVICE_PATTERNS,raw.pattern),'Motif inconnu.');
   if(raw.kind==='textile')requireThat(own(HUB_SERVICE_STYLES,raw.style),'Coupe inconnue.');
   if(raw.kind==='vehicle')requireThat(own(HUB_SERVICE_VEHICLES,raw.vehicle),'Modèle inconnu.');
   const index=raw.id==null?-1:state.designs.findIndex(row=>row.id===raw.id);
   requireThat(raw.id==null||index>=0,'Cette création n’existe plus.');
   requireThat(index>=0||state.designs.length<HUB_SERVICE_LIMITS.designs,'Ta galerie contient 24 créations. Supprime une création avant d’en ajouter une.');
   requireThat(index>=0||state.nextId<=999999999,'Limite de créations atteinte.');
   const design={...normalizeHubDesign(raw),id:index>=0?raw.id:`creation-${state.nextId++}`};
   if(index>=0)state.designs[index]=design;else state.designs.push(design);
   if(!state.featured)state.featured=design.id;
   return state;
  }
  case 'deleteDesign':
   requireThat(state.designs.some(row=>row.id===action.id),'Création introuvable.');
   state.designs=state.designs.filter(row=>row.id!==action.id);
   if(state.featured===action.id)state.featured=state.designs[0]?.id||null;
   return state;
  case 'setFeatured':
   requireThat(state.designs.some(row=>row.id===action.id),'Création introuvable.');
   state.featured=action.id;return state;
  case 'saveTribute':{
   requireThat(text(action.name,48).length>0,'Indique le nom de la personne honorée.');
   requireThat(state.tributes.length<HUB_SERVICE_LIMITS.tributes,'Le carnet contient déjà 32 hommages.');
   requireThat(state.nextId<=999999999,'Limite du carnet atteinte.');
   state.tributes.push({id:`hommage-${state.nextId++}`,name:text(action.name,48),message:text(action.message,180)});return state;
  }
  case 'deleteTribute':
   requireThat(state.tributes.some(row=>row.id===action.id),'Hommage introuvable.');
   state.tributes=state.tributes.filter(row=>row.id!==action.id);return state;
  case 'careAnimal':
   requireThat(action.animal==='wolf_signal'&&own(HUB_REFUGE_CARE,action.task),'Soin inconnu.');
   if(action.task==='observe')requireThat(wolfEncountered===true,'Retrouve et protège le loup-signal avant de consigner son observation.');
   if(!state.care.wolf_signal.includes(action.task))state.care.wolf_signal.push(action.task);
   return state;
  default:throw Error('Ce service ne connaît pas cette action.');
 }
}

const xml=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
export function hubDesignSvg(input){
 const design=normalizeHubDesign(input),base=design.baseColor,accent=design.accentColor;
 const pattern=design.pattern==='bandes'?`<path d="M0 0h10v32H0z" fill="${accent}"/>`:design.pattern==='damier'?`<path d="M0 0h16v16H0zM16 16h16v16H16z" fill="${accent}"/>`:design.pattern==='broderie'?`<path d="M16 2 30 16 16 30 2 16Z" fill="none" stroke="${accent}" stroke-width="2"/>`:design.pattern==='insigne'?`<text x="3" y="21" font-size="14" font-family="sans-serif" fill="${accent}">3B</text>`:'';
 const fill='url(#fabric)';
 let shape;
 if(design.kind==='vehicle')shape=design.vehicle==='navette'?`<path d="M75 290h490l-52 76H136Z" fill="${fill}" stroke="${accent}" stroke-width="4"/><path d="M176 210h260l53 80H144Z" fill="${base}" stroke="${accent}" stroke-width="4"/><path d="M194 225h217l28 43H168Z" fill="#a1d7e6"/><path d="M60 387q50-16 100 0t100 0t100 0t100 0t100 0" fill="none" stroke="${accent}" stroke-width="3"/>`:`<path d="M84 280 177 254 238 184h151l82 75 69 19 24 75H74Z" fill="${fill}" stroke="${accent}" stroke-width="4"/><path d="m243 205-43 49h234l-54-49Z" fill="#a1d7e6"/><circle cx="176" cy="349" r="41" fill="#111922" stroke="${accent}" stroke-width="7"/><circle cx="465" cy="349" r="41" fill="#111922" stroke="${accent}" stroke-width="7"/>`;
 else if(design.kind==='postcard')shape=`<path d="M60 350h520v70H60Z" fill="${base}"/><path d="M130 350V250h75v100M240 350V210h65v140M420 350V245h75v105" fill="${fill}" stroke="${accent}" stroke-width="3"/><path d="M350 350V180q-45 50-14 95M370 350V180q45 50 14 95" fill="none" stroke="${accent}" stroke-width="12"/><path d="M50 425h540" stroke="#85c8e3" stroke-width="4"/>`;
 else shape=design.style==='mystique'?`<path d="M280 160h80l150 245H130Z" fill="${fill}" stroke="${accent}" stroke-width="4"/><path d="M280 160q40 75 80 0M320 213v190" fill="none" stroke="${accent}" stroke-width="4"/>`:`<path d="M253 164 180 191 121 283l62 40 43-58v${design.style==='sentinelle'?'160':'135'}h188V265l43 58 62-40-59-92-73-27q-66 65-134 0Z" fill="${fill}" stroke="${accent}" stroke-width="4"/><path d="M320 198v190" stroke="${accent}" stroke-width="4"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 540" width="640" height="540" role="img" aria-label="${xml(design.title)}"><title>${xml(design.title)}</title><defs><pattern id="fabric" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="${base}"/>${pattern}</pattern></defs><rect width="640" height="540" rx="24" fill="#0b1723"/><text x="40" y="52" fill="${accent}" font-family="sans-serif" font-size="15" letter-spacing="4">ATELIER 3B</text><text x="40" y="91" fill="#f3eee3" font-family="sans-serif" font-size="24">${xml(design.title)}</text>${shape}<text x="40" y="485" fill="#d1dce5" font-family="sans-serif" font-size="13">${xml(design.caption.slice(0,70))}</text><text x="40" y="513" fill="${accent}" font-family="sans-serif" font-size="12">Création personnelle · ${xml(HUB_SERVICE_PATTERNS[design.pattern])}</text></svg>`;
}
export function hubTextileAvatarPatch(input){const design=normalizeHubDesign(input);return {fabricColor:design.baseColor,accentColor:design.accentColor,pattern:design.pattern,style:design.style};}
