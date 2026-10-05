import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,LockKeyhole,Volume2,VolumeX} from 'lucide-react';
import {destinRequest,sourceUrl} from './client.js';
import {musicMasterResumeState} from './musicMasterState.js';
import './music-master.css';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
function vibrate(pattern){try{navigator.vibrate?.(pattern);}catch{}}

export default function DestinMusicMaster({initialSnapshot,userId,onClose,onComplete,goTo}) {
  const initialMode=musicMasterResumeState(initialSnapshot).mode;
  const [snapshot,setSnapshot]=useState(initialSnapshot);
  const [stage,setStage]=useState(initialMode==='complete'?'complete':'gate');
  const [selected,setSelected]=useState(null);
  const [busy,setBusy]=useState(false);
  const [muted,setMuted]=useState(false);
  const [error,setError]=useState('');
  const [rewardStep,setRewardStep]=useState(0);
  const [claimedReward,setClaimedReward]=useState(initialSnapshot.endingReward?.reward?.pathReward || null);
  const videoRef=useRef(null),audioRef=useRef(null),auxRef=useRef(null);
  const runToken=useRef(0),raf=useRef(0),timers=useRef([]),retryRef=useRef(null),live=useRef(true);

  const node=useMemo(()=>snapshot.manifest.nodes.find(item=>item.id===snapshot.run.node_id) || snapshot.manifest.nodes[0],[snapshot]);
  const cinema=node?.cinema || {};
  const fallbackReward=cinema.reward || {};
  const reward=claimedReward || fallbackReward;

  const media=useCallback((source,s=snapshot)=>sourceUrl(source,s.media)||source||'',[snapshot]);

  const clearTimers=useCallback(()=>{for(const id of timers.current)clearTimeout(id);timers.current=[];},[]);
  const stopMedia=useCallback((reset=false)=>{
    cancelAnimationFrame(raf.current);
    for(const el of [videoRef.current,audioRef.current,auxRef.current]){
      if(!el)continue;
      try{el.pause();if(reset)el.currentTime=0;}catch{}
      el.playbackRate=1;
    }
  },[]);
  useEffect(()=>()=>{live.current=false;clearTimers();stopMedia();},[clearTimers,stopMedia]);
  useEffect(()=>{for(const el of [audioRef.current,auxRef.current])if(el)el.muted=muted;},[muted]);
  useEffect(()=>{
    const onVisibility=()=>{if(document.hidden){stopMedia();setError('Lecture en pause. Appuie pour reprendre la scène.');}};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>document.removeEventListener('visibilitychange',onVisibility);
  },[stopMedia]);

  function waitReady(el){
    return new Promise((resolve,reject)=>{
      if(el.readyState>=1){resolve();return;}
      const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(Error('Média inaccessible.'));};
      const cleanup=()=>{el.removeEventListener('loadedmetadata',ok);el.removeEventListener('error',bad);};
      el.addEventListener('loadedmetadata',ok,{once:true});el.addEventListener('error',bad,{once:true});
      el.load();
    });
  }
  async function preciseDelay(ms,token){
    const end=performance.now()+Math.max(0,ms||0);
    while(live.current && token===runToken.current && performance.now()<end)await new Promise(requestAnimationFrame);
  }
  async function playPair({video,audio,delayMs=0,loop=false,next,label}){
    const token=++runToken.current;
    stopMedia(true);clearTimers();setError('');
    const v=videoRef.current,a=audioRef.current;
    if(!v || !a)return;
    v.src=media(video);v.loop=loop;v.muted=true;v.playsInline=true;
    a.src=media(audio);a.muted=muted;a.volume=1;
    retryRef.current=()=>playPair({video,audio,delayMs,loop,next,label});
    try{
      await Promise.all([waitReady(v),waitReady(a)]);
      if(token!==runToken.current)return;
      await v.play();
      await preciseDelay(delayMs,token);
      if(token!==runToken.current)return;
      await a.play();
      const delaySec=Math.max(0,delayMs||0)/1000;
      const sync=()=>{
        if(token!==runToken.current || a.paused || a.ended)return;
        const target=a.currentTime+delaySec,drift=target-v.currentTime;
        if(Math.abs(drift)>.16 && Number.isFinite(v.duration))v.currentTime=clamp(target,0,Math.max(0,v.duration-.05));
        else v.playbackRate=clamp(1+drift*.08,.985,1.015);
        raf.current=requestAnimationFrame(sync);
      };
      raf.current=requestAnimationFrame(sync);
      a.onended=()=>{cancelAnimationFrame(raf.current);v.playbackRate=1;next?.();};
    }catch{
      stopMedia();
      setError(label?label+' — appuie pour reprendre le son.':'Appuie pour reprendre la lecture.');
    }
  }

  async function launchMaster(){
    const resume=musicMasterResumeState(snapshot);
    if(resume.mode==='branch'){runRap(snapshot);return;}
    await runIntro();
  }

  async function runIntro(){
    setStage('intro');setSelected(null);vibrate(16);
    await playPair({
      video:cinema.video || node.src,
      audio:cinema.voice,
      delayMs:cinema.audioDelayMs || 0,
      label:'Introduction',
      next:()=>{videoRef.current?.pause();setStage('choice');vibrate([20,45,20]);}
    });
  }

  async function confirmChoice(){
    if(!selected || busy)return;
    setBusy(true);setError('');vibrate([18,35,35]);
    try{
      const next=await destinRequest('choose',{
        runId:snapshot.run.id,nodeId:node.id,step:snapshot.run.path.length,
        choiceId:selected.id,requestId:crypto.randomUUID()
      },userId);
      if(!live.current)return;
      setSnapshot(next);setSelected(null);setStage('transition');
      timers.current.push(setTimeout(()=>runRap(next),420));
    }catch(e){setError(e.message||'Le choix n’a pas pu être confirmé.');}
    finally{if(live.current)setBusy(false);}
  }

  function branchNode(s){return s.manifest.nodes.find(item=>item.id===s.run.node_id)||s.manifest.nodes[0];}
  function branchCinema(s){return branchNode(s)?.cinema||{};}
  function runRap(s){
    const c=branchCinema(s);
    setStage('rap');vibrate(20);
    playPair({video:c.rap?.video || branchNode(s).src,audio:c.rap?.audio,delayMs:c.rap?.audioDelayMs||0,label:'Performance',next:()=>runWitness(s)});
  }
  function runWitness(s){
    const c=branchCinema(s);
    setStage('witness');
    playPair({video:c.witness?.video,audio:c.witness?.audio,delayMs:c.witness?.audioDelayMs||0,label:'Témoignage',next:()=>runUnity(s)});
  }
  async function runUnity(s){
    const c=branchCinema(s),u=c.unity||{},token=++runToken.current;
    stopMedia(true);clearTimers();setError('');setStage('unity');
    const v=videoRef.current,a=audioRef.current;
    retryRef.current=()=>runUnity(s);
    try{
      v.src=media(u.video,s);v.loop=true;v.muted=true;await waitReady(v);await v.play();
      const tracks=(u.audio||[]).map(src=>media(src,s)).filter(Boolean);
      for(const src of tracks){
        if(token!==runToken.current)return;
        a.src=src;a.muted=muted;a.volume=1;await waitReady(a);await a.play();
        await new Promise((resolve,reject)=>{a.onended=resolve;a.onerror=reject;});
        await sleep(120);
      }
      if(token!==runToken.current)return;
      v.pause();runRewardEvent(s);
    }catch{
      stopMedia();setError('Séquence finale — appuie pour reprendre le son.');
    }
  }

  function runRewardEvent(s){
    setStage('reward');setRewardStep(0);clearTimers();vibrate([25,50,25,50,60]);
    [420,1250,2150,3050].forEach((ms,index)=>timers.current.push(setTimeout(()=>setRewardStep(index+1),ms)));
    timers.current.push(setTimeout(()=>finishAndClaim(s),4300));
  }
  async function finishAndClaim(s){
    const n=branchNode(s);
    retryRef.current=()=>finishAndClaim(s);
    setBusy(true);setError('');
    try{
      const complete=await destinRequest('finish',{
        runId:s.run.id,nodeId:n.id,step:s.run.path.length,requestId:crypto.randomUUID()
      },userId);
      let pathReward=complete.endingReward?.reward?.pathReward || null;
      if(complete.endingReward?.status==='pending' && n.ending?.id){
        const claim=await destinRequest('claim',{storyId:complete.storyId,endingId:n.ending.id},userId);
        pathReward=claim.reward?.pathReward || pathReward;
      }
      if(!live.current)return;
      setSnapshot(complete);setClaimedReward(pathReward);setRewardStep(4);setStage('complete');onComplete?.();vibrate([20,40,70]);
    }catch(e){setError(e.message||'La récompense reste sauvegardée. Réessaie.');}
    finally{if(live.current)setBusy(false);}
  }

  function retry(){setError('');retryRef.current?.();}
  const choiceTone=selected?.id==='memoire'?'memoire':selected?.id==='avenir'?'avenir':'';

  return <section className={"destin-master stage-"+stage+" "+choiceTone}>
    <video ref={videoRef} className="destin-master-video" playsInline muted preload="auto"/>
    <audio ref={audioRef} preload="auto"/><audio ref={auxRef} preload="auto"/>
    <div className="destin-master-vignette"/><div className="destin-master-grain"/><div className="destin-master-scan"/>
    <header className="destin-master-top">
      <button className="destin-master-icon" onClick={()=>{stopMedia();onClose();}} aria-label="Quitter le clip"><ArrowLeft/></button>
      <span>3B · DESTIN</span>
      <button className="destin-master-icon" onClick={()=>setMuted(value=>!value)} aria-label={muted?'Activer le son':'Couper le son'}>{muted?<VolumeX/>:<Volume2/>}</button>
    </header>

    {stage==='gate' && <div className="destin-master-gate">
      <div className="destin-master-kicker">EXPÉRIENCE MUSICALE INTERACTIVE</div>
      <h1>LE COMBAT <em>COMMENCE</em></h1>
      <p>Une voix parle. Puis le beat prend la place. Ton choix change le morceau et ce que ton Passeport débloque.</p>
      <button className="destin-master-launch" onClick={launchMaster}>{musicMasterResumeState(snapshot).mode==='branch'?'REPRENDRE MON CLIP':'ENTRER DANS LE CLIP'}</button>
      <small>Son recommandé · français intégral · choix définitif</small>
    </div>}

    {stage==='intro' && <div className="destin-master-subtitle">« 3B, c’est le berceau. »</div>}

    {stage==='choice' && <div className="destin-master-choice-scene">
      <div className="destin-master-choice-title"><small>LE BEAT S’ARRÊTE. TON DESTIN ENTRE DANS LE FILM.</small><h2>{node.question}</h2></div>
      <div className="destin-master-choice-grid">
        {node.choices.map(choice=><button key={choice.id} className={"destin-master-path "+choice.id+(selected?.id===choice.id?' is-selected':'')} onClick={()=>{setSelected(choice);vibrate(18);}}>
          <span>{choice.id==='memoire'?'PASSÉ':'FUTUR'}</span><strong>{choice.label}</strong>
          <small>{choice.id==='memoire'?'RÉVEILLE LES VOIX OUBLIÉES':'RÉVÈLE DE NOUVEAUX CHEMINS'}</small>
        </button>)}
      </div>
      {selected && <div className="destin-master-confirm">
        <LockKeyhole/><div><small>UN CHOIX · UNE HISTOIRE</small><strong>{selected.label}</strong><span>Une fois enregistré, l’autre voie reste fermée pour cette histoire.</span></div>
        <button disabled={busy} onClick={confirmChoice}>{busy?'ENREGISTREMENT…':'CONFIRMER'}</button>
      </div>}
    </div>}

    {stage==='transition' && <div className="destin-master-impact"><span>DESTIN ENREGISTRÉ</span><strong>{selected?.label || '3B'}</strong></div>}
    {stage==='rap' && <div className="destin-master-live"><span>PERFORMANCE</span><strong>{cinema.pathLabel || '3B'}</strong><i/></div>}
    {stage==='witness' && <div className="destin-master-subtitle destin-master-subtitle--wide">{branchCinema(snapshot).witness?.subtitle}</div>}
    {stage==='unity' && <div className="destin-master-unity"><span>LES DEUX VOIX SE CROISENT</span><strong>{branchCinema(snapshot).unity?.subtitle || '« J’ai la voix. — J’ai le chemin. »'}</strong></div>}

    {stage==='reward' && <div className="destin-master-reward-event">
      <div className="destin-master-ring"/>
      <div className={"destin-master-reward-line "+(rewardStep>=1?'is-on':'')}><small>PASSEPORT</small><strong>{fallbackReward.passportTitle}</strong></div>
      <div className={"destin-master-reward-line "+(rewardStep>=2?'is-on':'')}><small>OBJET</small><strong>{fallbackReward.item}</strong></div>
      <div className={"destin-master-reward-line "+(rewardStep>=3?'is-on':'')}><small>MONDE 3B</small><strong>{fallbackReward.world}</strong></div>
      <div className={"destin-master-reward-line "+(rewardStep>=4?'is-on':'')}><small>CRÉER MA VILLE</small><strong>{fallbackReward.city}</strong></div>
    </div>}

    {stage==='complete' && <div className="destin-master-complete">
      <div className="destin-master-kicker">DESTIN ACCOMPLI</div>
      <h2>{reward.passportTitle || fallbackReward.passportTitle || node?.ending?.title}</h2>
      <p>Ton choix est conservé avec ton compte 3B. Les récompenses de cette voie sont reliées à ton Passeport et à l’écosystème.</p>
      <div className="destin-master-complete-lines">
        <span><small>OBJET</small>{fallbackReward.item || reward.itemCode}</span>
        <span><small>MONDE 3B</small>{fallbackReward.world || reward.worldPlace}</span>
        <span><small>MA VILLE</small>{fallbackReward.city || reward.cityBuilding}</span>
      </div>
      <div className="destin-master-complete-actions">
        <button onClick={()=>goTo?.('passport')}>VOIR MON PASSEPORT</button>
        <button onClick={onClose}>CONTINUER DANS 3B</button>
      </div>
    </div>}

    {error && <div className="destin-master-error"><span>{error}</span><button disabled={busy} onClick={retry}>REPRENDRE</button></div>}
  </section>;
}
