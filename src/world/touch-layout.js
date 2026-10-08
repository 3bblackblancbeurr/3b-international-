/** Independent mobile positions; percentages are resolved against the actual game canvas. */
export const DEFAULT_TOUCH_LAYOUT=Object.freeze({
 joystick:{x:13,y:75},
 jump:{x:91,y:65},
 power:{x:82,y:70},
 dodge:{x:76,y:88},
 guard:{x:84,y:88},
 strike:{x:92,y:88},
});
export const TOUCH_LAYOUT_KEY='3b-world-touch-layout-v1';
const clamp=(value,defaultValue,min,max)=>Number.isFinite(Number(value))&&value!==null&&value!==''?Math.max(min,Math.min(max,Number(value))):defaultValue;
export function normalizeTouchLayout(value){
 return Object.fromEntries(Object.entries(DEFAULT_TOUCH_LAYOUT).map(([id,position])=>[
  id,{x:clamp(value?.[id]?.x,position.x,7,93),y:clamp(value?.[id]?.y,position.y,12,92)}
 ]));
}
export function loadTouchLayout(){
 try{return normalizeTouchLayout(JSON.parse(localStorage.getItem(TOUCH_LAYOUT_KEY)||'null'));}catch{return normalizeTouchLayout(null);}
}
export function saveTouchLayout(layout){
 const normalized=normalizeTouchLayout(layout);
 try{localStorage.setItem(TOUCH_LAYOUT_KEY,JSON.stringify(normalized));}catch{}
 return normalized;
}
export function resetTouchLayout(){return normalizeTouchLayout(null);}
