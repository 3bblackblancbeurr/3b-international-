export const DEFAULT_HUD=Object.freeze({map:true,missions:true,companion:true,details:true,interactions:true});
export function readHudPreferences(storage=globalThis.localStorage){
 try{const raw=JSON.parse(storage?.getItem('3b-world-hud')||'{}');return Object.fromEntries(Object.entries(DEFAULT_HUD).map(([id,value])=>[id,typeof raw?.[id]==='boolean'?raw[id]:value]));}catch{return {...DEFAULT_HUD};}
}
export function writeHudPreferences(value,storage=globalThis.localStorage){try{storage?.setItem('3b-world-hud',JSON.stringify(value));}catch{}return value;}
