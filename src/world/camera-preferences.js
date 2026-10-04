const KEY='3b-world-camera-sensitivity';
export function cameraSensitivity(value){const n=Number(value);return Number.isFinite(n)?Math.max(.5,Math.min(2,n)):1;}
export function loadCameraSensitivity(){try{return cameraSensitivity(globalThis.localStorage?.getItem(KEY)??1);}catch{return 1;}}
export function saveCameraSensitivity(value){const next=cameraSensitivity(value);try{globalThis.localStorage?.setItem(KEY,String(next));}catch{}return next;}
