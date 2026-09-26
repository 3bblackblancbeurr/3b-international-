import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {canConfirmEventFinished,isEventCurrent,matchEventToTitle} from '../../shared/sport-director.js';

const SCHEDULE_REFRESH=120000;
const EVENT_REFRESH=75000;

function apiEndpoint(query=''){
 const configured=String(import.meta.env.VITE_PUBLIC_APP_ORIGIN||'https://3b-international.vercel.app').trim().replace(/\/$/,'');
 const native=typeof window!=='undefined'&&(
  window.location.protocol==='capacitor:'||
  (window.location.hostname==='localhost'&&window.location.protocol==='https:')
 );
 const base=native&&/^https:\/\//i.test(configured)?configured:'';
 return `${base}/api/sport-director${query}`;
}

async function readJson(url,signal){
 const response=await fetch(url,{
  method:'GET',signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
  headers:{accept:'application/json'},
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.error||`Régie sport indisponible (${response.status}).`);
 return data;
}

function liveForSource(snapshot,sourceId){
 return snapshot?.liveSources?.find(item=>item.sourceId===sourceId&&item.live)||null;
}

export default function useSportDirector({sourceId,playerMeta,mediaConsent,onConfirmedFinished}){
 const[snapshot,setSnapshot]=useState(null);
 const[error,setError]=useState('');
 const[checking,setChecking]=useState(false);
 const[fallbackCursor,setFallbackCursor]=useState(0);
 const finalCountRef=useRef(0);
 const finishedEventRef=useRef('');
 const callbackRef=useRef(onConfirmedFinished);
 useEffect(()=>{callbackRef.current=onConfirmedFinished;},[onConfirmedFinished]);
 const refresh=useCallback(async signal=>{
  const data=await readJson(apiEndpoint(),signal);
  setSnapshot(data);
  setError('');
  return data;
 },[]);

 useEffect(()=>{
  let active=true,timer=null,controller=null;
  const run=async()=>{
   if(!active||document.visibilityState!=='visible')return;
   controller?.abort();
   controller=new AbortController();
   setChecking(true);
   try{await refresh(controller.signal);}
   catch(reason){if(active)setError(reason.message);}
   finally{
    if(active){setChecking(false);timer=setTimeout(run,SCHEDULE_REFRESH);}
   }
  };
  const visible=()=>{
   if(document.visibilityState==='visible')run();
   else{controller?.abort();clearTimeout(timer);}
  };
  run();
  document.addEventListener('visibilitychange',visible);
  return()=>{
   active=false;controller?.abort();clearTimeout(timer);
   document.removeEventListener('visibilitychange',visible);
  };
 },[refresh]);

 const sourceLive=useMemo(()=>liveForSource(snapshot,sourceId),[snapshot,sourceId]);
 const sourceEvent=useMemo(()=>(snapshot?.events||[])
  .filter(event=>event.sourceId===sourceId&&isEventCurrent(event))
  .sort((a,b)=>(b.state==='live')-(a.state==='live')||Date.parse(a.start)-Date.parse(b.start))[0]||null,
 [snapshot?.events,sourceId]);
 const sourceFallbacks=useMemo(()=>{
  const all=Array.isArray(snapshot?.fallbackVideos)?snapshot.fallbackVideos:[];
  const matching=all.filter(item=>item.sourceId===sourceId);
  return matching.length?matching:all;
 },[snapshot?.fallbackVideos,sourceId]);
 const fallbackVideo=sourceFallbacks.length?sourceFallbacks[fallbackCursor%sourceFallbacks.length]:null;
 const confirmedLive=Boolean(sourceLive?.live);
 const playbackMode=confirmedLive?'live':sourceEvent?'scheduled':fallbackVideo?'replay':'channel';
 const effectiveTitle=confirmedLive?(playerMeta?.title||sourceLive?.title||''):'';
 const titleMatch=useMemo(
  ()=>matchEventToTitle(effectiveTitle,snapshot?.events||[]),
  [effectiveTitle,snapshot?.events],
 );
 const liveMatchedEvent=useMemo(()=>{
  const eventId=sourceLive?.match?.eventId;
  return eventId?(snapshot?.events||[]).find(event=>event.id===eventId)||null:null;
 },[snapshot?.events,sourceLive?.match?.eventId]);
 const titleMatched=titleMatch?.confidence>=0.58?titleMatch.event:null;
 const matchedEvent=titleMatched||liveMatchedEvent||(playbackMode==='scheduled'?sourceEvent:null);
 const matchBasis=titleMatched?'title':sourceLive?.match?.basis||(playbackMode==='scheduled'?'broadcaster':'');
 const matchConfidence=titleMatched?titleMatch.confidence:(sourceLive?.match?.confidence||(playbackMode==='scheduled'?0.82:0));
 const currentEvent=matchedEvent||snapshot?.currentMatch||snapshot?.current?.[0]||null;
 const nextEvent=(snapshot?.upcoming||[]).find(event=>event.id!==currentEvent?.id)||null;
 const liveVideoId=confirmedLive&&sourceLive?.platform==='youtube'?sourceLive.videoId:'';
 const playbackVideoId=liveVideoId||(playbackMode==='replay'?fallbackVideo?.videoId||'':'');
 const advanceFallback=useCallback(()=>setFallbackCursor(value=>value+1),[]);
 useEffect(()=>{
  finalCountRef.current=0;
  finishedEventRef.current='';
 },[effectiveTitle,matchedEvent?.id]);

 useEffect(()=>{
  if(!mediaConsent||!matchedEvent?.id)return undefined;
  let active=true,timer=null,controller=null;
  const check=async()=>{
   if(!active||document.visibilityState!=='visible')return;
   controller?.abort();
   controller=new AbortController();
   try{
    const data=await readJson(apiEndpoint(`?event=${encodeURIComponent(matchedEvent.id)}`),controller.signal);
    const event=data?.event;
    const stillMatches=matchBasis==='broadcaster'
     ?event?.id===matchedEvent.id
     :matchEventToTitle(effectiveTitle,event?[event]:[])?.confidence>=0.58;
    if(stillMatches&&canConfirmEventFinished(event))finalCountRef.current+=1;
    else finalCountRef.current=0;
    if(finalCountRef.current>=2&&finishedEventRef.current!==event.id){
     finishedEventRef.current=event.id;
     callbackRef.current?.({event,reason:'match-finished'});
     return;
    }
   }catch(reason){
    if(reason?.name!=='AbortError'&&active)setError(current=>current||reason.message);
   }
   if(active)timer=setTimeout(check,EVENT_REFRESH);
  };
  const visible=()=>{
   if(document.visibilityState==='visible')check();
   else{controller?.abort();clearTimeout(timer);}
  };
  check();
  document.addEventListener('visibilitychange',visible);
  return()=>{
   active=false;controller?.abort();clearTimeout(timer);
   document.removeEventListener('visibilitychange',visible);
  };
 },[effectiveTitle,matchBasis,matchedEvent,mediaConsent,sourceId]);

 return {
  snapshot,error,checking,
  currentEvent,nextEvent,matchedEvent,matchConfidence,matchBasis,
  recommendedSourceId:snapshot?.recommendedSourceId||'',
  sourceLive,playbackVideoId,playbackMode,
  fallbackVideos:sourceFallbacks,fallbackVideo,advanceFallback,
  refresh:()=>refresh(new AbortController().signal),
 };
}
