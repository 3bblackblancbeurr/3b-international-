export const PANEL_TYPES=['notes','tasks','planning','budget','documents'];
export const SPACE_ACTIONS=['space_create','panel_add','panel_resize','panel_duplicate','panel_first','task_add'];
export const TEMPLATES={blank:[],brand:['planning','tasks','budget','notes','documents'],week:['planning','tasks','notes'],research:['notes','documents','tasks']};
const txt=(s,n=160)=>typeof s==='string'?s.slice(0,n):'';
const bounded=(n,min,max,fallback)=>Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback;
export const newId=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export function newPanel(kind,id=newId()){return {id,kind,title:({notes:'Notes',tasks:'Priorités',planning:'Planning',budget:'Budget',documents:'Documents'})[kind]||'Notes',width:6,height:300,text:'',rows:[]};}
export function newSpace(name='Mon espace',template='blank'){return {id:newId(),name:txt(name,80)||'Mon espace',panels:(TEMPLATES[template]||[]).map(k=>newPanel(k)),tasks:[]};}
export function initialSpaces(){const space=newSpace('Mon premier espace','week');return {version:1,active:space.id,spaces:[space],messages:[],journal:[]};}
export function normalizeSpaces(raw){
 if(!raw||!Array.isArray(raw.spaces)||!raw.spaces.length)return initialSpaces();
 const seen=new Set(),spaces=raw.spaces.slice(0,8).map(s=>{
  let id=txt(s?.id,80);if(!id||seen.has(id))id=newId();seen.add(id);
  const panelIds=new Set();
  const panels=(Array.isArray(s?.panels)?s.panels:[]).slice(0,16).filter(p=>p&&PANEL_TYPES.includes(p.kind)).map(p=>{
   let pid=txt(p.id,80);if(!pid||panelIds.has(pid))pid=newId();panelIds.add(pid);
   return {id:pid,kind:p.kind,title:txt(p.title,80)||p.kind,width:bounded(p.width,3,12,6),height:bounded(p.height,200,800,300),text:txt(p.text,10000),rows:(Array.isArray(p.rows)?p.rows:[]).slice(0,100).map(r=>({id:txt(r?.id,80)||newId(),label:txt(r?.label,200),amount:Number.isFinite(r?.amount)?Math.max(-1e9,Math.min(1e9,r.amount)):0,url:safeLink(r?.url)}))};
  });
  return {id,name:txt(s?.name,80)||'Mon espace',panels,tasks:(Array.isArray(s?.tasks)?s.tasks:[]).slice(0,100).map(t=>({id:txt(t?.id,80)||newId(),text:txt(t?.text,300),done:t?.done===true,due:/^\d{4}-\d{2}-\d{2}$/.test(t?.due||'')?t.due:''}))};
 });
 return {version:1,active:spaces.some(s=>s.id===raw.active)?raw.active:spaces[0].id,spaces,messages:normalizeMessages(raw.messages),journal:(Array.isArray(raw.journal)?raw.journal:[]).slice(-40).map(j=>({text:txt(j?.text,250),at:txt(j?.at,40)}))};
}
export function safeLink(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href.slice(0,1500):'';}catch{return '';}}
export function normalizeMessages(value){return (Array.isArray(value)?value:[]).slice(-12).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').map(m=>({role:m.role,text:m.text.slice(0,4000)}));}
export function spaceActionValid(a){
 if(a?.type==='space_create')return typeof a.name==='string'&&a.name.length>0&&a.name.length<=80&&Object.keys(TEMPLATES).includes(a.template);
 if(a?.type==='panel_add')return PANEL_TYPES.includes(a.kind);
 if(a?.type==='panel_resize')return typeof a.id==='string'&&Number.isInteger(a.width)&&a.width>=3&&a.width<=12;
 if(['panel_duplicate','panel_first'].includes(a?.type))return typeof a.id==='string'&&a.id.length>0&&a.id.length<=80;
 if(a?.type==='task_add')return typeof a.text==='string'&&a.text.length>0&&a.text.length<=300&&(!a.due||/^\d{4}-\d{2}-\d{2}$/.test(a.due));
 return false;
}
export function applySpaceActions(raw,actions){
 const next=normalizeSpaces(raw);
 for(const a of actions){
  if(!spaceActionValid(a))continue;
  if(a.type==='space_create'&&next.spaces.length>=8)throw Error('Limite de 8 espaces atteinte. Retirez un espace avant d’en créer un autre.');
  if(a.type==='space_create'&&next.spaces.length<8){const space=newSpace(a.name,a.template);next.spaces.push(space);next.active=space.id;}
  const current=next.spaces.find(s=>s.id===next.active);
  if(['panel_add','panel_duplicate'].includes(a.type)&&current.panels.length>=16)throw Error('Limite de 16 panneaux atteinte dans cet espace.');
  if(a.type==='task_add'&&current.tasks.length>=100)throw Error('Limite de 100 tâches atteinte dans cet espace.');
  if(['panel_resize','panel_duplicate','panel_first'].includes(a.type)&&!current.panels.some(p=>p.id===a.id))throw Error('Ce panneau n’existe plus. Reformulez la demande sur l’espace actuel.');
  if(a.type==='panel_duplicate'){
   const source=current.panels.find(p=>p.id===a.id),copy=structuredClone(source);copy.id=newId();copy.title=(source.title+' · copie').slice(0,80);copy.rows=copy.rows.map(row=>({...row,id:newId()}));current.panels.splice(current.panels.indexOf(source)+1,0,copy);
  }
  if(a.type==='panel_first'){const index=current.panels.findIndex(p=>p.id===a.id);current.panels.unshift(current.panels.splice(index,1)[0]);}
  if(a.type==='panel_add'&&current.panels.length<16)current.panels.push(newPanel(a.kind));
  if(a.type==='panel_resize'){const panel=current.panels.find(p=>p.id===a.id);if(panel)panel.width=a.width;}
  if(a.type==='task_add'&&current.tasks.length<100)current.tasks.push({id:newId(),text:a.text,done:false,due:a.due||''});
 }
 return next;
}
export function parseSpaceCommand(text){
 const q=text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const template=q.match(/^espace (marque|semaine|recherche)$/);
 if(template)return [{type:'space_create',name:({marque:'Lancement de marque',semaine:'Ma semaine',recherche:'Recherche'})[template[1]],template:({marque:'brand',semaine:'week',recherche:'research'})[template[1]]}];
 const panel=q.match(/^(?:ajoute|ouvre) (?:un |le )?(?:module |panneau )?(notes|taches|planning|budget|documents)$/);
 if(panel)return [{type:'panel_add',kind:panel[1]==='taches'?'tasks':panel[1]}];
 const task=text.trim().match(/^ajoute une tâche\s*:\s*(.{1,300})$/i);
 return task?[{type:'task_add',text:task[1]}]:null;
}
// Exact, contextual local controls. Ambiguous targets must never be guessed.
export function parsePanelCommand(text,workspace){
 const fold=value=>String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const q=fold(text).replace(/[.!]$/,'').trim();
 if(/\b(non|ne|pas|sans|jamais)\b/.test(q))return null;
 const match=q.match(/^(agrandis|reduis|duplique|mets en premier) (?:le |la |les |mon |mes )?(.+)$/);
 if(!match)return null;
 const active=workspace?.spaces?.find(s=>s.id===workspace.active);if(!active)return null;
 const aliases={planning:'planning',calendrier:'planning',budget:'budget',notes:'notes',note:'notes',taches:'tasks',priorites:'tasks',documents:'documents'};
 const exact=active.panels.filter(p=>fold(p.title)===match[2]);
 const candidates=exact.length?exact:active.panels.filter(p=>p.kind===aliases[match[2]]);
 if(!candidates.length)throw Error('Aucun panneau « '+match[2]+' » dans cet espace. Ajoutez-le ou utilisez son titre exact.');
 if(candidates.length>1)throw Error('Plusieurs panneaux portent ce nom. Donnez-leur des titres distincts, puis précisez le titre souhaité.');
 const panel=candidates[0];
 if(match[1]==='duplique')return [{type:'panel_duplicate',id:panel.id}];
 if(match[1]==='mets en premier')return [{type:'panel_first',id:panel.id}];
 return [{type:'panel_resize',id:panel.id,width:match[1]==='agrandis'?12:6}];
}
