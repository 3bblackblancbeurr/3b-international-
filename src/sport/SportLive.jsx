import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CalendarClock,ExternalLink,Globe2,Maximize2,Minimize2,Radio,RefreshCw,SkipForward,Tv2} from 'lucide-react';
import {SPORT_HUBS,SPORT_STREAMS,cleanText} from '../../shared/sport-director.js';
import useSportDirector from './useSportDirector.js';

let youtubeApiPromise;
let twitchApiPromise;
const PLAYER_API_TIMEOUT=15000;
const ALL_SOURCES_RETRY_DELAY=60000;
const MEDIA_CONSENT_KEY='3b-sport-media-consent-v1';

function readMediaConsent(){
 if(typeof window==='undefined')return false;
 try{return window.localStorage.getItem(MEDIA_CONSENT_KEY)==='accepted';}
 catch{return false;}
}

function loadYouTubeApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(youtubeApiPromise)return youtubeApiPromise;
 youtubeApiPromise=new Promise((resolve,reject)=>{
  let settled=false,timeout,poll,script;
  const previous=window.onYouTubeIframeAPIReady;
  const finish=(error,value)=>{
   if(settled)return;
   settled=true;
   clearTimeout(timeout);
   clearInterval(poll);
   if(window.onYouTubeIframeAPIReady===ready)window.onYouTubeIframeAPIReady=previous;
   if(error&&!window.YT?.Player)script?.remove();
   error?reject(error):resolve(value);
  };
  const ready=()=>{
   if(typeof previous==='function')previous();
   if(window.YT?.Player)finish(null,window.YT);
  };
  window.onYouTubeIframeAPIReady=ready;
  script=document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  const created=!script;
  if(!script){
   script=document.createElement('script');
   script.src='https://www.youtube.com/iframe_api';
   script.async=true;
  }
  script.addEventListener('error',()=>finish(new Error('youtube-api-unavailable')),{once:true});
  if(created)document.head.appendChild(script);
  poll=setInterval(()=>{if(window.YT?.Player)finish(null,window.YT);},100);
  timeout=setTimeout(()=>finish(new Error('youtube-api-timeout')),PLAYER_API_TIMEOUT);
 }).catch(error=>{youtubeApiPromise=null;throw error;});
 return youtubeApiPromise;
}

function loadTwitchApi(){
 if(window.Twitch?.Player)return Promise.resolve(window.Twitch);
 if(twitchApiPromise)return twitchApiPromise;
 twitchApiPromise=new Promise((resolve,reject)=>{
  let settled=false,timeout,poll,script;
  const finish=(error,value)=>{
   if(settled)return;
   settled=true;
   clearTimeout(timeout);
   clearInterval(poll);
   if(error&&!window.Twitch?.Player)script?.remove();
   error?reject(error):resolve(value);
  };
  script=document.querySelector('script[src="https://player.twitch.tv/js/embed/v1.js"]');
  const created=!script;
  if(!script){
   script=document.createElement('script');
   script.src='https://player.twitch.tv/js/embed/v1.js';
   script.async=true;
  }
  script.addEventListener('error',()=>finish(new Error('twitch-api-unavailable')),{once:true});
  if(created)document.head.appendChild(script);
  poll=setInterval(()=>{if(window.Twitch?.Player)finish(null,window.Twitch);},100);
  timeout=setTimeout(()=>finish(new Error('twitch-api-timeout')),PLAYER_API_TIMEOUT);
 }).catch(error=>{twitchApiPromise=null;throw error;});
 return twitchApiPromise;
}

function sourceFitsViewport(stream){
 if(stream.kind!=='twitch'||typeof window==='undefined')return true;
 const landscape=window.innerWidth>window.innerHeight;
 return landscape?(window.innerWidth>=400&&window.innerHeight>=300):window.innerWidth>=600;
}
function chooseNext(current,failedUntil){
 const now=Date.now();
 const alternatives=SPORT_STREAMS.map((stream,index)=>({stream,index,blockedUntil:failedUntil.get(stream.id)||0}))
  .filter(item=>item.index!==current&&sourceFitsViewport(item.stream));
 const eligible=alternatives.filter(item=>item.blockedUntil<=now);
 const candidates=eligible.length?eligible:[...alternatives].sort((a,b)=>a.blockedUntil-b.blockedUntil).slice(0,1);
 const pool=candidates.flatMap(item=>Array(item.stream.weight).fill(item.index));
 return pool[Math.floor(Math.random()*pool.length)]??((current+1)%SPORT_STREAMS.length);
}
function configuredPublicOrigin(){
 const configured=String(import.meta.env.VITE_PUBLIC_APP_ORIGIN||'https://3b-international.vercel.app').trim();
 if(typeof window!=='undefined'){
  const native=window.location.protocol==='capacitor:'||(window.location.hostname==='localhost'&&window.location.protocol==='https:');
  if(!native&&/^https?:\/\//i.test(window.location.origin))return window.location.origin;
 }
 return /^https?:\/\//i.test(configured)?configured.replace(/\/$/,''):'';
}
function youtubeUrl(stream,nonce,videoId=''){
 const origin=configuredPublicOrigin();
 const originParam=origin?`&origin=${encodeURIComponent(origin)}`:'';
 const target=/^[A-Za-z0-9_-]{6,20}$/.test(videoId)?videoId:`live_stream?channel=${encodeURIComponent(stream.channel)}`;
 return `https://www.youtube-nocookie.com/embed/${target}${target.includes('?')?'&':'?'}autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1${originParam}&_=${nonce}`;
}

function LivePlayer({stream,nonce,videoId,onReady,onPlaying,onState,onUnavailable,onBlocked,onMetadata}){
 const iframeRef=useRef(null);
 const mountId=useMemo(()=>`sport-live-${stream.id}-${nonce}`,[stream.id,nonce]);
 const src=useMemo(()=>stream.kind==='youtube'?youtubeUrl(stream,nonce,videoId):'',[stream,nonce,videoId]);

 useEffect(()=>{
  let disposed=false;
  let player=null;
  let metadataTimer=null;
  const fail=reason=>{if(!disposed)onUnavailable(reason);};
  const reportMetadata=target=>{
   try{
    const data=target?.getVideoData?.()||{};
    onMetadata?.({
     title:cleanText(data.title,180),videoId:cleanText(data.video_id,24),author:cleanText(data.author,100),
    });
   }catch{/* Player metadata is optional. */}
  };

  if(stream.kind==='twitch'){
   loadTwitchApi().then(Twitch=>{
    if(disposed)return;
    const configured=configuredPublicOrigin();
    const parent=configured?new URL(configured).hostname:(window.location.hostname||'localhost');
    player=new Twitch.Player(mountId,{channel:stream.channel,parent:[parent],width:'100%',height:'100%',autoplay:true,muted:true,layout:'video'});
    player.addEventListener(Twitch.Player.READY,onReady);
    player.addEventListener(Twitch.Player.PLAYING,onPlaying);
    player.addEventListener(Twitch.Player.PAUSE,()=>onState('paused'));
    player.addEventListener(Twitch.Player.PLAY,()=>onState('buffering'));
    player.addEventListener(Twitch.Player.OFFLINE,()=>fail('offline'));
    player.addEventListener(Twitch.Player.ENDED,()=>fail('ended'));
    player.addEventListener(Twitch.Player.PLAYBACK_BLOCKED,onBlocked);
   }).catch(()=>fail('player-error'));
  }else{
   loadYouTubeApi().then(YT=>{
    if(disposed||!iframeRef.current)return;
    player=new YT.Player(iframeRef.current,{
     events:{
      onReady:event=>{
       onReady();
       reportMetadata(event.target);
       metadataTimer=setInterval(()=>reportMetadata(event.target),60000);
       try{event.target.mute();event.target.playVideo();}catch{/* Autoplay can require a user gesture. */}
      },
      onStateChange:event=>{
       if(event.data===YT.PlayerState.PLAYING){reportMetadata(event.target);onPlaying();}
       else if(event.data===YT.PlayerState.ENDED)fail('ended');
       else if(event.data===YT.PlayerState.PAUSED)onState('paused');
       else if(event.data===YT.PlayerState.BUFFERING)onState('buffering');
      },
      onError:event=>fail('youtube-'+event.data),
      onAutoplayBlocked:onBlocked
     }
    });
   }).catch(()=>fail('player-error'));
  }
  return()=>{
   disposed=true;
   clearInterval(metadataTimer);
   try{
    if(stream.kind==='youtube')player?.destroy?.();
    else player?.pause?.();
   }catch{/* Best-effort cleanup for third-party players. */}
   const mount=document.getElementById(mountId);
   if(mount)mount.replaceChildren();
  };
 },[mountId,onBlocked,onMetadata,onPlaying,onReady,onState,onUnavailable,stream]);

 if(stream.kind==='twitch')return <div id={mountId} className="sport-live-sdk-player"/>;
 return <iframe
  ref={iframeRef}
  src={src}
  title={'Direct sport · '+stream.name}
  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
  allowFullScreen
  referrerPolicy="strict-origin-when-cross-origin"
 />;
}

const STATUS_LABELS={
 consent:'Activation des lecteurs requise',
 searching:'Recherche du direct officiel…',
 ready:'Lecteur prêt',
 playing:'EN DIRECT',
 paused:'Direct en pause',
 buffering:'Connexion au direct…',
 blocked:'Appuie sur lecture',
 switching:'Direct terminé · recherche du suivant…',
 waiting:'Aucun direct disponible · nouvelle recherche dans une minute…'
};

function eventDateLabel(event){
 if(!event?.start)return 'Horaire à confirmer';
 return new Intl.DateTimeFormat('fr-FR',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(event.start));
}
function eventScoreLabel(event){
 if(event?.homeScore===''||event?.awayScore==='')return '';
 return `${event.homeScore} – ${event.awayScore}`;
}
function eventStateLabel(event){
 if(event?.state==='live')return 'EN COURS';
 if(event?.state==='final')return 'TERMINÉ';
 if(event?.state==='postponed')return 'REPORTÉ';
 return eventDateLabel(event);
}
export default function SportLive(){
 const[index,setIndex]=useState(()=>{
  const first=SPORT_STREAMS.findIndex(sourceFitsViewport);
  return first>=0?first:0;
 });
 const[nonce,setNonce]=useState(0);
 const[mediaConsent,setMediaConsent]=useState(readMediaConsent);
 const[status,setStatus]=useState('searching');
 const[loaded,setLoaded]=useState(false);
 const[landscape,setLandscape]=useState(false);
 const[fullscreen,setFullscreen]=useState(false);
 const[keepAwake,setKeepAwake]=useState(true);
 const[awake,setAwake]=useState(false);
 const[playerMeta,setPlayerMeta]=useState({title:'',videoId:'',author:''});
 const replayFailuresRef=useRef(0);
 const shellRef=useRef(null);
 const recommendedSourceRef=useRef('');
 const failedUntilRef=useRef(new Map());
 const failureCountRef=useRef(0);
 const switchLockRef=useRef(false);
 const switchTimerRef=useRef(null);
 const retryTimerRef=useRef(null);
 const stallTimerRef=useRef(null);
 const visibilityTimerRef=useRef(null);
 const statusRef=useRef(status);
 const stream=SPORT_STREAMS[index];

 useEffect(()=>{statusRef.current=status;},[status]);
 useEffect(()=>{switchLockRef.current=false;},[index,nonce]);

 const moveNext=useCallback(()=>{
  clearTimeout(switchTimerRef.current);
  clearTimeout(retryTimerRef.current);
  clearTimeout(stallTimerRef.current);
  setLoaded(false);
  setPlayerMeta({title:'',videoId:'',author:''});
  setStatus('searching');
  setIndex(current=>{
   const recommended=recommendedSourceRef.current;
   const recommendedIndex=SPORT_STREAMS.findIndex(source=>source.id===recommended);
   const allowed=recommendedIndex>=0&&recommendedIndex!==current&&sourceFitsViewport(SPORT_STREAMS[recommendedIndex]);
   const blockedUntil=allowed?(failedUntilRef.current.get(recommended)||0):Infinity;
   return allowed&&blockedUntil<=Date.now()?recommendedIndex:chooseNext(current,failedUntilRef.current);
  });
  setNonce(value=>value+1);
 },[]);
 const unavailable=useCallback(()=>{
  if(switchLockRef.current)return;
  switchLockRef.current=true;
  failedUntilRef.current.set(stream.id,Date.now()+5*60*1000);
  failureCountRef.current+=1;
  const availableSourceCount=Math.max(1,SPORT_STREAMS.filter(sourceFitsViewport).length);
  setLoaded(false);
  if(failureCountRef.current>=availableSourceCount){
   setStatus('waiting');
   retryTimerRef.current=setTimeout(()=>{
    failureCountRef.current=0;
    moveNext();
   },ALL_SOURCES_RETRY_DELAY);
   return;
  }
  setStatus('switching');
  switchTimerRef.current=setTimeout(()=>moveNext(),650);
 },[moveNext,stream.id]);

 const handleReady=useCallback(()=>{
  setLoaded(true);
  setStatus(current=>current==='playing'?current:'ready');
 },[]);

 const handlePlaying=useCallback(()=>{
  clearTimeout(retryTimerRef.current);
  clearTimeout(stallTimerRef.current);
  failureCountRef.current=0;
  replayFailuresRef.current=0;
  failedUntilRef.current.delete(stream.id);
  setLoaded(true);
  setStatus('playing');
 },[stream.id]);

 const handleState=useCallback(nextStatus=>{
  clearTimeout(stallTimerRef.current);
  setLoaded(true);
  setStatus(nextStatus);
  if(nextStatus==='buffering'){
   stallTimerRef.current=setTimeout(()=>{
    if(document.visibilityState==='visible')unavailable('stalled');
   },90000);
  }
 },[unavailable]);

 const handleBlocked=useCallback(()=>{
  clearTimeout(stallTimerRef.current);
  setLoaded(true);
  setStatus('blocked');
 },[]);
 const handleMetadata=useCallback(next=>{
  setPlayerMeta(current=>{
   const normalized={title:cleanText(next?.title,180),videoId:cleanText(next?.videoId,24),author:cleanText(next?.author,100)};
   return current.title===normalized.title&&current.videoId===normalized.videoId&&current.author===normalized.author?current:normalized;
  });
 },[]);
 const handleConfirmedFinished=useCallback(()=>unavailable('match-finished'),[unavailable]);
 const director=useSportDirector({
  sourceId:stream.id,playerMeta,mediaConsent,onConfirmedFinished:handleConfirmedFinished,
 });
 useEffect(()=>{
  recommendedSourceRef.current=director.recommendedSourceId;
 },[director.recommendedSourceId]);

 const directorPlaybackMode=director.playbackMode;
 const directorFallbackCount=director.fallbackVideos.length;
 const advanceDirectorFallback=director.advanceFallback;
 const handlePlaybackUnavailable=useCallback(reason=>{
  if(directorPlaybackMode==='replay'){
   if(reason==='ended'){
    replayFailuresRef.current=0;
    setLoaded(false);setStatus('searching');
    advanceDirectorFallback();setNonce(value=>value+1);
    return;
   }
   replayFailuresRef.current+=1;
   if(replayFailuresRef.current<Math.max(1,directorFallbackCount)){
    setLoaded(false);setStatus('searching');
    advanceDirectorFallback();setNonce(value=>value+1);
    return;
   }
   replayFailuresRef.current=0;
  }
  unavailable(reason);
 },[advanceDirectorFallback,directorFallbackCount,directorPlaybackMode,unavailable]);

 useEffect(()=>{
  const recommended=director.recommendedSourceId;
  if(!mediaConsent||status!=='searching'||!recommended||recommended===stream.id)return;
  const target=SPORT_STREAMS.findIndex(source=>source.id===recommended&&sourceFitsViewport(source));
  if(target<0||(failedUntilRef.current.get(recommended)||0)>Date.now())return;
  queueMicrotask(()=>{
   switchLockRef.current=true;
   setLoaded(false);
   setPlayerMeta({title:'',videoId:'',author:''});
   setIndex(target);
   setNonce(value=>value+1);
  });
 },[director.recommendedSourceId,mediaConsent,status,stream.id]);

 useEffect(()=>{
  if(!mediaConsent)return undefined;
  const schedule=()=>{
   clearTimeout(visibilityTimerRef.current);
   if(document.visibilityState!=='visible')return;
   visibilityTimerRef.current=setTimeout(()=>{
    const safe=['playing','paused','blocked'];
    if(!safe.includes(statusRef.current))unavailable('no-live');
   },30000);
  };
  schedule();
  document.addEventListener('visibilitychange',schedule);
  return()=>{
   document.removeEventListener('visibilitychange',schedule);
   clearTimeout(visibilityTimerRef.current);
  };
 },[index,mediaConsent,nonce,unavailable]);

 useEffect(()=>()=>{
  clearTimeout(switchTimerRef.current);
  clearTimeout(retryTimerRef.current);
  clearTimeout(stallTimerRef.current);
  clearTimeout(visibilityTimerRef.current);
 },[]);

 useEffect(()=>{
  const sync=()=>{
   const active=mediaConsent&&window.innerWidth<=1000&&window.innerWidth>window.innerHeight;
   setLandscape(active);
   document.documentElement.classList.toggle('sport-live-landscape-open',active);
   if(mediaConsent&&!sourceFitsViewport(stream)&&!switchLockRef.current){
    switchLockRef.current=true;
    setLoaded(false);
    setStatus('switching');
    moveNext();
   }
  };
  sync();
  window.addEventListener('resize',sync);
  window.screen?.orientation?.addEventListener?.('change',sync);
  return()=>{
   window.removeEventListener('resize',sync);
   window.screen?.orientation?.removeEventListener?.('change',sync);
   document.documentElement.classList.remove('sport-live-landscape-open');
  };
 },[mediaConsent,moveNext,stream]);
 useEffect(()=>{
  let active=true;
  let lock=null;
  const request=async()=>{
   if(!active||!mediaConsent||!keepAwake||status!=='playing'||document.visibilityState!=='visible'||!navigator.wakeLock?.request)return;
   if(lock&&!lock.released)return;
   try{
    const nextLock=await navigator.wakeLock.request('screen');
    if(!active){try{await nextLock.release();}catch{/* The browser may already have released it. */}return;}
    lock=nextLock;
    setAwake(true);
    lock.addEventListener?.('release',()=>{
     if(active){lock=null;setAwake(false);}
    });
   }catch{if(active)setAwake(false);}
  };
  const visibility=()=>{
   if(document.visibilityState==='visible')request();
   else setAwake(false);
  };
  if(keepAwake&&status==='playing')request();
  else queueMicrotask(()=>{if(active)setAwake(false);});
  document.addEventListener('visibilitychange',visibility);
  return()=>{
   active=false;
   document.removeEventListener('visibilitychange',visibility);
   try{lock?.release?.();}catch{/* Wake Lock cleanup is best-effort. */}
  };
 },[keepAwake,mediaConsent,status]);

 useEffect(()=>{
  const sync=()=>setFullscreen(document.fullscreenElement===shellRef.current);
  document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);

 async function toggleFullscreen(){
  try{
   if(document.fullscreenElement){
    await document.exitFullscreen();
    try{window.screen?.orientation?.unlock?.();}catch{/* Orientation locking is optional. */}
   }else{
    await shellRef.current?.requestFullscreen?.();
    try{await window.screen?.orientation?.lock?.('landscape');}catch{/* Orientation locking is optional. */}
   }
  }catch{/* Fullscreen can be denied by the browser or WebView. */}
 }
 function activateMedia(){
  try{window.localStorage.setItem(MEDIA_CONSENT_KEY,'accepted');}catch{/* Private browsing may deny persistent storage. */}
  failureCountRef.current=0;
  switchLockRef.current=false;
  setMediaConsent(true);
  setLoaded(false);
  setStatus('searching');
  setNonce(value=>value+1);
 }
 function revokeMedia(){
  clearTimeout(switchTimerRef.current);
  clearTimeout(retryTimerRef.current);
  clearTimeout(stallTimerRef.current);
  try{window.localStorage.removeItem(MEDIA_CONSENT_KEY);}catch{/* Private browsing may deny persistent storage. */}
  failureCountRef.current=0;
  switchLockRef.current=false;
  setMediaConsent(false);
  setLoaded(false);
  setAwake(false);
  setStatus('searching');
 }
 function reload(){
  clearTimeout(switchTimerRef.current);
  clearTimeout(retryTimerRef.current);
  clearTimeout(stallTimerRef.current);
  failureCountRef.current=0;
  failedUntilRef.current.delete(stream.id);
  switchLockRef.current=true;
  setLoaded(false);
  setStatus('searching');
  setNonce(value=>value+1);
 }

 function manualNext(){
  clearTimeout(retryTimerRef.current);
  failureCountRef.current=0;
  if(director.playbackMode==='replay'&&director.fallbackVideos.length){
   replayFailuresRef.current=0;
   setLoaded(false);setStatus('searching');
   director.advanceFallback();setNonce(value=>value+1);
   return;
  }
  switchLockRef.current=true;
  setLoaded(false);
  setStatus('switching');
  moveNext();
 }

 const isReplay=director.playbackMode==='replay';
 const isLiveMode=director.playbackMode==='live'||director.playbackMode==='scheduled';
 const visibleStatus=mediaConsent?status:'consent';
 const playerStatus=mediaConsent&&isReplay&&status==='playing'?'REPLAY OFFICIEL':STATUS_LABELS[visibleStatus]||visibleStatus;
 const shellClass=['sport-live-player-shell',landscape?'is-landscape':'',fullscreen?'is-fullscreen':''].filter(Boolean).join(' ');

 return <div className="sport-live-view">
  <header className="sport-live-hero">
   <div>
    <p className="eyebrow">SPORT 3B · CONTINU</p>
    <h2>Du sport sans écran vide.</h2>
    <p>Un direct officiel est prioritaire dès qu’il existe. Entre deux directs, 3B lance automatiquement un replay, un résumé ou des temps forts officiels, puis revient au direct dès qu’il est confirmé.</p>
   </div>
   <div className="sport-live-badge"><Radio size={19}/><span>RÉGIE 3B</span><strong>{!mediaConsent?'À ACTIVER':isReplay?'REPLAY':isLiveMode?'DIRECT':'RECHERCHE'}</strong></div>
  </header>

  <section className="sport-director-board" aria-label="Régie sportive 3B">
   <div className={'sport-director-event is-current '+(isReplay?'is-replay':'')}>
    <CalendarClock size={22}/>
    <div>
     <span>{isReplay?'REPLAY OFFICIEL EN COURS':director.matchedEvent?'MATCH RECONNU SUR LE DIRECT':'PROGRAMME SPORTIF EN COURS'}</span>
     <strong>{isReplay?(director.fallbackVideo?.title||'Sélection sportive officielle'):director.currentEvent?.name||'Synchronisation du programme…'}</strong>
     <small>{isReplay?[director.fallbackVideo?.sourceName,'Le direct reprend automatiquement dès qu’il est confirmé'].filter(Boolean).join(' · '):director.currentEvent?[director.currentEvent.sport,director.currentEvent.league].filter(Boolean).join(' · '):'France et Europe en priorité'}</small>
    </div>
    {isReplay?<div className="sport-director-event-state"><b>SPORT CONTINU</b><em>source officielle</em></div>:director.currentEvent&&<div className="sport-director-event-state">
     <b>{eventScoreLabel(director.currentEvent)||eventStateLabel(director.currentEvent)}</b>
     {director.matchedEvent&&<em>{Math.round(director.matchConfidence*100)}% reconnu</em>}
    </div>}
   </div>
   <div className="sport-director-event is-next">
    <SkipForward size={20}/>
    <div><span>PROCHAIN MATCH REPÉRÉ</span><strong>{director.nextEvent?.name||'Recherche dans le programme officiel'}</strong><small>{director.nextEvent?[eventDateLabel(director.nextEvent),director.nextEvent.league].filter(Boolean).join(' · '):'La régie ne coupe jamais un match sur une simple estimation.'}</small></div>
   </div>
   <button type="button" className="sport-director-refresh" disabled={director.checking} onClick={()=>director.refresh().catch(()=>{})} aria-label="Actualiser la régie sportive">
    <RefreshCw size={16} className={director.checking?'is-spinning':''}/><span>{director.checking?'Vérification…':'Actualiser'}</span>
   </button>
  </section>
  {director.error&&<p className="surface-notice sport-director-error" role="status">Programme momentanément indisponible. Le direct actuel reste conservé.</p>}

  <div ref={shellRef} className={shellClass}>
   <div className="sport-live-player-top">
    <div className="sport-live-channel">
     <span className={'sport-live-pulse '+(mediaConsent&&status==='playing'?(isReplay?'is-replay':'is-playing'):'')}/>
     <strong>{stream.name}</strong>
     <small>{stream.zone} · {stream.sport}</small>
     <span className="sport-live-status" aria-live="polite">{playerStatus}</span>
    </div>
    <div className="sport-live-actions">
     <button type="button" onClick={toggleFullscreen} disabled={!mediaConsent} aria-label={fullscreen?'Quitter le plein écran':'Plein écran'}>
      {fullscreen?<Minimize2 size={16}/>:<Maximize2 size={16}/>}<span>{fullscreen?'Réduire':'Plein écran'}</span>
     </button>
     <button type="button" onClick={reload} disabled={!mediaConsent} aria-label="Relancer le direct"><RefreshCw size={16}/><span>Relancer</span></button>
     <button type="button" onClick={manualNext} disabled={!mediaConsent} aria-label="Choisir un autre direct"><SkipForward size={16}/><span>Autre sport</span></button>
    </div>
   </div>

   <div className="sport-live-frame">
    {!mediaConsent?<div className="sport-live-consent">
     <Tv2 size={38}/>
     <strong>Activer les lecteurs officiels</strong>
     <p>YouTube ou Twitch recevront les données techniques nécessaires à la lecture du direct. Le choix reste modifiable à tout moment.</p>
     <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Voir la politique de confidentialité</a>
     <button type="button" onClick={activateMedia}>Activer le direct sport</button>
    </div>:<>
     {!loaded&&<div className="sport-live-loading">
      <Tv2 size={34}/><strong>{isReplay?'Chargement du sport officiel…':STATUS_LABELS[status]}</strong>
      <span>{isReplay?'Préparation du prochain replay ou résumé officiel.':'Le système vérifie les sources officielles et conserve le direct jusqu’à sa fin.'}</span>
     </div>}
     {!['switching','waiting'].includes(status)&&<LivePlayer
      key={stream.id+'-'+nonce+'-'+(director.playbackVideoId||'channel')}
      stream={stream}
      nonce={nonce}
      videoId={director.playbackVideoId}
      onReady={handleReady}
      onPlaying={handlePlaying}
      onState={handleState}
      onUnavailable={handlePlaybackUnavailable}
      onBlocked={handleBlocked}
      onMetadata={handleMetadata}
     />}
    </>}
   </div>
   <div className="sport-live-player-bottom">
    {mediaConsent?<>
     <span className="sport-live-monitor"><Radio size={15}/>{isReplay?'Replay officiel en cours':director.matchedEvent?'Match identifié et suivi':'Chaîne officielle surveillée'}</span>
     <span>{isReplay?'Aucun écran vide : le prochain contenu officiel démarre à la fin. La régie continue de rechercher un direct.':director.matchedEvent?'Deux confirmations serveur sont exigées avant de passer au match suivant.':'Aucun changement programmé · bascule seulement si le lecteur se termine ou devient indisponible.'}</span>
     <button type="button" className={'sport-live-awake '+(keepAwake?'is-on':'')} aria-pressed={keepAwake} onClick={()=>setKeepAwake(value=>!value)}>
      {keepAwake?(awake?'Écran maintenu allumé':'Maintien d’écran demandé'):'Veille autorisée'}
     </button>
     <button type="button" className="sport-live-privacy" onClick={revokeMedia}>Désactiver les lecteurs</button>
     <a href={stream.home} target="_blank" rel="noopener noreferrer">Source officielle <ExternalLink size={14}/></a>
    </>:<>
     <span className="sport-live-monitor"><Radio size={15}/>Lecteurs externes désactivés</span>
     <span>Aucune vidéo YouTube ou Twitch n’est chargée avant ton activation.</span>
    </>}
   </div>
  </div>

  <div className="sport-live-strip">
   <div><Globe2 size={20}/><span><strong>Direct prioritaire · replay automatique</strong><small>France d’abord, puis Europe et monde. « Autre sport » passe immédiatement au contenu officiel suivant.</small></span></div>
   <button type="button" onClick={manualNext} disabled={!mediaConsent}><SkipForward size={17}/>Autre sport</button>
  </div>

  <div className="sport-live-hubs">
   <div><p className="eyebrow">SOURCES OFFICIELLES</p><h3>Les directs restent intégrés dans 3B quand le diffuseur l’autorise.</h3></div>
   <div className="sport-live-hub-links">
    {SPORT_HUBS.map(hub=><a key={hub.href} href={hub.href} target="_blank" rel="noopener noreferrer">{hub.label}<ExternalLink size={14}/></a>)}
   </div>
  </div>

  <p className="muted-copy sport-live-rights">Les droits de diffusion dépendent du pays et du diffuseur. Quand aucun direct intégrable n’est disponible, 3B enchaîne uniquement des vidéos officielles ; aucun flux piraté n’est utilisé.</p>
 </div>;
}
