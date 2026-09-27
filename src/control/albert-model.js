export const ALBERT_MODULES=['brief','alerts','nexus','integrations','ai','traffic','dev','health','security','projects'];
export const ALBERT_THEMES=['cyan','violet','gold'];
// Shared server/client contract: no scripts, URLs, permissions or PC commands.
export function validateAlbertActions(value){
 if(!Array.isArray(value)||value.length>12)return [];
 return value.filter(a=>{
  if(!a||typeof a!=='object')return false;
  if(a.type==='module')return ALBERT_MODULES.includes(a.id)&&typeof a.visible==='boolean';
  if(a.type==='theme')return ALBERT_THEMES.includes(a.value);
  if(['focus','compact','motion'].includes(a.type))return typeof a.value==='boolean';
  return false;
 }).map(a=>a.type==='module'?{type:a.type,id:a.id,visible:a.visible}:{type:a.type,value:a.value});
}
export function parseAlbertLocal(text){
 const q=String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 const neg=/\b(non|ne|pas|sans|jamais)\b/.test(q);
 if(neg)return null;
 if(/^(mode |active le mode |passe en mode )focus$/.test(q))return [{type:'focus',value:true}];
 if(/^(quitte|desactive) (le )?(mode )?focus$/.test(q))return [{type:'focus',value:false}];
 if(/^(affiche tout|restaure les modules)$/.test(q))return ALBERT_MODULES.map(id=>({type:'module',id,visible:true}));
 const theme=q.match(/^(ambiance|theme|couleur) (cyan|violet|or|gold)$/);
 if(theme)return [{type:'theme',value:theme[2]==='or'?'gold':theme[2]}];
 if(q==='mode compact')return [{type:'compact',value:true}];
 if(q==='mode confortable')return [{type:'compact',value:false}];
 if(q==='reduis les animations')return [{type:'motion',value:false}];
 if(q==='active les animations')return [{type:'motion',value:true}];
 const aliases={brief:'brief',alertes:'alerts',nexus:'nexus',integrations:'integrations',ia:'ai',radar:'traffic',developpement:'dev',sante:'health',securite:'security',projets:'projects'};
 const module=q.match(/^(affiche|masque|ouvre) (?:le |les |la |module )?(.+)$/);
 return module&&aliases[module[2]]?[{type:'module',id:aliases[module[2]],visible:module[1]!=='masque'}]:null;
}
