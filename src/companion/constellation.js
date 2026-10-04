export const CONSTELLATION_KEY='threeb_companion_constellation_v1';
export const STAR_POSITIONS=Object.freeze([[50,9],[79,20],[91,49],[76,78],[50,91],[21,78],[9,49],[23,20]]);
export function sanitizeConstellation(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(id=>Number.isInteger(id)&&id>=0&&id<8))].slice(0,8);
}
export function selectConstellationStar(current,id){
  const safe=sanitizeConstellation(current);
  if(!Number.isInteger(id)||id<0||id>=8||safe.includes(id))return safe;
  return [...safe,id];
}
export function readConstellation(storage){try{return sanitizeConstellation(JSON.parse(storage.getItem(CONSTELLATION_KEY)||'[]'));}catch{return [];}}
