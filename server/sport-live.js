const SEARCH_URL='https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL='https://www.googleapis.com/youtube/v3/videos';

const DEFAULT_TRUSTED=[
 'fifa','olympic games','uefa','fiba - the basketball channel',
 'basketball champions league','euroleague basketball','world rugby','rugby europe',
 'volleyball world','bwf tv','world table tennis','iihf worlds','world aquatics',
 'fih hockey','ihf - competitions','ehf home of handball','caf tv','afc asian cup',
 'concacaf','world athletics','uci','united world wrestling','world archery',
 'world taekwondo','wbsc','fisu tv'
];

const REJECT=/\b(replay|highlights?|résumé|resume|reaction|watchalong|press conference|podcast|preview|news|interview|radio|draw|training|warm[- ]?up|ceremony)\b/i;
const MATCH_HINT=/\b(live|vs\.?|v\.?|versus|contre|match|game|final|semi[- ]?final|quarter[- ]?final|round|set|bout|fight|race|heat)\b/i;
const FRANCE_HINT=/\b(france|français|francaise|french|ligue 1|top 14|pro d2|ffr|fff)\b/i;
const EUROPE_HINT=/\b(europe|euro|uefa|champions league|europa|conference league|six nations|euroleague)\b/i;

const SPORT_RULES=[
 ['Football',/\b(football|soccer|futsal|uefa|fifa|ligue 1|champions league|premier league|serie a|la liga|bundesliga)\b/i],
 ['Basket',/\b(basket|basketball|fiba|euroleague|nba|wnba)\b/i],
 ['Rugby',/\b(rugby|top 14|six nations|world rugby)\b/i],
 ['Tennis de table',/\b(table tennis|ping pong|wtt|ittf)\b/i],
 ['Tennis',/\b(tennis|atp|wta|roland garros|wimbledon|us open|australian open)\b/i],
 ['Handball',/\b(handball|ehf|ihf)\b/i],
 ['Volley',/\b(volleyball|volley)\b/i],
 ['Hockey',/\b(hockey|iihf|fih)\b/i],
 ['Badminton',/\b(badminton|bwf)\b/i],
 ['Combat',/\b(boxing|boxe|mma|judo|wrestling|taekwondo|karate|kickboxing|fight|bout)\b/i],
 ['Cyclisme',/\b(cycling|cyclisme|uci|bike|bmx)\b/i],
 ['Athlétisme',/\b(athletics|athlétisme|track|marathon|sprint|relay)\b/i],
 ['Natation',/\b(swimming|natation|aquatics|water polo)\b/i],
 ['Baseball',/\b(baseball|softball|wbsc)\b/i]
];

function norm(value=''){
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

function trustedChannels(){
 const extra=(process.env.SPORT_LIVE_TRUSTED_CHANNEL_TITLES||'').split(',').map(norm).filter(Boolean);
 return new Set([...DEFAULT_TRUSTED.map(norm),...extra]);
}

function inferSport(text){
 for(const [name,rule] of SPORT_RULES)if(rule.test(text))return name;
 return'Autre sport';
}

function rank(video){
 const text=(video?.snippet?.title||'')+' '+(video?.snippet?.description||'')+' '+(video?.snippet?.channelTitle||'');
 const sport=inferSport(text);
 let score=0;
 if(FRANCE_HINT.test(text))score+=100;
 if(sport==='Football')score+=70;
 if(EUROPE_HINT.test(text))score+=35;
 if(/\bfinal\b/i.test(text))score+=8;
 const viewers=Math.max(0,Number(video?.liveStreamingDetails?.concurrentViewers)||0);
 score+=Math.min(25,Math.log10(viewers+1)*5);
 return{sport,score};
}

function looksLikeLiveMatch(video,allowed){
 const title=video?.snippet?.title||'';
 const description=video?.snippet?.description||'';
 const channel=norm(video?.snippet?.channelTitle||'');
 if(!allowed.has(channel))return false;
 if(REJECT.test(title)||REJECT.test(description.slice(0,260)))return false;
 return MATCH_HINT.test(title);
}

async function youtubeJson(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||('YouTube HTTP '+response.status));
  return data;
 }finally{
  clearTimeout(timer);
 }
}

async function discoverIds(key){
 const params=new URLSearchParams({
  key,
  part:'snippet',
  type:'video',
  eventType:'live',
  videoEmbeddable:'true',
  videoSyndicated:'true',
  videoCategoryId:'17',
  safeSearch:'strict',
  q:'football|soccer|basketball|rugby|tennis|handball|volleyball|hockey|badminton|boxing|judo|wrestling|cycling|athletics|swimming',
  order:'viewCount',
  maxResults:'50',
  regionCode:'FR',
  relevanceLanguage:'fr'
 });
 const data=await youtubeJson(SEARCH_URL+'?'+params);
 return[...new Set((data.items||[]).map(item=>item?.id?.videoId).filter(Boolean))].slice(0,50);
}

async function verifyLive(key,ids){
 if(!ids.length)return[];
 const params=new URLSearchParams({
  key,
  part:'snippet,status,liveStreamingDetails',
  id:ids.join(',')
 });
 const data=await youtubeJson(VIDEOS_URL+'?'+params);
 const allowed=trustedChannels();
 return(data.items||[]).filter(video=>{
  const live=video?.snippet?.liveBroadcastContent==='live';
  const embeddable=video?.status?.embeddable===true;
  const started=!!video?.liveStreamingDetails?.actualStartTime;
  const ended=!!video?.liveStreamingDetails?.actualEndTime;
  return live&&embeddable&&started&&!ended&&looksLikeLiveMatch(video,allowed);
 });
}

function asSource(video,index){
 const {sport,score}=rank(video);
 const provider=video.snippet.channelTitle||'Source officielle';
 const params=new URLSearchParams({
  rel:'0',playsinline:'1',controls:'1',fs:'0',enablejsapi:'1',
  iv_load_policy:'3',autoplay:'1',mute:'1'
 });
 return{
  id:'live-'+video.id,
  label:'DIRECT · '+provider,
  videoId:video.id,
  provider,
  mode:'live',
  sport,
  score,
  title:video.snippet.title||'Match en direct',
  startedAt:video.liveStreamingDetails.actualStartTime||null,
  viewers:Number(video.liveStreamingDetails.concurrentViewers)||0,
  embedUrl:'https://www.youtube-nocookie.com/embed/'+video.id+'?'+params,
  priority:index
 };
}

function json(payload,status=200){
 return new Response(JSON.stringify(payload),{
  status,
  headers:{
   'content-type':'application/json; charset=utf-8',
   'cache-control':status===200?'public, s-maxage=1200, stale-while-revalidate=300':'no-store',
   'x-content-type-options':'nosniff'
  }
 });
}

export async function handleSportLive(request){
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  const requestUrl=new URL(request.url);
  const externalParams=[...requestUrl.searchParams.keys()].filter(key=>key!=='__3b_route');
  if(externalParams.length)return json({ok:false,error:'unexpected_query_parameters'},400);
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return json({ok:false,error:'live_discovery_not_configured',sources:[]},503);

  try{
   const ids=await discoverIds(key);
   const verified=await verifyLive(key,ids);
   const sources=verified
    .map((video,index)=>asSource(video,index))
    .sort((a,b)=>b.score-a.score||b.viewers-a.viewers)
    .slice(0,24)
    .map((source,index)=>({...source,priority:index}));
   return json({
    ok:true,
    live:true,
    checkedAt:new Date().toISOString(),
    sources,
    searchPolicy:'single-global-live-search',
    cacheSeconds:1200
   });
  }catch(error){
   console.warn('[sport-live] discovery failed',error?.message||'unknown');
   return json({ok:false,error:'live_discovery_failed',sources:[]},502);
  }
}
