import {
 SCHEDULE_SPORTS,SPORT_STREAMS,cleanText,isEventCurrent,matchEventToTitle,
 sanitizeEvent,sourceIdForBroadcaster,summarizeSchedule,
} from '../shared/sport-director.js';

const SPORTS_DB_ORIGIN='https://www.thesportsdb.com';
const SPORTS_DB_BASE=SPORTS_DB_ORIGIN+'/api/v1/json';
const YOUTUBE_FEED_ORIGIN='https://www.youtube.com';
const YOUTUBE_API_ORIGIN='https://www.googleapis.com';
const TWITCH_AUTH_ORIGIN='https://id.twitch.tv';
const TWITCH_API_ORIGIN='https://api.twitch.tv';
const MAX_UPSTREAM_BYTES=2_000_000;
const SCHEDULE_TTL=5*60*1000;
const LIVE_TTL=90*1000;
const EVENT_TTL=60*1000;
const MAX_CACHE_ENTRIES=300;
const cache=new Map();
const rateBuckets=new Map();
let twitchToken=null;

function pruneCache(now=Date.now()){
 for(const [key,item] of cache){
  const staleUntil=Number(item?.staleUntil||item?.expires||0);
  if(!item?.promise&&staleUntil<=now)cache.delete(key);
 }
 if(cache.size<MAX_CACHE_ENTRIES)return;
 for(const [key,item] of cache){
  if(item?.promise)continue;
  cache.delete(key);
  if(cache.size<MAX_CACHE_ENTRIES)break;
 }
}

function json(data,status=200,cacheControl='no-store',extra={}){
 return new Response(JSON.stringify(data),{
  status,
  headers:{
   'content-type':'application/json; charset=utf-8',
   'cache-control':cacheControl,
   'x-content-type-options':'nosniff',
   'x-frame-options':'DENY',
   'referrer-policy':'no-referrer',
   'cross-origin-resource-policy':'same-origin',
   'content-security-policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
   'x-robots-tag':'noindex, nofollow',
   ...extra,
  },
 });
}
function allowedOrigins(){
 const configured=[process.env.APP_URL,process.env.VITE_PUBLIC_APP_ORIGIN,process.env.SPORT_DIRECTOR_ALLOWED_ORIGINS]
  .filter(Boolean).flatMap(value=>String(value).split(','));
 return new Set([
  ...configured.map(value=>value.trim().replace(/\/$/,'')),
  'http://localhost:5173','http://127.0.0.1:5173','http://localhost:4173','http://127.0.0.1:4173',
  'https://localhost','capacitor://localhost',
 ].filter(Boolean));
}

export function requestOriginAllowed(request){
 const site=request.headers.get('sec-fetch-site');
 const origin=request.headers.get('origin');
 if(!origin)return site!=='cross-site';
 const normalized=origin.replace(/\/$/,'');
 if(normalized===new URL(request.url).origin)return true;
 return allowedOrigins().has(normalized);
}

function hashKey(value){
 let hash=2166136261;
 for(const char of String(value||'anonymous')){
  hash^=char.charCodeAt(0);
  hash=Math.imul(hash,16777619);
 }
 return (hash>>>0).toString(36);
}

export function consumeRateLimit(request,now=Date.now()){
 const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
 const key=hashKey(forwarded||request.headers.get('x-real-ip')||'anonymous');
 const windowStart=Math.floor(now/60000)*60000;
 const bucket=rateBuckets.get(key);
 if(!bucket||bucket.windowStart!==windowStart){
  rateBuckets.set(key,{windowStart,count:1});
  return {allowed:true,remaining:59};
 }
 bucket.count+=1;
 return {allowed:bucket.count<=60,remaining:Math.max(0,60-bucket.count)};
}
function upstreamAllowed(url){
 return [SPORTS_DB_ORIGIN,YOUTUBE_FEED_ORIGIN,YOUTUBE_API_ORIGIN,TWITCH_AUTH_ORIGIN,TWITCH_API_ORIGIN]
  .includes(new URL(url).origin);
}

async function fetchText(url,{fetchImpl=fetch,timeout=8000,options={}}={}){
 if(!upstreamAllowed(url))throw new Error('upstream-not-allowed');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetchImpl(url,{...options,signal:controller.signal,redirect:'error'});
  if(!response.ok)throw new Error('upstream-'+response.status);
  const length=Number(response.headers.get('content-length')||0);
  if(length>MAX_UPSTREAM_BYTES)throw new Error('upstream-too-large');
  const text=await response.text();
  if(text.length>MAX_UPSTREAM_BYTES)throw new Error('upstream-too-large');
  return text;
 }finally{
  clearTimeout(timer);
 }
}

async function fetchJson(url,options={}){
 const text=await fetchText(url,options);
 try{return JSON.parse(text);}
 catch{throw new Error('upstream-invalid-json');}
}

async function cached(key,ttl,loader){
 const now=Date.now();
 pruneCache(now);
 const existing=cache.get(key);
 if(existing?.value&&existing.expires>now)return existing.value;
 if(existing?.promise)return existing.promise;
 const promise=Promise.resolve().then(loader).then(value=>{
  cache.set(key,{value,expires:Date.now()+ttl,staleUntil:Date.now()+ttl*6});
  return value;
 }).catch(error=>{
  const stale=cache.get(key);
  if(stale?.value&&stale.staleUntil>Date.now())return {...stale.value,degraded:true};
  cache.delete(key);
  throw error;
 });
 cache.set(key,{...(existing||{}),promise});
 return promise.finally(()=>{
  const current=cache.get(key);
  if(current?.promise===promise)delete current.promise;
 });
}
function utcDate(value){
 return new Date(value).toISOString().slice(0,10);
}

function sportsDbKey(){
 const key=cleanText(process.env.THESPORTSDB_API_KEY||'123',80);
 return /^[A-Za-z0-9_-]{1,80}$/.test(key)?key:'123';
}

async function fetchSportsDay(date,sport,fetchImpl){
 const url=new URL(`${SPORTS_DB_BASE}/${sportsDbKey()}/eventsday.php`);
 url.searchParams.set('d',date);
 url.searchParams.set('s',sport);
 const data=await fetchJson(url,{fetchImpl});
 return Array.isArray(data?.events)?data.events:[];
}

async function fetchTvDay(date,fetchImpl){
 const url=new URL(`${SPORTS_DB_BASE}/${sportsDbKey()}/eventstv.php`);
 url.searchParams.set('d',date);
 const data=await fetchJson(url,{fetchImpl});
 return Array.isArray(data?.tvevents)?data.tvevents:[];
}

function tvMap(rows){
 const map=new Map();
 for(const row of rows||[]){
  const id=String(row?.idEvent||'').replace(/\D/g,'').slice(0,16);
  const channel=cleanText(row?.strChannel,80);
  if(id&&channel)map.set(id,channel);
 }
 return map;
}

function regionRank(event){
 const text=(event.country+' '+event.league+' '+event.name).toLowerCase();
 if(/france|french|ligue 1|top 14/.test(text))return 0;
 if(/uefa|euro|europe|england|spain|italy|germany|portugal|belgium|netherlands|estonia|turkey|morocco|algeria|tunisia/.test(text))return 1;
 return 2;
}
export async function loadSchedule({fetchImpl=fetch,now=Date.now()}={}){
 const dates=[utcDate(now),utcDate(now+24*3600000)];
 const key='schedule:'+dates.join(':');
 return cached(key,SCHEDULE_TTL,async()=>{
  const eventTasks=dates.flatMap(date=>SCHEDULE_SPORTS.map(sport=>fetchSportsDay(date,sport,fetchImpl)));
  const tvTasks=dates.map(date=>fetchTvDay(date,fetchImpl));
  const [eventResults,tvResults]=await Promise.all([
   Promise.allSettled(eventTasks),Promise.allSettled(tvTasks),
  ]);
  const rawEvents=eventResults.flatMap(result=>result.status==='fulfilled'?result.value:[]);
  const tv=tvMap(tvResults.flatMap(result=>result.status==='fulfilled'?result.value:[]));
  const deduped=new Map();
  for(const raw of rawEvents){
   const event=sanitizeEvent(raw);
   if(!event)continue;
   const start=Date.parse(event.start);
   if(start<now-10*3600000||start>now+52*3600000)continue;
   const broadcaster=tv.get(event.id)||event.broadcaster||'';
   deduped.set(event.id,{...event,broadcaster,sourceId:sourceIdForBroadcaster(broadcaster)});
  }
  const events=[...deduped.values()].sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
  const summary=summarizeSchedule(events,now,14);
  const upcoming=[...summary.upcoming].sort((a,b)=>{
   const delta=Date.parse(a.start)-Date.parse(b.start);
   if(Math.abs(delta)>90*60000)return delta;
   return regionRank(a)-regionRank(b)||delta;
  });
  return {
   events,
   current:summary.current,
   upcoming,
   generatedAt:new Date(now).toISOString(),
   degraded:eventResults.some(result=>result.status==='rejected'),
   provider:'TheSportsDB',
  };
 });
}
function youtubeApiKey(){
 const key=cleanText(process.env.YOUTUBE_DATA_API_KEY,180);
 return /^[A-Za-z0-9_-]{20,180}$/.test(key)?key:'';
}

function youtubeIdsFromFeed(xml){
 const ids=[];
 const pattern=/<yt:videoId>([A-Za-z0-9_-]{6,20})<\/yt:videoId>/g;
 let match;
 while((match=pattern.exec(xml))&&ids.length<12)ids.push(match[1]);
 return ids;
}

async function discoverYoutubeLives(fetchImpl){
 const key=youtubeApiKey();
 if(!key)return {configured:false,items:[]};
 const sources=SPORT_STREAMS.filter(source=>source.kind==='youtube');
 const feeds=await Promise.allSettled(sources.map(async source=>{
  const url=`${YOUTUBE_FEED_ORIGIN}/feeds/videos.xml?channel_id=${encodeURIComponent(source.channel)}`;
  return {source,ids:youtubeIdsFromFeed(await fetchText(url,{fetchImpl}))};
 }));
 const ownership=new Map();
 for(const result of feeds){
  if(result.status!=='fulfilled')continue;
  for(const id of result.value.ids)ownership.set(id,result.value.source);
 }
 const ids=[...ownership.keys()].slice(0,50);
 if(!ids.length)return {configured:true,items:[],degraded:true};
 const url=new URL(`${YOUTUBE_API_ORIGIN}/youtube/v3/videos`);
 url.searchParams.set('part','snippet,liveStreamingDetails,status');
 url.searchParams.set('id',ids.join(','));
 url.searchParams.set('key',key);
 const data=await fetchJson(url,{fetchImpl});
 const items=[];
 for(const video of data?.items||[]){
  const broadcast=cleanText(video?.snippet?.liveBroadcastContent,20);
  const details=video?.liveStreamingDetails||{};
  const live=broadcast==='live'||(details.actualStartTime&&!details.actualEndTime);
  const upcoming=broadcast==='upcoming';
  if(!live&&!upcoming)continue;
  const source=ownership.get(video.id);
  if(!source)continue;
  items.push({
   sourceId:source.id,platform:'youtube',videoId:cleanText(video.id,20),
   title:cleanText(video?.snippet?.title,180),live,upcoming,
   startedAt:parseOptionalDate(details.actualStartTime),
   scheduledAt:parseOptionalDate(details.scheduledStartTime),
  });
 }
 return {configured:true,items,degraded:feeds.some(result=>result.status==='rejected')};
}
function parseOptionalDate(value){
 const time=Date.parse(value||'');
 return Number.isFinite(time)?new Date(time).toISOString():null;
}

function twitchCredentials(){
 const clientId=cleanText(process.env.TWITCH_CLIENT_ID,120);
 const secret=cleanText(process.env.TWITCH_CLIENT_SECRET,220);
 if(!/^[A-Za-z0-9_-]{10,120}$/.test(clientId)||secret.length<20)return null;
 return {clientId,secret};
}

async function twitchAccessToken(fetchImpl){
 const credentials=twitchCredentials();
 if(!credentials)return null;
 if(twitchToken?.value&&twitchToken.expires>Date.now()+60000)return twitchToken.value;
 const url=new URL(`${TWITCH_AUTH_ORIGIN}/oauth2/token`);
 const body=new URLSearchParams({
  client_id:credentials.clientId,
  client_secret:credentials.secret,
  grant_type:'client_credentials',
 });
 const data=await fetchJson(url,{
  fetchImpl,
  options:{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body},
 });
 const value=cleanText(data?.access_token,500);
 const expiresIn=Math.max(300,Math.min(86400,Number(data?.expires_in)||3600));
 if(!value)throw new Error('twitch-token-missing');
 twitchToken={value,expires:Date.now()+expiresIn*1000};
 return value;
}

async function discoverTwitchLives(fetchImpl){
 const credentials=twitchCredentials();
 if(!credentials)return {configured:false,items:[]};
 const sources=SPORT_STREAMS.filter(source=>source.kind==='twitch');
 const token=await twitchAccessToken(fetchImpl);
 const url=new URL(`${TWITCH_API_ORIGIN}/helix/streams`);
 for(const source of sources)url.searchParams.append('user_login',source.channel);
 const data=await fetchJson(url,{
  fetchImpl,
  options:{headers:{'client-id':credentials.clientId,'authorization':`Bearer ${token}`}},
 });
 const byLogin=new Map(sources.map(source=>[source.channel.toLowerCase(),source]));
 const items=[];
 for(const row of data?.data||[]){
  const source=byLogin.get(String(row?.user_login||'').toLowerCase());
  if(!source)continue;
  items.push({
   sourceId:source.id,platform:'twitch',videoId:'',
   title:cleanText(row?.title,180),live:true,upcoming:false,
   gameName:cleanText(row?.game_name,80),
   startedAt:parseOptionalDate(row?.started_at),scheduledAt:null,
  });
 }
 return {configured:true,items};
}

export async function loadLiveSources({fetchImpl=fetch,events=[]}={}){
 return cached('live-sources',LIVE_TTL,async()=>{
  const [youtube,twitch]=await Promise.allSettled([
   discoverYoutubeLives(fetchImpl),discoverTwitchLives(fetchImpl),
  ]);
  const results=[youtube,twitch].map(result=>result.status==='fulfilled'?result.value:{configured:true,items:[],degraded:true});
  const now=Date.now();
  const items=results.flatMap(result=>result.items||[]).map(item=>{
   const titleMatch=matchEventToTitle(item.title,events,now);
   const sourceMatch=!titleMatch?[...events]
    .filter(event=>event?.sourceId===item.sourceId&&isEventCurrent(event,now))
    .sort((a,b)=>(b.state==='live')-(a.state==='live')||Date.parse(a.start)-Date.parse(b.start))[0]:null;
   const match=titleMatch
    ?{eventId:titleMatch.event.id,confidence:titleMatch.confidence,basis:'title'}
    :sourceMatch?{eventId:sourceMatch.id,confidence:0.82,basis:'broadcaster'}:null;
   return {...item,match};
  });
  const ranked=[...items].sort((a,b)=>{
   const aSource=SPORT_STREAMS.find(source=>source.id===a.sourceId);
   const bSource=SPORT_STREAMS.find(source=>source.id===b.sourceId);
   const aScore=(a.live?100:0)+(a.match?40:0)+(aSource?.weight||0);
   const bScore=(b.live?100:0)+(b.match?40:0)+(bSource?.weight||0);
   return bScore-aScore;
  });
  return {
   items,
   recommendedSourceId:ranked[0]?.sourceId||'',
   configured:{youtube:results[0]?.configured||false,twitch:results[1]?.configured||false},
   degraded:results.some(result=>result.degraded),
  };
 });
}
export async function loadEvent(eventId,{fetchImpl=fetch}={}){
 const id=String(eventId||'').replace(/\D/g,'').slice(0,16);
 if(!/^\d{3,16}$/.test(id))throw new Error('invalid-event-id');
 return cached('event:'+id,EVENT_TTL,async()=>{
  const url=new URL(`${SPORTS_DB_BASE}/${sportsDbKey()}/lookupevent.php`);
  url.searchParams.set('id',id);
  const data=await fetchJson(url,{fetchImpl});
  const event=sanitizeEvent(data?.events?.[0]);
  if(!event)throw new Error('event-not-found');
  return {event,checkedAt:new Date().toISOString(),provider:'TheSportsDB'};
 });
}

function publicLiveItem(item){
 return {
  sourceId:cleanText(item?.sourceId,80),
  platform:item?.platform==='twitch'?'twitch':'youtube',
  videoId:/^[A-Za-z0-9_-]{6,20}$/.test(item?.videoId||'')?item.videoId:'',
  title:cleanText(item?.title,180),
  gameName:cleanText(item?.gameName,80),
  live:Boolean(item?.live),upcoming:Boolean(item?.upcoming),
  startedAt:parseOptionalDate(item?.startedAt),scheduledAt:parseOptionalDate(item?.scheduledAt),
  match:item?.match&&/^\d{3,16}$/.test(item.match.eventId)?{
   eventId:item.match.eventId,
   confidence:Math.max(0,Math.min(1,Number(item.match.confidence)||0)),
   basis:item.match.basis==='broadcaster'?'broadcaster':'title',
  }:null,
 };
}

function cleanupRateBuckets(now=Date.now()){
 if(rateBuckets.size<1200)return;
 const threshold=Math.floor(now/60000)*60000-2*60000;
 for(const [key,bucket] of rateBuckets)if(bucket.windowStart<threshold)rateBuckets.delete(key);
}

export async function handleSportDirectorRequest(request,{fetchImpl=fetch,now=Date.now()}={}){
 const origin=request.headers.get('origin');
 const cors=origin&&requestOriginAllowed(request)?{'access-control-allow-origin':origin,'vary':'Origin'}:{};
 const reply=(data,status=200,cacheControl='no-store',extra={})=>json(data,status,cacheControl,{...cors,...extra});
 if(request.method!=='GET')return reply({error:'Méthode non autorisée.'},405,'no-store',{allow:'GET'});
 if(!requestOriginAllowed(request))return reply({error:'Origine non autorisée.'},403);
 cleanupRateBuckets(now);
 const rate=consumeRateLimit(request,now);
 if(!rate.allowed)return reply({error:'Trop de requêtes. Réessaie dans une minute.'},429,'no-store',{'retry-after':'60'});
 const url=new URL(request.url);
 const eventId=url.searchParams.get('event');
 if([...url.searchParams.keys()].some(key=>key!=='event'))return reply({error:'Paramètre non autorisé.'},400);
 try{
  if(eventId){
   const result=await loadEvent(eventId,{fetchImpl});
   return reply(result,200,'public, max-age=20, s-maxage=60, stale-while-revalidate=180');
  }
  const schedule=await loadSchedule({fetchImpl,now});
  let live={items:[],recommendedSourceId:'',configured:{youtube:false,twitch:false},degraded:false};
  try{live=await loadLiveSources({fetchImpl,events:schedule.events});}
  catch{live={...live,degraded:true};}
  const liveItems=(live.items||[]).map(publicLiveItem);
  const scheduledSource=schedule.current.find(event=>event.sourceId)?.sourceId
   ||schedule.upcoming.find(event=>event.sourceId&&Date.parse(event.start)<=now+45*60000)?.sourceId||'';
  const recommendedSourceId=live.recommendedSourceId||scheduledSource;
  const matchedIds=new Set(liveItems.map(item=>item.match?.eventId).filter(Boolean));
  const currentMatch=schedule.events.find(event=>matchedIds.has(event.id))
   ||schedule.current.find(event=>event.sourceId===recommendedSourceId)
   ||schedule.current[0]||null;
  const response={
   version:1,
   generatedAt:new Date(now).toISOString(),
   provider:schedule.provider,
   degraded:Boolean(schedule.degraded||live.degraded),
   discovery:live.configured,
   recommendedSourceId:cleanText(recommendedSourceId,80),
   liveSources:liveItems,
   currentMatch,
   current:schedule.current.slice(0,3),
   upcoming:schedule.upcoming.slice(0,12),
   events:schedule.events.slice(0,80),
  };
  return reply(response,200,'public, max-age=20, s-maxage=90, stale-while-revalidate=300');
 }catch(error){
  const code=error?.message==='event-not-found'?404:error?.message==='invalid-event-id'?400:503;
  const message=code===404?'Match introuvable.':code===400?'Identifiant de match invalide.':'Régie sportive temporairement indisponible.';
  return reply({error:message,code:cleanText(error?.message,80)},code,'no-store',code===503?{'retry-after':'60'}:{});
 }
}

export function resetSportDirectorForTests(){
 cache.clear();
 rateBuckets.clear();
 twitchToken=null;
}
