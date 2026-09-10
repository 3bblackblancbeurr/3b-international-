export const SPORTS=['Tous','Football','Basket','Tennis','Rugby','Cyclisme','Formule 1','Athlétisme','Natation','Sports de combat','Handball','Volley','Golf','Cricket','Sports d’hiver','Autres'];
export const FEEDS=[{url:'https://www.france24.com/fr/sports/rss',name:'France 24',lang:'fr',host:'france24.com'},{url:'https://feeds.bbci.co.uk/sport/rss.xml',name:'BBC Sport',lang:'en',host:'bbc.co.uk'}];
const tags=[['Football',/football|soccer|ligue 1|premier league|champions league/i],['Basket',/basket|nba|wnba/i],['Tennis',/tennis|wimbledon|roland.garros|us open/i],['Rugby',/rugby|six nations|top 14/i],['Cyclisme',/cyclis|cycling|vuelta|tour de france|giro/i],['Formule 1',/formula|formule|f1\b|grand prix/i],['Athlétisme',/athl[eé]ti|marathon|sprint/i],['Natation',/swimming|natation|swim/i],['Sports de combat',/boxe|boxing|mma|ufc|judo|karat/i],['Handball',/handball/i],['Volley',/volley/i],['Golf',/golf|ryder cup/i],['Cricket',/cricket/i],['Sports d’hiver',/ski|snowboard|biathlon|winter/i]];
export function decodeXML(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(amp|lt|gt|quot|apos);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[n])).trim();}
export function parseFeed(xml,feed,now=Date.now()){
 const get=(item,name)=>decodeXML(item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>','i'))?.[1]||'');
 return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,100).flatMap(([,item])=>{
  const title=get(item,'title'),link=get(item,'link'),date=Date.parse(get(item,'pubDate'));let u;try{u=new URL(link);}catch{return[];}
  const hostAllowed=u.hostname===feed.host||u.hostname.endsWith('.'+feed.host)||(feed.name==='BBC Sport'&&(u.hostname==='bbc.com'||u.hostname.endsWith('.bbc.com')));
  if(!title||u.protocol!=='https:'||!hostAllowed||u.username||u.password||!Number.isFinite(date)||date>now+300000||date<now-7*86400000)return[];
  const category=tags.find(([,regex])=>regex.test(title+' '+get(item,'category')+' '+u.pathname))?.[0]||'Autres';
  return[{title:title.slice(0,300),url:u.href,publishedAt:new Date(date).toISOString(),source:feed.name,language:feed.lang,category}];
 });
}
export async function fetchSports(fetcher=fetch){
 const settled=await Promise.allSettled(FEEDS.map(async feed=>{const r=await fetcher(feed.url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/rss+xml,application/xml,text/xml'}});if(!r.ok)throw Error('Flux indisponible');const xml=await r.text();if(xml.length>2000000)throw Error('Flux volumineux');const items=parseFeed(xml,feed);if(!items.length)throw Error('Flux vide');return items;}));
 const articles=[...new Map(settled.flatMap(r=>r.status==='fulfilled'?r.value:[]).map(a=>[a.url,a])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,100);
 if(!articles.length)throw Error('Les sources sportives sont momentanément indisponibles.');
 return{articles,updatedAt:new Date().toISOString(),sources:FEEDS.map((f,i)=>({name:f.name,available:settled[i].status==='fulfilled'})),partial:settled.some(r=>r.status==='rejected')};
}

