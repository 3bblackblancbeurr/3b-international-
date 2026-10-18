import {COUNTRY_INDEX} from '../memberSources.js';
import {ecosystemPublic} from '../../lib/ecosystem.js';
export const NEWS_CACHE_KEY='threeb_news_reader_cache_v1';
export const NEWS_TOPICS={all:'Tous les sujets',public:'Droits & vie pratique',politics:'Politique',economy:'Économie',society:'Société',environment:'Environnement',science:'Sciences & numérique',culture:'Culture',sport:'Sport',world:'International'};
export const NEWS_PUBLISHERS={
 'public-fr':{name:'Service Public / DILA',home:'https://www.service-public.gouv.fr/',hosts:['www.service-public.gouv.fr','www.service-public.fr'],summary:true},
 'public-pro':{name:'Service Public Entreprendre / DILA',home:'https://entreprendre.service-public.gouv.fr/',hosts:['entreprendre.service-public.gouv.fr','entreprendre.service-public.fr','www.service-public.gouv.fr','www.service-public.fr'],summary:true},
 'f24-fr':{name:'France 24',home:'https://www.france24.com/fr/',hosts:['www.france24.com','france24.com']},
 'f24-world':{name:'France 24',home:'https://www.france24.com/fr/',hosts:['www.france24.com','france24.com']},
 'rfi-world':{name:'RFI',home:'https://www.rfi.fr/fr/',hosts:['www.rfi.fr','rfi.fr']},
 'bbc-world':{name:'BBC News',home:'https://www.bbc.com/news',hosts:['www.bbc.com','www.bbc.co.uk','bbc.com','bbc.co.uk']},
};
const clean=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
const countryKnown=code=>code==='WORLD'||COUNTRY_INDEX.some(row=>row[0]===code);
export function safeNewsLink(raw,sourceId){const publisher=NEWS_PUBLISHERS[sourceId];if(!publisher)return null;try{const url=new URL(raw);return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&publisher.hosts.includes(url.hostname)&&url.href.length<=1600?url.href:null;}catch{return null;}}
export function normalizeNewsPayload(raw,expectedCountry,now=Date.now()){
 if(!raw||raw.version!==1||!Array.isArray(raw.articles)||raw.articles.length>180||!countryKnown(expectedCountry)||raw.country!==expectedCountry)throw Error('Le format du fil d’actualités est indisponible.');
 const retrieved=Date.parse(raw.retrievedAt);if(!Number.isFinite(retrieved)||retrieved>now+300000||now-retrieved>6*3600000)throw Error('La dernière collecte est trop ancienne ou invalide. Actualise le fil.');
 const seen=new Set(),articles=[];
 for(const item of raw.articles){
  const publisher=NEWS_PUBLISHERS[item?.sourceId],url=safeNewsLink(item?.url,item?.sourceId),title=clean(item?.title,260),date=Date.parse(item?.publishedAt);
  if(!publisher||!url||!title||!Number.isFinite(date)||date>now+300000||now-date>30*86400000||seen.has(url)||(expectedCountry!=='WORLD'&&(!Array.isArray(item.countries)||!item.countries.includes(expectedCountry))))continue;seen.add(url);
  articles.push({id:/^news-[a-z0-9]{1,14}$/.test(item.id)?item.id:'news-'+articles.length,title,url,publishedAt:new Date(date).toISOString(),sourceId:item.sourceId,source:publisher.name,sourceUrl:publisher.home,language:item.language==='en'?'en':'fr',topic:Object.hasOwn(NEWS_TOPICS,item.topic)?item.topic:'world',countries:Array.isArray(item.countries)?item.countries.filter(countryKnown):[],summary:publisher.summary?clean(item.summary,421):'',excerptPolicy:publisher.summary?'rss-summary':'headline-only'});
 }
 const sources=Object.entries(NEWS_PUBLISHERS).map(([id,publisher])=>({id,name:publisher.name,url:publisher.home,available:Array.isArray(raw.sources)&&raw.sources.some(source=>source.id===id&&source.available===true),count:articles.filter(item=>item.sourceId===id).length}));
 return {version:1,country:expectedCountry,articles,sources,retrievedAt:new Date(retrieved).toISOString(),stale:raw.stale===true||now-retrieved>5*60000,partial:raw.partial===true,coverage:expectedCountry==='FR'?'Sources nationales et mentions dans les flux internationaux.':expectedCountry==='WORLD'?'Fil des sources internationales disponibles.':'Articles mentionnant ce pays dans les flux disponibles ; couverture non exhaustive.'};
}
export async function fetchNewsPayload(country,signal){if(!countryKnown(country))throw Error('Choisis un pays de la liste.');return normalizeNewsPayload(await ecosystemPublic('news',{params:{country},signal}),country);}
export function loadNewsCache(country,storage){try{const source=JSON.parse((storage??globalThis.localStorage).getItem(NEWS_CACHE_KEY)||'null');return source?.country===country?normalizeNewsPayload(source,country):null;}catch{return null;}}
export function saveNewsCache(payload,storage){try{(storage??globalThis.localStorage).setItem(NEWS_CACHE_KEY,JSON.stringify(normalizeNewsPayload(payload,payload.country)));return true;}catch{return false;}}
export function findNewsArticles(articles,{query='',topic='all',source='all'}={}){const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim(),words=normalize(query).split(/\s+/).filter(Boolean);return articles.filter(item=>(topic==='all'||item.topic===topic)&&(source==='all'||item.sourceId===source)&&words.every(word=>normalize([item.title,item.summary,item.source].join(' ')).includes(word)));}
export const newsDate=value=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
