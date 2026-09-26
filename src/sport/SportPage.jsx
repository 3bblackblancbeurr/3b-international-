import {useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowUpRight,RefreshCw,Trophy,Globe2,Flame,Handshake,Users,Dumbbell,
 Sparkles,Languages,MapPin,ShieldCheck,ChevronDown,Clock3,CheckCircle2,
 ClipboardCheck,XCircle,UserRound
} from 'lucide-react';
import {ecosystem,ecosystemPublic} from '../lib/ecosystem.js';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {SPORTS} from '../../supabase/functions/ecosystem/sports.js';
import {H24_CHANNELS,SPORT_FINALS,isTrustedSportEmbed,isTrustedSportShellOrigin,mediaSources,sportPlayerShellUrl} from './media-catalog.js';
import './sport.css';

const SECTIONS=[
 {id:'h24',label:'Chaînes H24',icon:Globe2},
 {id:'finals',label:'Finales',icon:Trophy},
 {id:'news',label:'Actualités',icon:Languages},
 {id:'challenges',label:'Défis 3B',icon:Flame},
 {id:'collabs',label:'Collaborations',icon:Handshake}
];

const CHALLENGE_PRESENTATION={
 'move-30x7':{icon:Dumbbell,level:'Tous niveaux'},
 'steps-10000':{icon:Users,level:'Accessible'},
 'local-match':{icon:MapPin,level:'Rencontre réelle'},
 'new-sport':{icon:Sparkles,level:'1 nouvelle pratique'}
};

const FALLBACK_CHALLENGES=[
 {id:'move-30x7',title:'30 minutes · 7 jours',tag:'RÉGULARITÉ',description:'Bouge au moins 30 minutes par jour pendant sept jours distincts.',tracker:'daily_minutes',target_value:7,daily_minimum:30,unit:'jours validés',xp_reward:120},
 {id:'steps-10000',title:'10 000 pas collectif',tag:'ENDURANCE',description:'Atteins au moins 10 000 pas sur une journée.',tracker:'steps',target_value:10000,unit:'pas',xp_reward:60},
 {id:'local-match',title:'Match local 3B',tag:'RENCONTRE',description:'Participe réellement à une rencontre sportive locale puis décris l’événement pour validation.',tracker:'event',target_value:1,unit:'rencontre',xp_reward:100},
 {id:'new-sport',title:'Découvre un nouveau sport',tag:'EXPLORATION',description:'Teste une discipline nouvelle pour toi et raconte brièvement l’expérience avant validation.',tracker:'session',target_value:1,unit:'session',xp_reward:80}
];

const COLLABORATIONS=[
 {title:'Club ou association',tag:'TERRAIN',description:'Présente ton club, ton association ou ton projet sportif et explique ce que tu aimerais construire avec 3B.',icon:ShieldCheck},
 {title:'Athlète ou coach',tag:'TALENT',description:'Profil, discipline, parcours, besoins et idée de collaboration : crée une proposition claire pour le collectif.',icon:Trophy},
 {title:'Tournoi ou événement',tag:'ÉVÉNEMENT',description:'Propose un tournoi, une rencontre, une animation locale ou une activation sportive avec un format concret.',icon:Users},
 {title:'Textile & équipement',tag:'CRÉATION',description:'Imagine un maillot, une tenue, un équipement ou une capsule sport 3B puis partage le concept avec la communauté.',icon:Sparkles}
];

const dateLabel=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});
const numberLabel=value=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(value)||0);

function challengeStatus(entry){
 if(!entry)return{label:'Disponible',tone:'idle'};
 if(entry.status==='joined')return{label:'En cours',tone:'active'};
 if(entry.status==='eligible')return{label:'Objectif atteint',tone:'eligible'};
 if(entry.status==='submitted')return{label:'Validation en attente',tone:'pending'};
 if(entry.status==='verified')return{label:'Validé 3B',tone:'verified'};
 if(entry.status==='abandoned')return{label:'Abandonné',tone:'muted'};
 return{label:entry.status,tone:'idle'};
}

function trackerActionLabel(challenge){
 if(challenge.tracker==='daily_minutes')return 'Enregistrer 30 min aujourd’hui';
 if(challenge.tracker==='steps')return 'Enregistrer mes pas';
 if(challenge.tracker==='event')return 'J’ai participé à la rencontre';
 return 'J’ai testé un nouveau sport';
}

function progressLabel(challenge,entry){
 const progress=Number(entry?.progress||0),target=Number(challenge.target_value||0);
 if(challenge.tracker==='steps')return numberLabel(progress)+' / '+numberLabel(target)+' pas';
 if(challenge.tracker==='daily_minutes')return numberLabel(progress)+' / '+numberLabel(target)+' jours';
 return numberLabel(progress)+' / '+numberLabel(target)+' '+challenge.unit;
}


const SPORT_SOURCE_COOLDOWN=5*60*1000;
const SPORT_PERMANENT_COOLDOWN=6*60*60*1000;
const SPORT_RETRY_ALL=20000;
const SPORT_HEALTH_API='https://3b-international.vercel.app/api/sport-video-health';

function sportNetworkTimeout(base=18000){
 if(typeof navigator==='undefined')return base;
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 if(!connection)return base;
 if(connection.saveData)return Math.round(base*2.5);
 if(connection.effectiveType==='slow-2g'||connection.effectiveType==='2g')return Math.round(base*2.5);
 if(connection.effectiveType==='3g')return Math.round(base*1.7);
 return base;
}

function sportToken(){
 try{return crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g,'');}catch{}
 return('3b'+Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g,'');
}

function SportMediaPlayer({item,consent,onConsent,cinema,onCinema,onNext}){
 const iframeRef=useRef(null);
 const failureRef=useRef(new Map());
 const retryRef=useRef(new Map());
 const lastAdvanceRef=useRef(0);
 const channelFailoverRef=useRef(0);
 const readyRef=useRef(false);
 const signalAtRef=useRef(0);
 const resumeWriteAtRef=useRef(0);
 const sources=useMemo(()=>mediaSources(item),[item]);
 const[sourceIndex,setSourceIndex]=useState(0);
 const[epoch,setEpoch]=useState(0);
 const[playerState,setPlayerState]=useState('idle');
 const[statusMessage,setStatusMessage]=useState('');
 const[preflightStatus,setPreflightStatus]=useState('idle');
 const[online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine!==false);
 const[visible,setVisible]=useState(()=>typeof document==='undefined'||document.visibilityState!=='hidden');
 const source=sources[sourceIndex]||sources[0]||null;
 const trusted=!!source&&isTrustedSportEmbed(source.embedUrl)&&!!source.videoId;
 const isH24=item?.badge==='H24';
 const playerToken=useMemo(()=>sportToken(),[item?.id,source?.id,epoch]);

 function resumeKey(candidate=source){return candidate?'3b-sport-resume:'+candidate.id:'';}
 function readResume(candidate=source){
  if(!candidate)return 0;
  try{return Math.max(0,Number(sessionStorage.getItem(resumeKey(candidate)))||0);}catch{return 0;}
 }
 function clearResume(candidate=source){
  if(!candidate)return;
  try{sessionStorage.removeItem(resumeKey(candidate));}catch{}
 }
 function blockedUntil(candidate){
  if(!candidate)return 0;
  const key=item.id+':'+candidate.id;
  let until=failureRef.current.get(key)||0;
  try{until=Math.max(until,Number(sessionStorage.getItem('3b-sport-block:'+key))||0);}catch{}
  return until;
 }
 function markFailure(candidate,code=0){
  if(!candidate)return;
  const key=item.id+':'+candidate.id;
  const permanent=[2,100,101,150].includes(Number(code));
  const ttl=permanent?SPORT_PERMANENT_COOLDOWN:SPORT_SOURCE_COOLDOWN;
  const until=Date.now()+ttl;
  failureRef.current.set(key,until);
  try{sessionStorage.setItem('3b-sport-block:'+key,String(until));}catch{}
 }
 function clearFailure(candidate){
  if(!candidate)return;
  const key=item.id+':'+candidate.id;
  failureRef.current.delete(key);
  try{sessionStorage.removeItem('3b-sport-block:'+key);}catch{}
 }

 const frameSrc=useMemo(()=>{
  if(!trusted)return'';
  return sportPlayerShellUrl(source,{
   autoplay:isH24,
   muted:isH24,
   start:readResume(source),
   token:playerToken
  });
 },[trusted,source?.id,isH24,playerToken]);

 useEffect(()=>{
  let index=0;
  if(isH24){
   try{
    const saved=localStorage.getItem('3b-sport-good-source:'+item?.id);
    const found=sources.findIndex(candidate=>candidate.id===saved&&blockedUntil(candidate)<=Date.now());
    if(found>=0)index=found;
   }catch{}
  }
  if(blockedUntil(sources[index])>Date.now()){
   const available=sources.findIndex(candidate=>blockedUntil(candidate)<=Date.now());
   if(available>=0)index=available;
  }
  setSourceIndex(index);
  setEpoch(value=>value+1);
  setPlayerState('idle');
  setStatusMessage('');
  setPreflightStatus('idle');
  readyRef.current=false;
 },[item?.id,isH24,sources]);

 useEffect(()=>{
  const goOnline=()=>{
   setOnline(true);
   setStatusMessage('Connexion retrouvée · reprise automatique.');
   setPlayerState('recovering');
   readyRef.current=false;
   setEpoch(value=>value+1);
  };
  const goOffline=()=>{
   setOnline(false);
   setPlayerState('offline');
   setStatusMessage('Connexion perdue · 3B garde ta position et reprendra ici.');
  };
  window.addEventListener('online',goOnline);
  window.addEventListener('offline',goOffline);
  return()=>{window.removeEventListener('online',goOnline);window.removeEventListener('offline',goOffline);};
 },[]);

 useEffect(()=>{
  const change=()=>{
   const next=document.visibilityState!=='hidden';
   setVisible(next);
   if(next&&online&&['loading','buffering','recovering'].includes(playerState)){
    const staleFor=Date.now()-(signalAtRef.current||Date.now());
    if(staleFor>sportNetworkTimeout(18000)*1.5){
     readyRef.current=false;
     setStatusMessage('Retour dans 3B · contrôle du lecteur en cours.');
     setEpoch(value=>value+1);
    }
   }
  };
  document.addEventListener('visibilitychange',change);
  return()=>document.removeEventListener('visibilitychange',change);
 },[online,playerState]);

 function saveGoodSource(){
  if(!source)return;
  clearFailure(source);
  retryRef.current.delete(source.id+':5');
  retryRef.current.delete(source.id+':153');
  channelFailoverRef.current=0;
  if(isH24){
   try{localStorage.setItem('3b-sport-good-source:'+item.id,source.id);}catch{}
  }
 }

 function advanceSource({markFailureSource=false,errorCode=0,reason='Bascule automatique',fromEnd=false}={}){
  const now=Date.now();
  if(now-lastAdvanceRef.current<900)return;
  lastAdvanceRef.current=now;
  if(source&&markFailureSource)markFailure(source,errorCode);

  if(sources.length>1){
   for(let step=1;step<=sources.length;step+=1){
    const candidateIndex=(sourceIndex+step)%sources.length;
    const candidate=sources[candidateIndex];
    if(blockedUntil(candidate)<=now){
     setSourceIndex(candidateIndex);
     readyRef.current=false;
     setEpoch(value=>value+1);
     setPlayerState(fromEnd?'loading':'recovering');
     setStatusMessage(reason+' · source '+(candidateIndex+1)+'/'+sources.length+'.');
     return;
    }
   }
  }else if(!markFailureSource){
   readyRef.current=false;
   setEpoch(value=>value+1);
   setPlayerState('recovering');
   setStatusMessage('Nouvelle tentative sur la source officielle.');
   return;
  }

  if(isH24&&channelFailoverRef.current<3){
   channelFailoverRef.current+=1;
   setPlayerState('recovering');
   setStatusMessage('Toutes les sources de cette chaîne répondent mal · passage à la chaîne suivante.');
   onNext();
   return;
  }

  setPlayerState('unavailable');
  setStatusMessage('Sources momentanément indisponibles · nouvelle tentative automatique dans quelques secondes.');
 }

 useEffect(()=>{
  if(!consent||!source?.videoId||!online||!visible)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  let active=true;
  setPreflightStatus('checking');
  fetch(SPORT_HEALTH_API+'?video='+encodeURIComponent(source.videoId),{signal:controller.signal})
   .then(response=>response.ok?response.json():Promise.reject(new Error('health')))
   .then(result=>{
    if(!active)return;
    if(result?.available===false){
     setPreflightStatus('unavailable');
     advanceSource({
      markFailureSource:true,
      errorCode:100,
      reason:'Source retirée détectée avant lecture · secours automatique'
     });
    }else if(result?.available===true){
     setPreflightStatus('available');
    }else{
     setPreflightStatus('unknown');
    }
   })
   .catch(()=>{if(active)setPreflightStatus('unknown');})
   .finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[consent,source?.id,source?.videoId,online,visible,item?.id]);

 useEffect(()=>{
  if(playerState!=='unavailable'||!online||!visible)return;
  const timer=setTimeout(()=>{
   failureRef.current.clear();
   channelFailoverRef.current=0;
   setSourceIndex(0);
   readyRef.current=false;
   setEpoch(value=>value+1);
   setPlayerState('recovering');
   setStatusMessage('Nouvelle tentative automatique en cours.');
  },SPORT_RETRY_ALL);
  return()=>clearTimeout(timer);
 },[playerState,online,visible,item?.id]);

 useEffect(()=>{
  if(playerState!=='buffering'||!online||!visible)return;
  const timer=setTimeout(()=>{
   advanceSource({reason:'Buffer trop long · réparation automatique'});
  },sportNetworkTimeout(26000));
  return()=>clearTimeout(timer);
 },[playerState,online,visible,sourceIndex,item?.id]);

 useEffect(()=>{
  if(!consent||!trusted||!frameSrc||!online||!visible||playerState==='unavailable')return;
  readyRef.current=false;
  signalAtRef.current=Date.now();
  setPlayerState('loading');
  setStatusMessage('Connexion sécurisée au lecteur 3B…');

  const applyState=value=>{
   const state=Number(value);
   if(!Number.isFinite(state))return;
   if(state===1){
    readyRef.current=true;
    saveGoodSource();
    setPlayerState('playing');
    setStatusMessage(source?.mode==='fallback'?'Mode secours officiel actif.':'Lecture stable dans 3B.');
   }else if(state===3){
    setPlayerState('buffering');
    setStatusMessage('Mise en mémoire du match…');
   }else if(state===2){
    readyRef.current=true;
    setPlayerState('paused');
    setStatusMessage('Lecture en pause.');
   }else if(state===0){
    clearResume(source);
    if(isH24)advanceSource({reason:'Match terminé · suivant automatique',fromEnd:true});
    else{
     setPlayerState('ready');
     setStatusMessage('Finale terminée.');
    }
   }
  };

  const onMessage=event=>{
   if(event.source!==iframeRef.current?.contentWindow||!isTrustedSportShellOrigin(event.origin))return;
   const data=event.data;
   if(!data||data.type!=='3b-sport-player'||data.token!==playerToken)return;
   signalAtRef.current=Date.now();

   if(data.event==='shell-boot'||data.event==='shell-ready'){
    setStatusMessage('Pont HTTPS 3B connecté · vérification de la vidéo…');
    return;
   }
   if(data.event==='ready'){
    readyRef.current=true;
    setPlayerState('ready');
    setStatusMessage('Lecteur officiel prêt.');
    return;
   }
   if(data.event==='state'){
    applyState(data.state);
    return;
   }
   if(data.event==='time'){
    const seconds=Number(data.currentTime);
    if(Number.isFinite(seconds)&&seconds>=0&&Date.now()-resumeWriteAtRef.current>8000){
     resumeWriteAtRef.current=Date.now();
     try{sessionStorage.setItem(resumeKey(source),String(Math.floor(seconds)));}catch{}
    }
    if('state' in data)applyState(data.state);
    return;
   }
   if(data.event==='error'){
    const code=Number(data.code)||0;
    const retryKey=source.id+':'+code;
    const retried=retryRef.current.get(retryKey)||0;
    if((code===5||code===153)&&retried<1){
     retryRef.current.set(retryKey,retried+1);
     readyRef.current=false;
     setPlayerState('recovering');
     setStatusMessage(code===153?'Identification du lecteur corrigée · nouvel essai.':'Erreur HTML5 transitoire · nouvel essai.');
     setEpoch(value=>value+1);
     return;
    }
    const labels={
     100:'Vidéo retirée ou privée',
     101:'Intégration refusée par l’ayant droit',
     150:'Intégration refusée par l’ayant droit',
     153:'Identité du lecteur refusée'
    };
    advanceSource({
     markFailureSource:true,
     errorCode:code,
     reason:(labels[code]||'Source vidéo indisponible')+' · secours automatique'
    });
   }
  };

  window.addEventListener('message',onMessage);
  const watchdog=setTimeout(()=>{
   if(!readyRef.current&&online&&visible){
    const key=source.id+':watchdog';
    const retried=retryRef.current.get(key)||0;
    if(retried<1){
     retryRef.current.set(key,retried+1);
     readyRef.current=false;
     setStatusMessage('Chargement lent · second essai sur la même source.');
     setEpoch(value=>value+1);
    }else{
     advanceSource({markFailureSource:true,reason:'Chargement trop long · secours automatique'});
    }
   }
  },sportNetworkTimeout(18000));

  return()=>{
   window.removeEventListener('message',onMessage);
   clearTimeout(watchdog);
  };
 },[consent,trusted,frameSrc,online,visible,item?.id,sourceIndex,epoch,playerToken]);

 if(!item)return null;
 const stateLabels={
  idle:'PRÊT',loading:'CONNEXION',ready:'PRÊT',playing:'STABLE',buffering:'MÉMOIRE',
  paused:'PAUSE',recovering:'SECOURS',offline:'HORS LIGNE',unavailable:'RÉESSAI AUTO'
 };
 const sourceCount=sources.length;
 const sourceLabel=source?.mode==='fallback'?'SECOURS OFFICIEL':source?.label||'SOURCE OFFICIELLE';
 const showFrame=consent&&trusted&&online&&playerState!=='unavailable';

 return <div className={'sport-media-theater sport-media-auto-landscape'+(cinema?' is-cinema':'')}>
  <div className="sport-media-stage">
   {showFrame?<iframe
    ref={iframeRef}
    key={item.id+':'+source?.id+':'+epoch}
    src={frameSrc}
    title={item.title+' · '+sourceLabel}
    loading="eager"
    referrerPolicy="strict-origin-when-cross-origin"
    sandbox="allow-scripts allow-same-origin allow-presentation"
    allow="autoplay; encrypted-media"
   />:<div className="sport-media-consent sport-media-recovery">
    <ShieldCheck size={38}/>
    <div>
     <p className="eyebrow">LECTEUR INTERNE 3B</p>
     <h2>{!online?'Connexion interrompue.':playerState==='unavailable'?'3B protège la lecture.':trusted?'Activer la vidéo officielle.':'Source vidéo bloquée.'}</h2>
     <p>{!online?'Reste ici : 3B garde la position et reprend automatiquement quand le réseau revient.':playerState==='unavailable'?statusMessage:trusted?'Le lecteur passe par le pont HTTPS sécurisé 3B : aucun popup, aucune navigation externe et aucune ouverture automatique vers YouTube.':'Cette source ne fait pas partie de la liste vidéo autorisée par 3B.'}</p>
    </div>
    {trusted&&!consent&&online&&<button type="button" className="surface-button" onClick={onConsent}>Activer le lecteur</button>}
    {consent&&online&&playerState==='unavailable'&&<button type="button" className="surface-button" onClick={()=>advanceSource({reason:'Réessai manuel'})}>Réessayer maintenant</button>}
   </div>}
  </div>

  <div className="sport-media-controls">
   <div className="sport-media-details">
    <span>{item.badge||item.sport}</span>
    <strong>{item.title}</strong>
    <small>{statusMessage||source?.provider||item.provider}{preflightStatus==='available'?' · source vérifiée':''}</small>
    {consent&&trusted&&<div className={'sport-media-health state-'+playerState} aria-live="polite">
     <span className="sport-media-health-dot"/>
     <strong>{stateLabels[playerState]||'3B'}</strong>
     <small>{sourceLabel} · {Math.min(sourceIndex+1,Math.max(sourceCount,1))}/{Math.max(sourceCount,1)}</small>
    </div>}
   </div>
   <div className="sport-media-control-actions">
    <button type="button" className="quiet-button" onClick={()=>advanceSource({reason:'Source de secours sélectionnée'})}>{sourceCount>1?'Source de secours':'Réparer la lecture'}</button>
    <button type="button" className="quiet-button" onClick={onNext}>{isH24?'Chaîne suivante':'Finale suivante'}</button>
    <button type="button" className="surface-button" onClick={()=>onCinema(!cinema)}>{cinema?'Réduire':'Mode cinéma 3B'}</button>
   </div>
  </div>
 </div>;
}

export default function SportPage({goTo}){
 const account=useLoyalty();
 const[data,setData]=useState(null);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const[reload,setReload]=useState(0);
 const[section,setSection]=useState('h24');
 const[sport,setSport]=useState('Tous');
 const[language,setLanguage]=useState('priority');
 const[visibleCount,setVisibleCount]=useState(9);
 const[challengeData,setChallengeData]=useState(null);
 const[challengeError,setChallengeError]=useState('');
 const[challengeNotice,setChallengeNotice]=useState('');
 const[challengeBusy,setChallengeBusy]=useState('');
 const[challengeReload,setChallengeReload]=useState(0);
 const[stepsInput,setStepsInput]=useState({});
 const[proofs,setProofs]=useState({});
 const[reviewNotes,setReviewNotes]=useState({});
 const[mediaConsent,setMediaConsent]=useState(()=>{try{return localStorage.getItem('3b-sport-media-consent')==='accepted';}catch{return false;}});
 const[h24Id,setH24Id]=useState(H24_CHANNELS[0]?.id||'');
 const[finalId,setFinalId]=useState(SPORT_FINALS[0]?.id||'');
 const[cinema,setCinema]=useState(false);

 useEffect(()=>{
  const controller=new AbortController();
  let live=true,pending=false;
  const load=async()=>{
   if(pending||document.hidden)return;
   pending=true;
   setBusy(true);
   try{
    const next=await ecosystemPublic('sports',{signal:controller.signal});
    if(live){setData(next);setError('');}
   }catch(e){
    if(live)setError(e.message);
   }finally{
    pending=false;
    if(live)setBusy(false);
   }
  };
  load();
  const timer=setInterval(load,300000);
  document.addEventListener('visibilitychange',load);
  return()=>{
   live=false;
   controller.abort();
   clearInterval(timer);
   document.removeEventListener('visibilitychange',load);
  };
 },[reload]);

 useEffect(()=>{
  if(section!=='challenges'||!account.user){setChallengeData(null);setChallengeError('');return;}
  const controller=new AbortController();
  let live=true;
  setChallengeError('');
  ecosystem('sport-challenges',{}, {signal:controller.signal})
   .then(next=>{if(live)setChallengeData(next);})
   .catch(err=>{if(live)setChallengeError(err.message);});
  return()=>{live=false;controller.abort();};
 },[section,account.user?.id,challengeReload]);

 useEffect(()=>setVisibleCount(9),[sport,language]);

 useEffect(()=>{
  setCinema(false);
 },[section]);

 useEffect(()=>{
  if(!cinema)return;
  const root=document.documentElement;
  const previous=root.style.overflow;
  root.style.overflow='hidden';
  const onKey=event=>{if(event.key==='Escape')setCinema(false);};
  window.addEventListener('keydown',onKey);
  return()=>{root.style.overflow=previous;window.removeEventListener('keydown',onKey);};
 },[cinema]);

 const categoryArticles=useMemo(()=>(
  (data?.articles||[])
   .filter(article=>sport==='Tous'||article.category===sport)
   .sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))
 ),[data?.articles,sport]);

 const articles=useMemo(()=>{
  if(language==='fr')return categoryArticles.filter(article=>article.language==='fr');
  if(language==='all')return categoryArticles;
  const french=categoryArticles.filter(article=>article.language==='fr');
  return french.length?french:categoryArticles;
 },[categoryArticles,language]);

 const visibleArticles=articles.slice(0,visibleCount);
 const activeSources=useMemo(()=>[...new Set((data?.sources||[]).filter(source=>source.available).map(source=>source.name))],[data?.sources]);
 const frenchAvailable=categoryArticles.filter(article=>article.language==='fr').length;
 const fallbackActive=language==='priority'&&!frenchAvailable&&categoryArticles.length>0;
 const challenges=(challengeData?.catalog?.length?challengeData.catalog:FALLBACK_CHALLENGES).map(challenge=>({...challenge,...CHALLENGE_PRESENTATION[challenge.id]}));
 const entries=challengeData?.entries||[];
 const entryFor=id=>entries.find(entry=>entry.challenge_id===id);
 const activeChallenges=entries.filter(entry=>['joined','eligible','submitted'].includes(entry.status)).length;
 const verifiedChallenges=entries.filter(entry=>entry.status==='verified').length;
 const mediaList=section==='h24'?H24_CHANNELS:SPORT_FINALS;
 const mediaId=section==='h24'?h24Id:finalId;
 const activeMedia=mediaList.find(item=>item.id===mediaId)||mediaList[0];

 function acceptSportMedia(){
  setMediaConsent(true);
  try{localStorage.setItem('3b-sport-media-consent','accepted');}catch{}
 }

 function selectMedia(id){
  if(section==='h24')setH24Id(id);
  else setFinalId(id);
 }

 function nextMedia(){
  if(!mediaList.length)return;
  const index=Math.max(0,mediaList.findIndex(item=>item.id===activeMedia?.id));
  selectMedia(mediaList[(index+1)%mediaList.length].id);
 }

 function openCommunityIntent(intent){
  try{sessionStorage.setItem('3b-community-intent',intent);}catch{}
  goTo('community');
 }

 async function challengeAct(action,payload,key,message){
  if(challengeBusy)return;
  setChallengeBusy(key);
  setChallengeError('');
  setChallengeNotice('');
  try{
   const result=await ecosystem(action,payload);
   if(result.snapshot)setChallengeData(result.snapshot);
   if(message)setChallengeNotice(message);
   if(action==='sport-challenge-review'&&payload.approve===true)await account.refresh();
  }catch(e){
   setChallengeError(e.message);
  }finally{
   setChallengeBusy('');
  }
 }

 function joinChallenge(id){
  if(!account.user){goTo('member');return;}
  challengeAct('sport-challenge-join',{challenge:id},id,'Défi ajouté à « Mes défis ».');
 }

 function checkIn(challenge){
  if(challenge.tracker==='steps'){
   const value=Number(stepsInput[challenge.id]);
   if(!Number.isFinite(value)||value<=0){setChallengeError('Entre ton nombre de pas avant de l’enregistrer.');return;}
   challengeAct('sport-challenge-checkin',{challenge:challenge.id,value,note:''},challenge.id,'Progression enregistrée côté serveur.');
   return;
  }
  const value=challenge.tracker==='daily_minutes'?Number(challenge.daily_minimum||30):1;
  challengeAct('sport-challenge-checkin',{challenge:challenge.id,value,note:''},challenge.id,'Progression enregistrée côté serveur.');
 }

 function submitChallenge(challenge){
  const proof=(proofs[challenge.id]||'').trim();
  if(proof.length<10){setChallengeError('Explique en quelques mots comment tu as réalisé le défi avant de l’envoyer en validation.');return;}
  challengeAct('sport-challenge-submit',{challenge:challenge.id,proof},challenge.id,'Ta réussite a été envoyée à la validation 3B.');
 }

 return <section className="editorial-page sport-page">
  <div className="sport-heading">
   <div className="editorial-heading">
    <p className="eyebrow">LE SPORT, AU QUOTIDIEN</p>
    <h1>La passion<br/><em>n’a pas de frontières.</em></h1>
    <p>Chaînes H24, grandes finales à revoir dans 3B, actualités multisports, défis et collaborations.</p>
   </div>
   <div className="sport-orbit" aria-hidden="true">
    <span>3B</span><Trophy size={62} strokeWidth={.8}/>
   </div>
  </div>

  <nav className="sport-section-nav" aria-label="Espace Sport 3B">
   {SECTIONS.map(item=>{
    const Icon=item.icon;
    return <button type="button" key={item.id} className={section===item.id?'active':''} aria-pressed={section===item.id} onClick={()=>setSection(item.id)}>
     <Icon size={18}/><span>{item.label}</span>
    </button>;
   })}
  </nav>

  {(section==='h24'||section==='finals')&&<div className="sport-section-view sport-media-view">
   <header className="sport-view-heading sport-media-heading">
    <div>
     <p className="eyebrow">{section==='h24'?'CHAÎNES SPORT H24':'FINALES À REVOIR'}</p>
     <h2>{section==='h24'?'Le sport tourne en continu dans 3B.':'Les grandes finales restent dans l’application.'}</h2>
     <p>{section==='h24'?'Choisis une chaîne 3B. Les flux utilisent uniquement des vidéos publiées par des ayants droit ou fédérations officielles et tournent en lecture continue.':'Choisis une finale puis regarde-la dans le lecteur interne 3B, sans ouvrir une autre page.'}</p>
    </div>
    <Trophy size={58} strokeWidth={1}/>
   </header>

   <SportMediaPlayer
    item={activeMedia}
    consent={mediaConsent}
    onConsent={acceptSportMedia}
    cinema={cinema}
    onCinema={setCinema}
    onNext={nextMedia}
   />

   <div className="sport-media-grid" role="list" aria-label={section==='h24'?'Chaînes sport H24':'Finales disponibles'}>
    {mediaList.map(item=><button
     type="button"
     role="listitem"
     key={item.id}
     className={'sport-media-card'+(activeMedia?.id===item.id?' active':'')}
     aria-pressed={activeMedia?.id===item.id}
     onClick={()=>selectMedia(item.id)}
    >
     <span className="sport-media-card-tag">{item.badge||item.year} · {item.sport}</span>
     <strong>{item.title}</strong>
     <p>{item.description||item.subtitle}</p>
     <small>{item.provider} · {mediaSources(item).length} source{mediaSources(item).length>1?'s':''} sécurisée{mediaSources(item).length>1?'s':''} · lecture interne 3B</small>
    </button>)}
   </div>

   <div className="sport-media-safety">
    <ShieldCheck size={20}/>
    <p><strong>Verrou anti-sortie + secours automatique :</strong> H24 et Finales restent dans 3B. En cas d’erreur, de vidéo retirée ou de coupure réseau, le lecteur tente une source officielle de secours, mémorise la dernière source H24 stable et reprend automatiquement sans ouvrir d’autre application.</p>
   </div>
  </div>}

  {section==='news'&&<>
   <div className="sport-command-bar">
    <div className="sport-live-state">
     <span className="sport-live-dot" aria-hidden="true"/>
     <div><strong>{data?.stale?'Dernière édition disponible':busy?'Mise à jour en cours':'Actualités monde'}</strong><small>{data?.updatedAt?'Vérifié '+dateLabel(data.updatedAt):'Connexion aux sources sportives…'}</small></div>
    </div>
    <div className="sport-stats" aria-label="État des actualités">
     <span><b>{data?.frenchCount??'—'}</b> articles FR</span>
     <span><b>{activeSources.length||'—'}</b> sources actives</span>
    </div>
    <button className="sport-refresh" type="button" disabled={busy} onClick={()=>setReload(value=>value+1)}><RefreshCw size={16} className={busy?'is-spinning':''}/>Actualiser</button>
   </div>

   <div className="sport-filter-panel">
    <div className="sport-filter-heading">
     <div><p className="eyebrow">MULTISPORTS · MONDE</p><h2>Choisis ta discipline.</h2></div>
     <div className="sport-language" aria-label="Langue des articles">
      <Languages size={16}/>
      <button type="button" aria-pressed={language==='priority'} onClick={()=>setLanguage('priority')}>Français d’abord</button>
      <button type="button" aria-pressed={language==='fr'} onClick={()=>setLanguage('fr')}>FR uniquement</button>
      <button type="button" aria-pressed={language==='all'} onClick={()=>setLanguage('all')}>Toutes langues</button>
     </div>
    </div>
    <div className="sport-category-scroll" role="group" aria-label="Filtrer par discipline">
     {SPORTS.map(name=><button type="button" key={name} aria-pressed={sport===name} onClick={()=>setSport(name)}>{name}</button>)}
    </div>
    <div className="sport-source-line">
     <span>Sources actives</span>
     <strong>{activeSources.length?activeSources.join(' · '):'Connexion en cours'}</strong>
     <small>Priorité aux médias francophones · source internationale en secours.</small>
    </div>
   </div>

   {error&&<p className="surface-notice" role="alert">{error} <button className="text-button" onClick={()=>setReload(value=>value+1)}>Réessayer</button></p>}
   {data?.stale&&<p className="surface-notice">Les sources ne répondent pas toutes actuellement. La dernière édition réussie reste affichée.</p>}
   {data?.partial&&<p className="muted-copy">Certaines sources sont momentanément indisponibles ; les flux disponibles continuent d’alimenter l’espace sport.</p>}
   {fallbackActive&&<p className="surface-notice"><Languages size={16}/> Aucun article français récent n’est disponible pour ce filtre. Les articles internationaux sont affichés en secours.</p>}

   <div className="sport-news-topline">
    <div><p className="eyebrow">{sport==='Tous'?'À LA UNE MULTISPORTS':sport.toUpperCase()}</p><h2>{language==='fr'?'Édition française.':language==='all'?'Toutes les sources.':'L’édition française en priorité.'}</h2></div>
    <span>{articles.length} article{articles.length>1?'s':''}</span>
   </div>

   <div className="sport-news-grid">
    {visibleArticles.map((article,index)=><a key={article.url} href={article.url} target="_blank" rel="noopener noreferrer" className={'sport-article '+(index===0?'sport-article-lead':'')}>
     <div className="sport-article-meta">
      <span>{article.category}</span>
      <span className={article.language==='fr'?'sport-lang-fr':'sport-lang-fallback'}>{article.language==='fr'?'FR':'INTERNATIONAL'}</span>
     </div>
     <h3>{article.title}</h3>
     <footer>
      <span>{article.source}<small><Clock3 size={12}/>{dateLabel(article.publishedAt)}</small></span>
      <ArrowUpRight size={22}/>
     </footer>
    </a>)}
   </div>

   {data&&!articles.length&&<div className="surface-panel sport-empty">
    <Globe2 size={34}/><h2>Aucun article dans ce filtre pour le moment.</h2>
    <p>Reviens à toutes les disciplines ou autorise toutes les langues pour élargir la couverture.</p>
    <div className="sport-inline-actions"><button className="quiet-button" onClick={()=>setSport('Tous')}>Toutes les disciplines</button><button className="quiet-button" onClick={()=>setLanguage('all')}>Toutes les langues</button></div>
   </div>}

   {visibleCount<articles.length&&<div className="sport-more">
    <button type="button" className="quiet-button" onClick={()=>setVisibleCount(count=>count+9)}>Afficher 9 articles de plus <ChevronDown size={16}/></button>
    <span>{Math.min(visibleCount,articles.length)} / {articles.length}</span>
   </div>}

   <p className="muted-copy sport-news-note">Les titres des sept derniers jours sont actualisés automatiquement et s’ouvrent sur le site de leur éditeur. La couverture dépend des sujets publiés par les sources ; les scores minute par minute ne sont pas proposés.</p>
  </>}

  {section==='challenges'&&<div className="sport-section-view">
   <header className="sport-view-heading">
    <div><p className="eyebrow">BOUGER ENSEMBLE</p><h2>Les Défis 3B.</h2><p>Tu rejoins un défi avec ton compte. La progression est enregistrée côté serveur et un défi n’est considéré comme officiellement réussi qu’après validation 3B.</p></div>
    <Flame size={58} strokeWidth={1}/>
   </header>

   {account.user?<div className="sport-challenge-dashboard">
    <div><UserRound size={18}/><span>Mes défis</span><strong>{activeChallenges}</strong><small>en cours</small></div>
    <div><CheckCircle2 size={18}/><span>Validés</span><strong>{verifiedChallenges}</strong><small>sur ce compte</small></div>
    <button type="button" className="quiet-button" onClick={()=>setChallengeReload(value=>value+1)}><RefreshCw size={15}/>Actualiser</button>
   </div>:<div className="sport-challenge-login">
    <UserRound size={24}/><div><strong>Connecte ton compte 3B pour participer.</strong><p>Le choix du défi, les check-ins, la progression et les validations sont liés à ton compte, pas seulement à ce téléphone.</p></div><button className="surface-button" onClick={()=>goTo('member')}>Connexion / inscription</button>
   </div>}

   {challengeError&&<p className="surface-notice" role="alert">{challengeError}</p>}
   {challengeNotice&&<p className="surface-notice" role="status">{challengeNotice}</p>}

   <div className="sport-action-grid">
    {challenges.map(challenge=>{
     const Icon=challenge.icon||Trophy;
     const entry=entryFor(challenge.id);
     const status=challengeStatus(entry);
     const progress=Math.min(100,Math.max(0,(Number(entry?.progress||0)/Number(challenge.target_value||1))*100));
     const isBusy=challengeBusy===challenge.id;
     return <article className={'sport-action-card sport-challenge-card status-'+status.tone} key={challenge.id}>
      <div className="sport-challenge-card-head">
       <div className="sport-action-icon"><Icon size={23}/></div>
       <span className={'sport-challenge-status '+status.tone}>{status.label}</span>
      </div>
      <span>{challenge.tag}</span><h3>{challenge.title}</h3><p>{challenge.description}</p>
      <div className="sport-challenge-reward"><strong>+{challenge.xp_reward||0} XP</strong><small>après validation officielle</small></div>
      <div className="sport-progress-row"><span>{progressLabel(challenge,entry)}</span><span>{Math.round(progress)}%</span></div>
      <div className="sport-progress-track" aria-label={'Progression '+challenge.title}><span style={{width:progress+'%'}}/></div>

      {!entry||entry.status==='abandoned'?<button type="button" className="surface-button sport-challenge-main-action" disabled={isBusy} onClick={()=>joinChallenge(challenge.id)}>{isBusy?'Enregistrement…':entry?.status==='abandoned'?'Reprendre ce défi':'Rejoindre ce défi'}</button>:null}

      {entry?.status==='joined'&&<>
       {challenge.tracker==='steps'&&<label className="sport-challenge-field">Nombre de pas aujourd’hui<input type="number" min="1" max="10000000" inputMode="numeric" value={stepsInput[challenge.id]||''} onChange={e=>setStepsInput(values=>({...values,[challenge.id]:e.target.value}))} placeholder="Ex. 10482"/></label>}
       <button type="button" className="surface-button sport-challenge-main-action" disabled={isBusy} onClick={()=>checkIn(challenge)}>{isBusy?'Enregistrement…':trackerActionLabel(challenge)}</button>
       <button type="button" className="text-button sport-abandon" disabled={isBusy} onClick={()=>challengeAct('sport-challenge-abandon',{challenge:challenge.id},challenge.id,'Défi quitté. Tu pourras le reprendre plus tard.')}>Abandonner</button>
      </>}

      {entry?.status==='eligible'&&<>
       {entry.moderator_note&&<p className="sport-review-feedback"><strong>Retour validation :</strong> {entry.moderator_note}</p>}
       <label className="sport-challenge-field">Preuve / explication<textarea rows={3} maxLength={1200} value={proofs[challenge.id]??entry.proof_note??''} onChange={e=>setProofs(values=>({...values,[challenge.id]:e.target.value}))} placeholder="Décris ce que tu as fait, quand et comment. Pour les pas, indique la source du relevé ; pour un match, précise la rencontre."/></label>
       <button type="button" className="surface-button sport-challenge-main-action" disabled={isBusy} onClick={()=>submitChallenge(challenge)}><ClipboardCheck size={17}/>{isBusy?'Envoi…':'Envoyer à la validation 3B'}</button>
       <button type="button" className="text-button sport-abandon" disabled={isBusy} onClick={()=>challengeAct('sport-challenge-abandon',{challenge:challenge.id},challenge.id,'Défi quitté. Tu pourras le reprendre plus tard.')}>Abandonner</button>
      </>}

      {entry?.status==='submitted'&&<div className="sport-pending-box"><ClipboardCheck size={18}/><div><strong>Réussite envoyée</strong><small>{entry.submitted_at?'Envoyée '+dateLabel(entry.submitted_at):'En cours de vérification'}</small></div></div>}
      {entry?.status==='verified'&&<div className="sport-verified-box"><CheckCircle2 size={20}/><div><strong>Défi validé 3B</strong><small>XP attribué une seule fois · {entry.verified_at?dateLabel(entry.verified_at):'validation enregistrée'}</small></div></div>}
      <small className="sport-challenge-level">{challenge.level}</small>
     </article>;
    })}
   </div>

   <div className="sport-verification-explainer">
    <ShieldCheck size={24}/>
    <div><strong>Comment 3B sait qu’un défi est réussi ?</strong><p>Un check-in seul ne suffit pas. Il sert à suivre la progression. Quand l’objectif serveur est atteint, le membre envoie une explication ou une preuve à examiner. Le statut final devient « Validé 3B » seulement après revue ; c’est à ce moment-là que l’XP est crédité, une seule fois.</p></div>
   </div>

   {challengeData?.moderator&&<section className="sport-moderation">
    <div className="sport-news-topline"><div><p className="eyebrow">VALIDATION 3B</p><h2>Réussites à contrôler.</h2></div><span>{challengeData.pending?.length||0} en attente</span></div>
    <div className="sport-review-grid">
     {(challengeData.pending||[]).map(pending=>{
      const challenge=challenges.find(item=>item.id===pending.challenge_id);
      const key=pending.user_id+':'+pending.challenge_id;
      return <article className="sport-review-card" key={key}>
       <div className="sport-review-person"><UserRound size={18}/><div><strong>{pending.member?.name||'Membre 3B'}</strong><small>@{pending.member?.handle||pending.user_id.slice(0,8)} · {challenge?.title||pending.challenge_id}</small></div></div>
       <p>{pending.proof_note}</p>
       <small>Progression serveur : {numberLabel(pending.progress)} / {numberLabel(challenge?.target_value||0)} {challenge?.unit||''}</small>
       <label className="sport-challenge-field">Note de validation<textarea rows={2} maxLength={1200} value={reviewNotes[key]||''} onChange={e=>setReviewNotes(values=>({...values,[key]:e.target.value}))} placeholder="Optionnel si approuvé ; explique le motif si refusé."/></label>
       <div className="sport-review-actions"><button type="button" className="surface-button" disabled={!!challengeBusy} onClick={()=>challengeAct('sport-challenge-review',{user:pending.user_id,challenge:pending.challenge_id,approve:true,note:reviewNotes[key]||''},key,'Défi validé et XP attribué.')}> <CheckCircle2 size={16}/>Valider</button><button type="button" className="quiet-button" disabled={!!challengeBusy} onClick={()=>challengeAct('sport-challenge-review',{user:pending.user_id,challenge:pending.challenge_id,approve:false,note:reviewNotes[key]||'Preuve insuffisante, merci de compléter.'},key,'Validation refusée : le membre peut compléter puis renvoyer.')}> <XCircle size={16}/>Refuser</button></div>
      </article>;
     })}
     {!challengeData.pending?.length&&<div className="surface-panel sport-empty"><CheckCircle2 size={30}/><h2>Aucune validation en attente.</h2><p>Les prochaines réussites soumises apparaîtront ici.</p></div>}
    </div>
   </section>}

   <div className="sport-feature-cta">
    <div><span className="eyebrow">TON IDÉE · TON SPORT · TA VILLE</span><h3>Propose ton propre défi.</h3><p>Les propositions du collectif restent des idées communautaires. Elles deviennent des défis officiels suivis et récompensés seulement après intégration au catalogue 3B.</p></div>
    <button type="button" className="surface-button" onClick={()=>openCommunityIntent('challenge')}><Flame size={18}/>Proposer un défi</button>
   </div>
  </div>}

  {section==='collabs'&&<div className="sport-section-view">
   <header className="sport-view-heading">
    <div><p className="eyebrow">CRÉER DES PONTS</p><h2>Collaborations Sport 3B.</h2><p>Un espace clair pour transformer une idée en proposition : club, athlète, coach, événement, textile ou équipement.</p></div>
    <Handshake size={58} strokeWidth={1}/>
   </header>
   <div className="sport-action-grid">
    {COLLABORATIONS.map(item=>{const Icon=item.icon;return <article className="sport-action-card sport-collab-card" key={item.title}>
     <div className="sport-action-icon"><Icon size={23}/></div>
     <span>{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p>
    </article>;})}
   </div>
   <div className="sport-collab-actions">
    <button type="button" className="sport-feature-cta sport-feature-button" onClick={()=>openCommunityIntent('collaboration')}>
     <div><span className="eyebrow">PROPOSITION DE COLLABORATION</span><h3>Présenter mon projet au collectif</h3><p>Structure ton besoin et publie-le dans la catégorie Collaborations.</p></div><ArrowUpRight size={24}/>
    </button>
    <button type="button" className="sport-feature-cta sport-feature-button" onClick={()=>goTo('ia-textile')}>
     <div><span className="eyebrow">ATELIER 3B</span><h3>Créer d’abord le concept textile</h3><p>Prépare une tenue ou un équipement avant de le partager avec le collectif.</p></div><Sparkles size={24}/>
    </button>
   </div>
  </div>}
 </section>;
}
