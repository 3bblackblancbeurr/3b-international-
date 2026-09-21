export const CONTROL_ACTIONS=Object.freeze({
 moveForward:{label:'Avancer',default:['z','w','arrowup']},
 moveBackward:{label:'Reculer',default:['s','arrowdown']},
 moveLeft:{label:'Aller à gauche',default:['q','a','arrowleft']},
 moveRight:{label:'Aller à droite',default:['d','arrowright']},
 interact:{label:'Interagir',default:['e']},
 sprint:{label:'Courir',default:['shift']},
 cameraToggle:{label:'Changer de vue',default:['c']},
});

export const CONTROL_KEY_CHOICES=Object.freeze([
 'z','q','s','d','w','a','e','f','r','c','x','v','g','shift',' ','arrowup','arrowdown','arrowleft','arrowright',
]);

const cleanKey=key=>typeof key==='string'?key.toLowerCase():null;

export function defaultControlBindings(){
 return Object.fromEntries(Object.entries(CONTROL_ACTIONS).map(([id,rule])=>[id,[...rule.default]]));
}

export function normalizeControlBindings(input={}){
 const defaults=defaultControlBindings(),out={};
 for(const [id,rule] of Object.entries(CONTROL_ACTIONS)){
  const raw=Array.isArray(input[id])?input[id]:typeof input[id]==='string'?[input[id]]:defaults[id];
  const keys=[...new Set(raw.map(cleanKey).filter(key=>CONTROL_KEY_CHOICES.includes(key)))].slice(0,3);
  out[id]=keys.length?keys:[...rule.default];
 }
 return out;
}

export function loadControlBindings(storage=globalThis.localStorage){
 try{return normalizeControlBindings(JSON.parse(storage?.getItem?.('3b-world-controls')||'{}'));}catch{return defaultControlBindings();}
}

export function saveControlBindings(bindings,storage=globalThis.localStorage){
 const normalized=normalizeControlBindings(bindings);try{storage?.setItem?.('3b-world-controls',JSON.stringify(normalized));}catch{}return normalized;
}

export function setPrimaryControl(bindings,action,key){
 if(!CONTROL_ACTIONS[action]||!CONTROL_KEY_CHOICES.includes(cleanKey(key)))return normalizeControlBindings(bindings);
 return normalizeControlBindings({...bindings,[action]:[cleanKey(key)]});
}

export function controlMatches(bindings,action,key){
 return !!bindings?.[action]?.includes(cleanKey(key));
}

export function actionHeld(bindings,action,keys){
 return bindings?.[action]?.some(key=>keys.has(key))||false;
}

export function controlLabel(bindings,action){
 const key=bindings?.[action]?.[0]||CONTROL_ACTIONS[action]?.default?.[0]||'';
 return ({shift:'Maj',' ':'Espace',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→'}[key]||key.toUpperCase());
}

export function validateControlBindings(bindings=defaultControlBindings()){
 const normalized=normalizeControlBindings(bindings);
 for(const id of Object.keys(CONTROL_ACTIONS))if(!normalized[id]?.length)throw Error('Action sans contrôle : '+id);
 return true;
}
