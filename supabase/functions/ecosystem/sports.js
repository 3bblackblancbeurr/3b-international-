export const SPORTS=[
 'Tous','Football','Basket','Tennis','Rugby','Cyclisme','Formule 1','MotoGP','Athlétisme','Natation',
 'Sports de combat','Handball','Volley','Golf','Cricket','Sports d’hiver','Sports US','Esport','Autres'
];

export const FEEDS=[
 {url:'https://www.franceinfo.fr/sports.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr'},
 {url:'https://www.france24.com/fr/sports/rss',name:'France 24',lang:'fr',host:'france24.com'},
 {url:'https://www.20minutes.fr/feeds/rss-sport.xml',name:'20 Minutes',lang:'fr',host:'20minutes.fr'},
 {url:'https://www.ouest-france.fr/rss/sport',name:'Ouest-France',lang:'fr',host:'ouest-france.fr'},
 {url:'https://www.franceinfo.fr/sports/basket.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Basket'},
 {url:'https://www.franceinfo.fr/sports/tennis.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Tennis'},
 {url:'https://www.franceinfo.fr/sports/rugby.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Rugby'},
 {url:'https://www.franceinfo.fr/sports/cyclisme.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Cyclisme'},
 {url:'https://www.franceinfo.fr/sports/auto-moto/formule-1.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Formule 1'},
 {url:'https://www.franceinfo.fr/sports/mma.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Sports de combat'},
 {url:'https://www.franceinfo.fr/sports/sports-d-hiver.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr',category:'Sports d’hiver'},
 {url:'https://feeds.bbci.co.uk/sport/rss.xml',name:'BBC Sport',lang:'en',host:'bbc.co.uk',hosts:['bbc.com']}
];

const tags=[
 ['Football',/football|soccer|ligue\s?1|ligue des champions|champions league|premier league|serie a|liga|bundesliga|coupe du monde|world cup|can\b/i],
 ['Basket',/basket|nba\b|wnba\b|euroleague/i],
 ['Tennis',/tennis|wimbledon|roland.?garros|us open|australian open|atp\b|wta\b/i],
 ['Rugby',/rugby|six nations|top\s?14|champions cup/i],
 ['Cyclisme',/cyclis|cycling|vuelta|tour de france|giro|paris.?roubaix/i],
 ['Formule 1',/formula\s?1|formule\s?1|\bf1\b|grand prix/i],
 ['MotoGP',/motogp|moto gp|moto2|moto3/i],
 ['Athlétisme',/athl[eé]ti|marathon|sprint|diamond league|championnats? du monde d.?athl/i],
 ['Natation',/swimming|natation|nageur|nageuse|water-polo/i],
 ['Sports de combat',/boxe|boxing|\bmma\b|\bufc\b|judo|karat[eé]|taekwondo|kick.?boxing/i],
 ['Handball',/handball|hand\b/i],
 ['Volley',/volley|volleyball/i],
 ['Golf',/golf|ryder cup|pga\b/i],
 ['Cricket',/cricket/i],
 ['Sports d’hiver',/ski|snowboard|biathlon|winter|sports d.?hiver|bobsleigh|patinage/i],
 ['Sports US',/\bnfl\b|\bnhl\b|\bmlb\b|baseball|american football|football am[eé]ricain/i],
 ['Esport',/e-?sport|esport|league of legends|valorant|counter.?strike/i]
];

const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
export function decodeXML(value=''){
 return String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]*>/g,'')
  .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{
   const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);
   return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';
  })
  .replace(/&(amp|lt|gt|quot|apos);/g,(_,name)=>entities[name]||'')
  .replace(/\s+/g,' ')
  .trim();
}

function readTag(item,name){
 const special='\\.^$*+?()[]{}|';
 const escaped=[...name].map(char=>special.includes(char)?'\\'+char:char).join('');
 return decodeXML(item.match(new RegExp('<'+escaped+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+escaped+'>','i'))?.[1]||'');
}

function readLink(item){
 const href=item.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i)?.[1];
 return decodeXML(href||readTag(item,'link'));
}

function allowedHost(url,feed){
 const hosts=[feed.host,...(feed.hosts||[])];
 return hosts.some(host=>url.hostname===host||url.hostname.endsWith('.'+host));
}

function categoryFor(text,feed){
 if(feed.category)return feed.category;
 return tags.find(([,regex])=>regex.test(text))?.[0]||'Autres';
}

export function parseFeed(xml,feed,now=Date.now()){
 const entries=[...String(xml).matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0,120);
 return entries.flatMap(([,type,item])=>{
  const title=readTag(item,'title');
  const link=readLink(item);
  const rawDate=readTag(item,'pubDate')||readTag(item,'dc:date')||readTag(item,'published')||readTag(item,'updated');
  const date=Date.parse(rawDate);
  let url;
  try{url=new URL(link);}catch{return[];}
  if(!title||url.protocol!=='https:'||!allowedHost(url,feed)||url.username||url.password||!Number.isFinite(date)||date>now+300000||date<now-7*86400000)return[];
  const context=[title,readTag(item,'category'),readTag(item,'description'),url.pathname].join(' ');
  return [{
   title:title.slice(0,300),
   url:url.href,
   publishedAt:new Date(date).toISOString(),
   source:feed.name,
   language:feed.lang,
   category:categoryFor(context,feed)
  }];
 });
}

function normalizedTitle(title){
 return title.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

function aggregateSources(settled){
 const map=new Map();
 FEEDS.forEach((feed,index)=>{
  const row=map.get(feed.name)||{name:feed.name,language:feed.lang,available:false,feeds:0,activeFeeds:0};
  row.feeds+=1;
  if(settled[index].status==='fulfilled'){row.available=true;row.activeFeeds+=1;}
  map.set(feed.name,row);
 });
 return [...map.values()];
}

export async function fetchSports(fetcher=fetch){
 const settled=await Promise.allSettled(FEEDS.map(async feed=>{
  const response=await fetcher(feed.url,{
   signal:AbortSignal.timeout(10000),
   headers:{Accept:'application/rss+xml,application/atom+xml,application/xml,text/xml'}
  });
  if(!response.ok)throw Error('Flux indisponible');
  const xml=await response.text();
  if(xml.length>2500000)throw Error('Flux volumineux');
  const items=parseFeed(xml,feed);
  if(!items.length)throw Error('Flux vide');
  return items;
 }));

 const candidates=settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
 const byUrl=new Map();
 for(const article of candidates){
  const existing=byUrl.get(article.url);
  if(!existing||(existing.language!=='fr'&&article.language==='fr'))byUrl.set(article.url,article);
 }
 const byTitle=new Map();
 for(const article of byUrl.values()){
  const key=normalizedTitle(article.title);
  const existing=byTitle.get(key);
  if(!existing||(existing.language!=='fr'&&article.language==='fr')||Date.parse(article.publishedAt)>Date.parse(existing.publishedAt))byTitle.set(key,article);
 }
 const articles=[...byTitle.values()]
  .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
  .slice(0,180);

 if(!articles.length)throw Error('Les sources sportives sont momentanément indisponibles.');

 const sources=aggregateSources(settled);
 const frenchCount=articles.filter(article=>article.language==='fr').length;
 return {
  version:2,
  articles,
  updatedAt:new Date().toISOString(),
  sources,
  partial:settled.some(result=>result.status==='rejected'),
  frenchCount,
  englishCount:articles.length-frenchCount,
  categories:[...new Set(articles.map(article=>article.category))]
 };
}
