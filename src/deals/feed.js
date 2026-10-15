export const CATEGORIES = Object.freeze([
  {id:'immobilier',label:'Logement',symbol:'⌂',description:'Locations, accès au logement et aides utiles.'},
  {id:'alimentation',label:'Alimentation',symbol:'◒',description:'Manger mieux en dépensant moins.'},
  {id:'sport',label:'Sport',symbol:'↗',description:'Équipement et activités accessibles.'},
  {id:'transport',label:'Transport',symbol:'⇄',description:'Bouger à petit prix.'},
  {id:'loisirs',label:'Loisirs',symbol:'✦',description:'Sorties, culture et découvertes.'},
  {id:'maison',label:'Maison & numérique',symbol:'▤',description:'Les achats utiles du quotidien.'},
]);
export const MAX_AGE_MS = 30 * 60 * 60 * 1000;
export function safeSource(value){
  try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password ? u.href : null; } catch {return null;}
}
export function activeDeals(feed, now=Date.now()){
  const ids=new Set(), urls=new Set(), counts={};
  return (Array.isArray(feed?.deals)?feed.deals:[]).filter(d=>{
    if(!d || !CATEGORIES.some(c=>c.id===d.category) || !d.id || ids.has(d.id))return false;
    const verified=Date.parse(d.verifiedAt), expires=d.expiresAt?Date.parse(d.expiresAt):verified+MAX_AGE_MS, starts=d.startsAt?Date.parse(d.startsAt):verified;
    const url=safeSource(d.url);
    if(!url || urls.has(url) || !Number.isFinite(verified) || !Number.isFinite(expires) || !Number.isFinite(starts) || starts>now || verified>now || now-verified>=MAX_AGE_MS || expires<=now || expires<=verified)return false;
    if(!['title','price','benefit','conditions','location','source'].every(k=>typeof d[k]==='string'&&d[k].trim()))return false;
    if((counts[d.category]||0)>=3)return false;
    ids.add(d.id);urls.add(url);counts[d.category]=(counts[d.category]||0)+1;return true;
  });
}
