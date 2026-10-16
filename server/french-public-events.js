/**
 * OpenAgenda RSS — agenda published by the French Ministry of Culture.
 * Public upcoming events. No API secret, account, cookies or GPS needed.
 * Attribution: Ministère de la Culture via OpenAgenda, Licence Ouverte 2.0.
 * https://openagenda.com/fr/culture
 */
const SOURCE = 'https://openagenda.com/agendas/86244142/events.v2.rss?relative%5B0%5D=current&relative%5B1%5D=upcoming';
const decode = input => String(input || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]*>/g,'')
  .replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,code)=>{
    const map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    if(code.startsWith('#')){
      const hex=code[1]?.toLowerCase()==='x',v=parseInt(code.slice(hex?2:1),hex?16:10);
      return Number.isInteger(v)&&v>0&&v<=0x10ffff?String.fromCodePoint(v):'';
    }
    return map[code.toLowerCase()]||'';
  }).replace(/\s+/g,' ').trim();
function field(block,name){
  const rex=new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i');
  return decode(rex.exec(block)?.[1]||'');
}
const validTime = v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'Z'));
const validUrl = value => {
  try{const u=new URL(value);return u.protocol==='https:' && u.hostname==='openagenda.com' && /^\/[a-z0-9-]+\/events\//i.test(u.pathname) ? u.href : '';}catch{return '';}
};
export function parseFrenchPublicEvents(xml,now=new Date()){
  const items=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  const today=new Date(now).toISOString().slice(0,10),dedup=new Set(),events=[];
  for(const item of items.slice(0,35)){
    const title=field(item,'title').slice(0,160);
    const start=field(item,'ev:startdate');
    const end=field(item,'ev:enddate');
    const location=field(item,'ev:location').slice(0,180);
    const link=validUrl(field(item,'link'));
    const published=Date.parse(field(item,'pubDate'));
    if(!title||!validTime(start)||start.slice(0,10)<today||!link||dedup.has(link))continue;
    dedup.add(link);
    events.push({title,starts_local:start,ends_local:validTime(end)?end:null,
      location,link,published:Number.isFinite(published)?new Date(published).toISOString():null,
      source:'Ministère de la Culture · OpenAgenda'});
  }
  return events.sort((a,b)=>a.starts_local.localeCompare(b.starts_local)).slice(0,12);
}
function response(body,status=200,cache='no-store'){
  return new Response(JSON.stringify(body),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':cache,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
  }});
}
export async function fetchFrenchPublicEvents(request){
  if(request.method!=='GET') return response({error:'Méthode non autorisée'},405);
  try{
    const result=await fetch(SOURCE,{
      headers:{Accept:'application/rss+xml, application/xml, text/xml'},
      redirect:'error',signal:AbortSignal.timeout(8000),
    });
    if(!result.ok) throw new Error('unavailable');
    const size=Number(result.headers.get('content-length')||0);
    if(size>900000)throw new Error('oversize');
    const rss=await result.text();
    if(rss.length>900000||!/<rss\b/i.test(rss))throw new Error('invalid RSS');
    return response({items:parseFrenchPublicEvents(rss),source:'Ministère de la Culture · OpenAgenda',
      license:'Licence Ouverte 2.0',license_url:'https://www.etalab.gouv.fr/licence-ouverte-open-licence/',
      queried_at:new Date().toISOString()},200,'public, s-maxage=900, stale-while-revalidate=1800');
  }catch{
    return response({error:'Agenda officiel momentanément inaccessible. Consulte OpenAgenda.'},503);
  }
}
