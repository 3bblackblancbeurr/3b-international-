export const UNIVERSAL_KEY='threeb_universal_prefs_v1';
export const UNIVERSAL_DEFAULTS=Object.freeze({largeText:false,contrast:false,calm:false,simple:false});
export function sanitizeUniversal(input){
 const safe={...UNIVERSAL_DEFAULTS};
 for(const key of Object.keys(safe))safe[key]=input?.[key]===true;
 return safe;
}
export function readUniversal(storage){
 try{return sanitizeUniversal(JSON.parse(storage.getItem(UNIVERSAL_KEY)||'null'))}
 catch{return {...UNIVERSAL_DEFAULTS}}
}
export function applyUniversal(settings,root){
 if(!root)return;
 const values=sanitizeUniversal(settings);
 root.dataset.threebLarge=values.largeText?'true':'false';
 root.dataset.threebContrast=values.contrast?'true':'false';
 root.dataset.threebCalm=values.calm?'true':'false';
 root.dataset.threebSimple=values.simple?'true':'false';
}
export function saveUniversal(settings,storage,root){
 const values=sanitizeUniversal(settings);
 applyUniversal(values,root);
 try{storage.setItem(UNIVERSAL_KEY,JSON.stringify(values))}catch{/* Session-only preferences still work. */}
 return values;
}
export function initialiseUniversal(){
 if(typeof window==='undefined'||typeof document==='undefined')return()=>{};
 const sync=()=>applyUniversal(readUniversal(window.localStorage),document.documentElement);
 sync();
 const onStorage=event=>{if(event.key===UNIVERSAL_KEY)sync()};
 window.addEventListener('storage',onStorage);
 return()=>window.removeEventListener('storage',onStorage);
}
