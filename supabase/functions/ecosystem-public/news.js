// Fixed publisher feeds only: the public request never supplies a URL.
// No article scraping, remote images, DTD resolution or publisher HTML rendering.
export const NEWS_COUNTRIES=Object.freeze({FR:['France','francais','francaise'],DZ:['Algerie','algerien'],MA:['Maroc','marocain'],TN:['Tunisie','tunisien'],ES:['Espagne','espagnol'],IT:['Italie','italien'],TR:['Turquie','turc'],EE:['Estonie','estonien'],GB:['Royaume Uni','Royaume-Uni','britannique','United Kingdom','Britain'],DE:['Allemagne','allemand','Germany'],BE:['Belgique','belge','Belgium'],CH:['Suisse','Swiss','Switzerland'],PT:['Portugal','portugais'],NL:['Pays Bas','Pays-Bas','Netherlands','Dutch'],PL:['Pologne','Poland','Polish'],GR:['Grece','Greece','Greek'],IE:['Irlande','Ireland','Irish'],US:['Etats Unis','Etats-Unis','United States','American','Trump'],CA:['Canada','canadien','Canadian'],BR:['Bresil','Brazil','brasilien'],MX:['Mexique','Mexico','Mexican'],JP:['Japon','Japan','Japanese'],KR:['Coree du Sud','South Korea'],IN:['Inde','India','Indian'],CN:['Chine','China','Chinese'],AU:['Australie','Australia','Australian'],NZ:['Nouvelle Zelande','New Zealand'],ZA:['Afrique du Sud','South Africa'],SN:['Senegal','senegalais'],CI:['Cote d Ivoire','Cote d’Ivoire','Ivory Coast'],EG:['Egypte','Egypt','Egyptian'],AE:['Emirats arabes unis','Emirats','Dubai','UAE'],SA:['Arabie saoudite','Saudi Arabia','Saudi'],QA:['Qatar'],SE:['Suede','Sweden','Swedish'],NO:['Norvege','Norway','Norwegian'],FI:['Finlande','Finland','Finnish']});
export const NEWS_TOPICS=Object.freeze({all:'Tous les sujets',public:'Droits & vie pratique',politics:'Politique',economy:'Économie',society:'Société',environment:'Environnement',science:'Sciences & numérique',culture:'Culture',sport:'Sport',world:'International'});
const publicHosts=['www.service-public.gouv.fr','entreprendre.service-public.gouv.fr','www.service-public.fr','entreprendre.service-public.fr'];
export const NEWS_FEEDS=Object.freeze([
 {id:'public-fr',name:'Service Public / DILA',url:'https://www.service-public.gouv.fr/abonnements/rss/actu-actualites-particuliers.rss',home:'https://www.service-public.gouv.fr/',hosts:publicHosts,language:'fr',country:'FR',topic:'public',maxAgeDays:30,excerpt:'rss-summary',rights:'https://entreprendre.service-public.gouv.fr/P10008'},
 {id:'public-pro',name:'Service Public Entreprendre / DILA',url:'https://www.service-public.gouv.fr/abonnements/rss/actu-actu-pro.rss',home:'https://entreprendre.service-public.gouv.fr/',hosts:publicHosts,language:'fr',country:'FR',topic:'economy',maxAgeDays:30,excerpt:'rss-summary',rights:'https://www.service-public.gouv.fr/P10004'},
 {id:'f24-fr',name:'France 24',url:'https://www.france24.com/fr/france/rss',home:'https://www.france24.com/fr/',hosts:['www.france24.com','france24.com'],language:'fr',country:'FR',maxAgeDays:7,excerpt:'headline-only'},
 {id:'f24-world',name:'France 24',url:'https://www.france24.com/fr/rss',home:'https://www.france24.com/fr/',hosts:['www.france24.com','france24.com'],language:'fr',maxAgeDays:7,excerpt:'headline-only'},
 {id:'rfi-world',name:'RFI',url:'https://www.rfi.fr/fr/rss',home:'https://www.rfi.fr/fr/',hosts:['www.rfi.fr','rfi.fr'],language:'fr',maxAgeDays:7,excerpt:'headline-only'},
 {id:'bbc-world',name:'BBC News',url:'https://feeds.bbci.co.uk/news/world/rss.xml',home:'https://www.bbc.com/news',hosts:['www.bbc.com','www.bbc.co.uk','bbc.com','bbc.co.uk'],language:'en',maxAgeDays:7,excerpt:'headline-only'},
].map(feed=>Object.freeze({...feed,hosts:Object.freeze([...feed.hosts])})));
export const NEWS_MAX_BYTES=600_000;
export const NEWS_CACHE_MS=300_000;
export const NEWS_STALE_MS=21_600_000;
const MAX_ITEMS_PER_FEED=45,MAX_ARTICLES=180;
export class NewsFailure extends Error{constructor(status,message){super(message);this.name='NewsFailure';this.status=status;}}
export function normalizeNewsText(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function plain(value,max=2000){return String(value??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|amp|lt|gt|quot|apos|nbsp);/gi,(_,key)=>{if(key[0]!=='#')return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[key.toLowerCase()]||'';const hex=key[1]?.toLowerCase()==='x',n=parseInt(key.slice(hex?2:1),hex?16:10);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';}).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function tag(block,name){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('<'+escaped+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+escaped+'\\s*>','i').exec(block)?.[1]||'';}
function attribute(block,name){return new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i').exec(block)?.[1]||'';}
export function safeNewsArticleUrl(input,feed){
 try{const url=new URL(plain(input,2000));if(url.protocol!=='https:'||url.port||url.username||url.password||!feed.hosts.includes(url.hostname)||url.href.length>1600)return null;url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid|at_)$/i.test(key))url.searchParams.delete(key);return url.href;}catch{return null;}
}
function articleId(url){let hash=2166136261;for(const char of url)hash=Math.imul(hash^char.charCodeAt(0),16777619);return 'news-'+(hash>>>0).toString(36);}
function containsPhrase(text,phrase){return (' '+text+' ').includes(' '+normalizeNewsText(phrase)+' ');}
function countriesFor(context,feed){return Object.entries(NEWS_COUNTRIES).filter(([id,aliases])=>id===feed.country||aliases.some(alias=>containsPhrase(context,alias))).map(([id])=>id);}
function topicFor(text,feed){if(feed.topic)return feed.topic;const rules=[['sport',/\b(sport|football|rugby|tennis|basket|nba|olympi|fifa)\w*/],['environment',/\b(climat|climate|ecologie|environnement|incendie|inondation|pollution)\w*/],['science',/\b(science|technolog|intelligence artificielle|numerique|cyber|space|spatial)\w*/],['culture',/\b(culture|cinema|film|festival|musique|music|livre|artiste)\w*/],['economy',/\b(economie|economy|inflation|emploi|entreprise|budget|impot|finance|bank|trade)\w*/],['politics',/\b(election|politique|parlement|president|gouvernement|minister|vote)\w*/],['society',/\b(societe|sante|health|ecole|education|justice|police|logement)\w*/]];return rules.find(([,pattern])=>pattern.test(text))?.[0]||'world';}
function validPublishedDate(value){
 const iso=/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/i.exec(value);
 const rfc=/^(?:[a-z]{3},?\s+)?(\d{1,2})\s+([a-z]{3})\s+(\d{4})\s+\d{2}:\d{2}(?::\d{2})?\s+(?:GMT|UTC|[+-]\d{4})$/i.exec(value);
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const year=iso?Number(iso[1]):rfc?Number(rfc[3]):0,month=iso?Number(iso[2]):rfc?months.indexOf(rfc[2].toLowerCase())+1:0,day=iso?Number(iso[3]):rfc?Number(rfc[1]):0;
 if(year<2000||month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())return NaN;return Date.parse(value);
}
export function parseNewsFeed(xml,feed,now=Date.now()){
 if(typeof xml!=='string'||new TextEncoder().encode(xml).length>NEWS_MAX_BYTES||/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)||!/<(?:rss|feed)\b/i.test(xml)||!/<\/(?:rss|feed)\s*>\s*$/i.test(xml))throw new NewsFailure(502,'Format du flux refusé.');
 feed=NEWS_FEEDS.find(allowed=>allowed.id===feed?.id&&allowed.url===feed?.url);if(!feed)throw new NewsFailure(400,'Source inconnue.');
 const blocks=[...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi)].slice(0,MAX_ITEMS_PER_FEED),articles=[];
 for(const [,kind,block] of blocks){
  const title=plain(tag(block,'title'),260),atomLinks=kind.toLowerCase()==='entry'?[...block.matchAll(/<link\b[^>]*\/?\s*>/gi)].map(match=>match[0]):[];
  const rawUrl=kind.toLowerCase()==='entry'?attribute(atomLinks.find(link=>!attribute(link,'rel')||attribute(link,'rel')==='alternate')||'','href'):tag(block,'link');
  const url=safeNewsArticleUrl(rawUrl,feed),dateRaw=plain(tag(block,'pubDate')||tag(block,'published')||tag(block,'dc:date')||tag(block,'updated'),100),published=validPublishedDate(dateRaw);
  if(!title||!url||!dateRaw||!Number.isFinite(published)||published>now+300_000||published<now-feed.maxAgeDays*86400_000)continue;
  const rawSummary=plain(tag(block,'description')||tag(block,'summary'),1600),context=normalizeNewsText(title+' '+rawSummary+' '+plain(tag(block,'category'),200));
  const summary=feed.excerpt==='rss-summary'?rawSummary.slice(0,420)+(rawSummary.length>420?'…':''):'';
  articles.push({id:articleId(url),title,url,publishedAt:new Date(published).toISOString(),sourceId:feed.id,source:feed.name,sourceUrl:feed.home,language:feed.language,countries:countriesFor(context,feed),topic:topicFor(context,feed),summary,excerptPolicy:feed.excerpt,rightsUrl:feed.rights||null});
 }
 return articles;
}
export function aggregateNews(rows){
 const byUrl=new Map(),byTitle=new Map();
 for(const item of rows.flat()){const previous=byUrl.get(item.url);if(!previous||(!previous.summary&&item.summary))byUrl.set(item.url,item);}
 for(const item of byUrl.values()){const key=normalizeNewsText(item.title),previous=byTitle.get(key);if(!previous||(!previous.summary&&item.summary))byTitle.set(key,item);}
 return [...byTitle.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,MAX_ARTICLES);
}
async function boundedXml(response){
 const declared=Number(response.headers.get('content-length')||0);if(declared>NEWS_MAX_BYTES)throw Error('Flux trop volumineux.');
 const type=response.headers.get('content-type')||'';if(!/(?:xml|rss|atom)/i.test(type))throw Error('Type de flux refusé.');
 if(!response.body)throw Error('Flux vide.');const reader=response.body.getReader(),chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>NEWS_MAX_BYTES){await reader.cancel();throw Error('Flux trop volumineux.');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const content=new Uint8Array(bytes);let offset=0;for(const part of chunks){content.set(part,offset);offset+=part.byteLength;}return new TextDecoder('utf-8',{fatal:true}).decode(content);
}
export function createNewsService({fetcher=globalThis.fetch,now=Date.now}={}){
 let cached=null,inflight=null,lastAttempt=0;
 async function refresh(){
  const stamp=now();lastAttempt=stamp;
  const settled=await Promise.allSettled(NEWS_FEEDS.map(async feed=>{
   // URL is a code constant, redirects forbidden: no user-provided fetch target.
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
   try{const response=await fetcher(feed.url,{redirect:'error',signal:controller.signal,headers:{Accept:'application/rss+xml,application/atom+xml,application/xml,text/xml','User-Agent':'3B-International/1.0 (+https://3b-international.vercel.app)'}});if(!response.ok||response.redirected)throw Error('Source indisponible.');return parseNewsFeed(await boundedXml(response),feed,stamp);}finally{clearTimeout(timer);}
  }));
  const sources=NEWS_FEEDS.map((feed,index)=>({id:feed.id,name:feed.name,url:feed.home,feedUrl:feed.url,available:settled[index].status==='fulfilled',count:settled[index].status==='fulfilled'?settled[index].value.length:0,language:feed.language,excerptPolicy:feed.excerpt,rightsUrl:feed.rights||null}));
  if(!settled.some(result=>result.status==='fulfilled'))throw new NewsFailure(503,'Les sources d’actualités sont momentanément indisponibles.');
  cached={version:1,articles:aggregateNews(settled.flatMap(result=>result.status==='fulfilled'?[result.value]:[])),sources,retrievedAt:new Date(stamp).toISOString(),partial:settled.some(result=>result.status==='rejected')};return cached;
 }
 return {async get({country='FR'}={}){
  if(typeof country!=='string'||(country!=='WORLD'&&!Object.hasOwn(NEWS_COUNTRIES,country)))throw new NewsFailure(400,'Pays inconnu.');
  let snapshot=cached,stale=false;const stamp=now(),age=snapshot?stamp-Date.parse(snapshot.retrievedAt):Infinity;
  if(age>=NEWS_CACHE_MS){
   if(!inflight&&(stamp-lastAttempt>=30_000||!lastAttempt))inflight=refresh().finally(()=>{inflight=null;});
   try{if(inflight)snapshot=await inflight;else if(!snapshot)throw new NewsFailure(503,'Les sources sont temporairement indisponibles. Réessaie dans un instant.');}
   catch(error){if(!cached||stamp-Date.parse(cached.retrievedAt)>NEWS_STALE_MS)throw error;snapshot=cached;stale=true;}
  }
  if(!snapshot)throw new NewsFailure(503,'Le fil d’actualités est indisponible.');
  stale=stale||stamp-Date.parse(snapshot.retrievedAt)>=NEWS_CACHE_MS;
  if(stamp-Date.parse(snapshot.retrievedAt)>NEWS_STALE_MS)throw new NewsFailure(503,'La dernière collecte est trop ancienne. Réessaie plus tard.');
  const articles=snapshot.articles.filter(article=>country==='WORLD'||article.countries.includes(country)).slice(0,80);
  return {...snapshot,articles,country,stale,servedAt:new Date(now()).toISOString(),coverage:country==='FR'?'France : sources nationales et mentions dans les flux internationaux.':country==='WORLD'?'Fil des sources internationales disponibles.':'Articles mentionnant le pays dans les flux disponibles ; ce n’est pas un fil local exhaustif.',cache:{ttlSeconds:NEWS_CACHE_MS/1000,maxStaleSeconds:NEWS_STALE_MS/1000},topics:NEWS_TOPICS};
 }};
}
