const SEARCH_URL='https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL='https://www.googleapis.com/youtube/v3/videos';

const PROFILE_QUERIES={
  'h24-auto':[
    ['football-france','football match france en direct','FR','fr'],
    ['football-europe','football live match','FR','fr'],
    ['basket','basketball live game','FR','fr'],
    ['rugby','rugby live match','FR','fr'],
    ['tennis','tennis live match','FR','fr'],
    ['handball','handball live match','FR','fr'],
    ['volleyball','volleyball live match','FR','fr'],
    ['futsal','futsal live match','FR','fr'],
    ['hockey','hockey live match','FR','fr'],
    ['combat','boxing mma live fight','FR','fr'],
    ['world','sports live match','FR','fr']
  ],
  'h24-foot':[
    ['football-france','football match france en direct','FR','fr'],
    ['football-europe','football live match','FR','fr'],
    ['football-world','soccer live match','FR','fr']
  ],
  'h24-basket':[
    ['basket-france','basketball france live game','FR','fr'],
    ['basket-europe','basketball europe live game','FR','fr'],
    ['basket-world','basketball live game','FR','fr']
  ],
  'h24-rugby':[
    ['rugby-france','rugby france live match','FR','fr'],
    ['rugby-europe','rugby europe live match','FR','fr'],
    ['rugby-world','rugby live match','FR','fr']
  ],
  'h24-tennis':[
    ['tennis-france','tennis france live match','FR','fr'],
    ['tennis-europe','tennis europe live match','FR','fr'],
    ['tennis-world','tennis live match','FR','fr']
  ],
  'h24-world':[
    ['world-1','sports live match','FR','fr'],
    ['world-2','live game official','US','en'],
    ['world-3','live match official','GB','en']
  ]
};

const DEFAULT_TRUSTED=[
  'fifa','olympic games','fiba - the basketball channel','world rugby',
  'volleyball world','bwf tv','world table tennis','iihf worlds',
  'world aquatics','fih hockey','ihf - competitions','caf tv',
  'afc asian cup','concacaf'
];

const REJECT=/\b(replay|highlights?|résumé|resume|reaction|watchalong|press conference|podcast|preview|news|interview|radio|draw|training|warm[- ]?up)\b/i;
const MATCH_HINT=/\b(vs\.?|v\.?|versus|contre|match|game|final|semi[- ]?final|quarter[- ]?final|round|set|bout|fight|race)\b/i;

function norm(value=''){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

function trustedChannels(){
  const extra=(process.env.SPORT_LIVE_TRUSTED_CHANNEL_TITLES||'')
    .split(',').map(norm).filter(Boolean);
  return new Set([...DEFAULT_TRUSTED.map(norm),...extra]);
}

function looksLikeLiveMatch(item,allowed){
  const title=item?.snippet?.title||'';
  const description=item?.snippet?.description||'';
  const channel=norm(item?.snippet?.channelTitle||'');
  if(!allowed.has(channel))return false;
  if(REJECT.test(title)||REJECT.test(description.slice(0,220)))return false;
  return MATCH_HINT.test(title);
}

async function youtubeJson(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const message=data?.error?.message||('YouTube HTTP '+response.status);
      const error=new Error(message);
      error.status=response.status;
      throw error;
    }
    return data;
  }finally{
    clearTimeout(timer);
  }
}

async function searchTier(key,tier){
  const [tierId,q,regionCode,relevanceLanguage]=tier;
  const params=new URLSearchParams({
    key,
    part:'snippet',
    type:'video',
    eventType:'live',
    videoEmbeddable:'true',
    videoSyndicated:'true',
    videoCategoryId:'17',
    safeSearch:'strict',
    order:'relevance',
    maxResults:'12',
    q,
    regionCode,
    relevanceLanguage
  });
  const data=await youtubeJson(SEARCH_URL+'?'+params);
  return (data.items||[]).map(item=>({...item,_tier:tierId}));
}

async function verifyLive(key,candidates){
  const ids=[...new Set(candidates.map(item=>item?.id?.videoId).filter(Boolean))].slice(0,50);
  if(!ids.length)return[];
  const params=new URLSearchParams({
    key,
    part:'snippet,status,liveStreamingDetails',
    id:ids.join(',')
  });
  const data=await youtubeJson(VIDEOS_URL+'?'+params);
  const byId=new Map(candidates.map(item=>[item.id.videoId,item]));
  return (data.items||[]).filter(video=>{
    const live=video?.snippet?.liveBroadcastContent==='live';
    const embeddable=video?.status?.embeddable===true;
    const started=!!video?.liveStreamingDetails?.actualStartTime;
    const ended=!!video?.liveStreamingDetails?.actualEndTime;
    return live&&embeddable&&started&&!ended;
  }).map(video=>({video,candidate:byId.get(video.id)}));
}

function asSource(entry,index){
  const video=entry.video;
  const tier=entry.candidate?._tier||'live';
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
    tier,
    title:video.snippet.title||'Match en direct',
    startedAt:video.liveStreamingDetails.actualStartTime||null,
    embedUrl:'https://www.youtube-nocookie.com/embed/'+video.id+'?'+params,
    priority:index
  };
}

function send(res,status,payload){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control',status===200?'public, s-maxage=45, stale-while-revalidate=90':'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(payload));
}

export default async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{ok:false,error:'method_not_allowed'});
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return send(res,503,{ok:false,error:'live_discovery_not_configured',sources:[]});

  const profile=String(req.query?.profile||'h24-auto');
  const tiers=PROFILE_QUERIES[profile]||PROFILE_QUERIES['h24-auto'];
  const allowed=trustedChannels();
  const candidates=[];
  const seen=new Set();
  const failures=[];

  for(const tier of tiers){
    try{
      const found=await searchTier(key,tier);
      for(const item of found){
        const id=item?.id?.videoId;
        if(!id||seen.has(id)||!looksLikeLiveMatch(item,allowed))continue;
        seen.add(id);
        candidates.push(item);
      }
      if(candidates.length>=16)break;
    }catch(error){
      failures.push({tier:tier[0],message:error?.message||'search_failed'});
    }
  }

  let verified=[];
  try{
    verified=await verifyLive(key,candidates);
  }catch(error){
    failures.push({tier:'verify',message:error?.message||'verify_failed'});
  }

  const sources=verified.slice(0,12).map(asSource);
  return send(res,200,{
    ok:true,
    profile,
    live:true,
    checkedAt:new Date().toISOString(),
    sources,
    searchedTiers:tiers.map(tier=>tier[0]),
    failures
  });
}
