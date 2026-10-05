import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,Expand,Pause,Play,RotateCcw,Volume2,VolumeX} from 'lucide-react';
import {destinRequest,sourceUrl} from './client.js';
import {choiceLock,formatTime} from './model.js';
import {DestinConfirmation} from './DirectorAccess.jsx';
import './destin.css';

export function previewSnapshot(manifest,media = {}) {
  return {manifest,media,level:1000,unlocked:[],run:{id:'preview',node_id:manifest.entry,position:manifest.nodes.find(n => n.id === manifest.entry)?.start || 0,path:[],state:'playing'}};
}
function ChoiceClock({seconds,stopped,onExpire}) {
  const [left,setLeft] = useState(seconds), expired = useRef(false), callback = useRef(onExpire);
  callback.current = onExpire;
  useEffect(() => {
    if (!seconds || stopped) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), delta = Math.min(0.25,(now-previous)/1000); previous = now;
      if (document.hidden) return;
      setLeft(value => Math.max(0,value-delta));
    },100);
    return () => clearInterval(timer);
  },[seconds,stopped]);
  useEffect(() => { if (seconds && left <= 0 && !stopped && !expired.current) { expired.current = true; callback.current(); } },[left,seconds,stopped]);
  return seconds > 0 && !stopped ? <div className="destin-countdown"><span>Décision dans {Math.ceil(left)} s</span><progress aria-label="Temps de décision restant" max={seconds} value={left}/></div> : <p className="destin-muted">Prends le temps de choisir.</p>;
}

export default function DestinPlayer({initialSnapshot,userId,onClose,onRestart,onComplete,goTo,preview=false}) {
  const [snapshot,setSnapshot] = useState(initialSnapshot),[phase,setPhase] = useState('loading'),[active,setActive] = useState(0);
  const [position,setPosition] = useState(initialSnapshot.run.position || 0),[muted,setMuted] = useState(false),[theatre,setTheatre] = useState(false);
  const [busy,setBusy] = useState(false),[error,setError] = useState(''),[saveState,setSaveState] = useState(preview?'Aperçu · non enregistré':'Parcours sauvegardé');
  const [clockStopped,setClockStopped] = useState(false),[captions,setCaptions] = useState(true),[selectedChoice,setSelectedChoice] = useState(null);
  const videos = [useRef(null),useRef(null)],root = useRef(null),choicesRoot = useRef(null);
  const activeRef = useRef(0),phaseRef = useRef(phase),current = useRef(snapshot),live = useRef(true),cue = useRef(false),pending = useRef(null),busyRef = useRef(false),lastCheckpoint = useRef(0);
  const node = snapshot.manifest.nodes.find(n => n.id === snapshot.run.node_id);
  current.current = snapshot; phaseRef.current = phase;
  const finished = snapshot.run.state === 'complete';
  const pathReward = snapshot.endingReward?.reward?.pathReward || null;

  const checkpoint = useCallback(async () => {
    const s = current.current, v = videos[activeRef.current].current;
    if (preview || !v || s.run.state !== 'playing' || busyRef.current || !Number.isFinite(v.currentTime)) return;
    lastCheckpoint.current = Date.now();
    try {
      const savedNode = s.run.node_id;
      await destinRequest('checkpoint',{runId:s.run.id,nodeId:savedNode,step:s.run.path.length,position:v.currentTime},userId);
      if (live.current && current.current.run.node_id === savedNode) setSaveState('Parcours sauvegardé');
    } catch { if (live.current) setSaveState('Sauvegarde à reprendre · connexion interrompue'); }
  },[preview,userId]);

  function selectChoice(choice) {
    if (busyRef.current || pending.current || choiceLock(choice,current.current)) return;
    if (preview) { applyDecision(choice); return; }
    setClockStopped(true); setSelectedChoice(choice);
  }
  const selectRef=useRef(selectChoice); selectRef.current=selectChoice;
  async function applyDecision(choice = null) {
    if (busyRef.current) return;
    const s = current.current, scene = s.manifest.nodes.find(n => n.id === s.run.node_id);
    if (choice && choiceLock(choice,s)) return;
    busyRef.current = true; setBusy(true); setError(''); setClockStopped(true); setSelectedChoice(null);
    const action = choice ? 'choose' : 'finish';
    if (!pending.current) pending.current = {action,choiceId:choice?.id,requestId:crypto.randomUUID(),nodeId:scene.id};
    const command = pending.current;
    try {
      let next;
      if (preview) {
        const path = choice ? [...s.run.path,{node:scene.id,choice:choice.id,label:choice.label,target:choice.target}] : s.run.path;
        const target = choice ? s.manifest.nodes.find(n => n.id === choice.target) : scene;
        if (!target) throw Error('Cette réponse n’est pas encore reliée à une scène.');
        next = {...s,run:{...s.run,path,node_id:target.id,position:target.start,state:choice?'playing':'complete'}};
      } else {
        next = await destinRequest(command.action,{runId:s.run.id,nodeId:command.nodeId,step:s.run.path.length,choiceId:command.choiceId,requestId:command.requestId},userId);
      }
      if (!live.current) return;
      pending.current = null; setSnapshot(next); setSaveState(preview?'Aperçu · non enregistré':'Choix enregistré · définitif');
      if (next.run.state === 'complete') { setPhase('complete'); onComplete?.(); }
    } catch (e) { if (live.current) { setError(e.message || 'La décision n’a pas pu être confirmée.'); setPhase(choice?'choice':'error'); } }
    finally { busyRef.current = false; if (live.current) setBusy(false); }
  }
  const decisionRef = useRef(applyDecision); decisionRef.current = applyDecision;
  function reachCue() {
    if (cue.current) return; cue.current = true;
    videos[activeRef.current].current?.pause();
    if (node.ending) decisionRef.current(null); else setPhase('choice');
  }
  const cueRef = useRef(reachCue); cueRef.current = reachCue;

  useEffect(() => {
    live.current = true;
    window.dispatchEvent(new CustomEvent('threeb:companion-voice-stop'));
    const onVisibility = () => { if (document.hidden) { videos[activeRef.current].current?.pause(); if (phaseRef.current === 'playing') setPhase('paused'); checkpoint(); } };
    const onPageHide = () => checkpoint();
    document.addEventListener('visibilitychange',onVisibility); window.addEventListener('pagehide',onPageHide);
    return () => { live.current = false; checkpoint(); document.removeEventListener('visibilitychange',onVisibility); window.removeEventListener('pagehide',onPageHide); for (const ref of videos) { ref.current?.pause(); } };
  },[checkpoint]);

  useEffect(() => {
    if (!node || finished) { setPhase(finished?'complete':'error'); return; }
    cue.current = false; setError(pending.current?'La confirmation reste à terminer. Réessaie la même décision.':''); setClockStopped(false); setSelectedChoice(null); setPosition(snapshot.run.position || node.start);
    if (preview && node.demo) {
      setPhase('playing');
      let elapsed = 0,previous = performance.now();
      const timer = setInterval(() => {
        const now = performance.now(),delta = Math.min(0.2,(now-previous)/1000); previous = now;
        if (document.hidden || phaseRef.current !== 'playing') return;
        elapsed += delta; setPosition(node.start+elapsed);
        if (elapsed >= node.end-node.start) { clearInterval(timer); cueRef.current(); }
      },100);
      return () => clearInterval(timer);
    }
    const index = 1-activeRef.current,video = videos[index].current;
    const url = sourceUrl(node.src,snapshot.media);
    if (!video || !url) { setError('La vidéo est inaccessible. Recharge le parcours.'); setPhase('error'); return; }
    setPhase('loading');
    let cancelled = false,opened = false,metadata = false;
    const fail = () => { if (!cancelled) { setError('La vidéo ne peut pas être lue. Vérifie la connexion puis recharge la scène.'); setPhase('error'); } };
    const prepare = () => {
      if (cancelled) return;
      if (!Number.isFinite(video.duration) || node.end > video.duration+0.25) { fail(); return; }
      metadata = true;
      video.currentTime = Math.max(node.start,Math.min(snapshot.run.position || node.start,node.end-0.05));
    };
    const open = async () => {
      if (cancelled || opened || !metadata) return; opened = true;
      const previousVideo=videos[activeRef.current].current;
      previousVideo?.pause(); activeRef.current = index; setActive(index);
      if (previousVideo && previousVideo!==video) { previousVideo.removeAttribute('src'); previousVideo.load(); }
      try { await video.play(); if (!cancelled) setPhase('playing'); }
      catch { if (!cancelled) setPhase('paused'); }
    };
    video.addEventListener('loadedmetadata',prepare); video.addEventListener('canplay',open); video.addEventListener('error',fail);
    video.muted = muted; video.playbackRate = 1; video.src = url; video.load();
    const timeout = setTimeout(() => { if (!opened) fail(); },25000);
    return () => { cancelled = true; clearTimeout(timeout); video.removeEventListener('loadedmetadata',prepare); video.removeEventListener('canplay',open); video.removeEventListener('error',fail); video.pause(); };
  },[snapshot.run.node_id,snapshot.run.state,snapshot.media,preview]);

  // No alternative is prefetched. Only the server-authorized current scene is loaded.
  useEffect(() => { for (const ref of videos) if (ref.current) ref.current.muted = muted; },[muted]);
  useEffect(() => { for (const ref of videos) if (ref.current) for (const track of ref.current.textTracks) track.mode = captions?'showing':'disabled'; },[captions,active,node?.caption]);
  useEffect(() => {
    if (phase !== 'choice') return;
    choicesRoot.current?.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    const keys = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]') || ['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)) return;
      const index = Number(e.key)-1;
      if (index >= 0 && index < node.choices.length && !pending.current) { e.preventDefault(); selectRef.current(node.choices[index]); }
    };
    window.addEventListener('keydown',keys); return () => window.removeEventListener('keydown',keys);
  },[phase,node?.id]);
  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') setTheatre(false); };
    window.addEventListener('keydown',esc); return () => window.removeEventListener('keydown',esc);
  },[]);

  async function resumeSaved() {
    if (busyRef.current) return; setBusy(true); busyRef.current = true;
    try {
      const next = preview ? {...snapshot,media:{...snapshot.media}} : await destinRequest('resume',{runId:snapshot.run.id},userId);
      if (live.current) {
        const unresolved=pending.current && next.run.node_id===pending.current.nodeId && next.run.state==='playing';
        if (!unresolved) pending.current=null;
        setSnapshot(next); setError(unresolved?'La confirmation reste à terminer. Réessaie la même décision.':'');
        setSaveState(preview?'Aperçu · non enregistré':'Parcours sauvegardé');
      }
    } catch (e) { if (live.current) setError(e.message); }
    finally { busyRef.current = false; if (live.current) setBusy(false); }
  }
  async function togglePlay() {
    if (phase === 'playing') { videos[activeRef.current].current?.pause(); setPhase('paused'); checkpoint(); return; }
    if (preview && node.demo) { setPhase('playing'); return; }
    try { await videos[activeRef.current].current?.play(); setPhase('playing'); } catch { setError('Appuie à nouveau sur Lecture pour autoriser la vidéo.'); }
  }
  async function expand() {
    setTheatre(value => !value);
    try { if (!document.fullscreenElement) await root.current?.requestFullscreen?.(); else await document.exitFullscreen?.(); } catch { /* CSS theatre keeps choices visible on iPhone. */ }
  }
  async function close() {
    videos[activeRef.current].current?.pause(); await checkpoint();
    if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => {});
    onClose();
  }
  function tick(index,event) {
    if (index !== activeRef.current || cue.current || !node) return;
    setPosition(event.currentTarget.currentTime);
    if (event.currentTarget.currentTime >= node.end-0.08) cueRef.current();
    else if (!preview && Date.now()-lastCheckpoint.current > 8000) checkpoint();
  }
  if (!node) return <section className="destin"><p role="alert">Cette scène n’existe pas.</p><button onClick={onClose}>Retour aux films</button></section>;
  const totalVotes = (snapshot.choiceStats || []).reduce((sum,c) => sum+c.count,0);
  const lastDecision = snapshot.run.path.at(-1);
  const ratio = Math.max(0,Math.min(1,(position-node.start)/(node.end-node.start)));
  return <section ref={root} className={`destin destin-player ${theatre?'is-theatre':''}`} aria-label={`3B DESTIN · ${snapshot.manifest.title}`}>
    <div className="destin-player-bar"><button className="destin-icon" onClick={close} aria-label={preview?'Retour au studio ou aux films':'Quitter et conserver mon parcours'}><ArrowLeft size={20}/></button><div><span className="destin-kicker">{preview?'APERÇU · AUCUN GAIN':'3B DESTIN'}</span><strong>{snapshot.manifest.title}</strong></div><button className="destin-icon" onClick={expand} aria-label="Mode cinéma plein écran"><Expand size={19}/></button></div>
    <div className={`destin-screen ${phase==='choice'?'has-choice':''}`}>
      {[0,1].map(index => <video key={index} ref={videos[index]} className={`destin-video ${active===index?'is-active':''}`} playsInline preload="metadata" muted={muted} disablePictureInPicture crossOrigin={node.caption?'anonymous':undefined} aria-label={node.title} aria-hidden={active!==index} onTimeUpdate={event => tick(index,event)} onEnded={() => {if(index===activeRef.current) cueRef.current();}}>
        {node.caption && <track key={sourceUrl(node.caption,snapshot.media)} kind="subtitles" src={sourceUrl(node.caption,snapshot.media)} srcLang="fr" label="Français" default/>}
      </video>)}
      {preview && node.demo && <div className="destin-demo-scene"><div className="destin-orbit" aria-hidden="true"/><span className="destin-kicker">DÉMONSTRATION INTERACTIVE</span><h2>{node.title}</h2><p>{node.ending?'Chaque décision ouvre un autre horizon.':'Un seuil. Deux voies. La suite t’appartient.'}</p></div>}
      {phase==='loading' && <div className="destin-screen-state" role="status"><span className="destin-loader"/>Ouverture de la scène…</div>}
      {phase==='paused' && <button className="destin-center-play" onClick={togglePlay} aria-label="Lire ou reprendre la scène"><Play size={28}/><span>Reprendre</span></button>}
      {phase==='choice' && <div className="destin-decision" ref={choicesRoot} role="group" aria-labelledby="destin-question"><span className="destin-kicker">LA SUITE T’APPARTIENT</span><h2 id="destin-question">{node.question}</h2><div className="destin-choices">{node.choices.map((choice,index) => { const lock = choiceLock(choice,snapshot); return <button key={choice.id} className="destin-choice" disabled={!!lock || busy || !!pending.current} onClick={() => selectChoice(choice)}><span className="destin-choice-letter">{String.fromCharCode(65+index)}</span><span>{choice.label}{lock && <small>{lock}</small>}</span></button>; })}</div><ChoiceClock key={node.id} seconds={preview?node.timeout:0} stopped={clockStopped || busy || !!error} onExpire={() => applyDecision(node.choices.find(c => c.id===node.defaultChoice))}/>{preview && !clockStopped && node.timeout>0 && <button className="destin-text-button" onClick={() => setClockStopped(true)}>Prendre mon temps</button>}</div>}
      {finished && <div className="destin-ending" aria-live="polite"><span className="destin-ending-seal"><Check size={36}/></span><span className="destin-kicker">{node.ending?.rarity==='secret'?'FIN SECRÈTE':node.ending?.rarity==='rare'?'FIN RARE':'DESTIN ACCOMPLI'}</span><h2>{node.ending?.title || node.title}</h2>{node.ending?.fragment && <p>{node.ending.fragment}</p>}<p className="destin-muted">{preview?'Démonstration terminée. Aucun gain ni parcours réel n’a été créé.':'Ton destin est accompli et conservé. Les autres chemins de cette histoire restent fermés.'}</p>{!preview&&pathReward&&<section className="destin-path-reward" data-path={pathReward.endingId==='combat-memoire'?'memoire':'avenir'}><span className="destin-kicker">HÉRITAGE ACTIVÉ</span><h3>{pathReward.passportTitle}</h3><div className="destin-path-reward-grid"><div><small>OBJET</small><strong>{pathReward.itemCode==='DESTIN_MEMORY_KEY'?'Clé des Origines':'Boussole de l’Aube'}</strong></div><div><small>MONDE 3B</small><strong>{pathReward.worldCapability==='echo_origins'?'Écho des Origines':'Tracé de l’Aube'}</strong></div><div><small>CRÉER MA VILLE</small><strong>{pathReward.cityBuilding==='DESTIN_MEMORY_PAVILION'?'Pavillon de la Mémoire':'Atelier de l’Avenir'}</strong></div></div>{goTo&&<div className="destin-actions"><button className="destin-secondary" onClick={()=>goTo('passport')}>Voir mon Passeport</button><button className="destin-secondary" onClick={()=>goTo('world3b')}>Entrer dans le Monde 3B</button></div>}</section>}<div className="destin-actions">{preview && <button className="destin-primary" onClick={onRestart}><RotateCcw size={17}/>Explorer un autre chemin</button>}<button className="destin-secondary" onClick={close}>Retour</button></div></div>}
      {busy && <div className="destin-saving" role="status">Confirmation de ta décision…</div>}
    </div>
    {selectedChoice && !preview && <DestinConfirmation choice={selectedChoice} onCancel={()=>setSelectedChoice(null)} onConfirm={()=>applyDecision(selectedChoice)}/>}
    {error && <div className="destin-alert" role="alert"><p>{error}</p><div className="destin-actions">{pending.current && <button disabled={busy} onClick={() => applyDecision(node.choices.find(c => c.id===pending.current?.choiceId) || null)}>Réessayer la même décision</button>}<button disabled={busy} onClick={resumeSaved}>Reprendre la sauvegarde</button></div></div>}
    <div className="destin-controls"><div className="destin-control-left">{['playing','paused'].includes(phase) && <button className="destin-icon" onClick={togglePlay} aria-label={phase==='playing'?'Pause':'Lecture'}>{phase==='playing'?<Pause size={18}/>:<Play size={18}/>}</button>}<button className="destin-icon" onClick={() => setMuted(v => !v)} aria-label={muted?'Activer le son':'Couper le son'} aria-pressed={muted}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>{node.caption && <button className="destin-icon" onClick={() => setCaptions(v => !v)} aria-pressed={captions} aria-label="Sous-titres français">CC</button>}<span>{formatTime(position-node.start)} / {formatTime(node.end-node.start)}</span></div><span className="destin-save-state" role="status">{saveState}</span></div>
    <progress className="destin-progress" aria-label="Progression de la scène" max={1} value={ratio}/>
    {!finished && totalVotes>0 && lastDecision && <p className="destin-real-stats">{Math.round(100*(snapshot.choiceStats.find(c => c.choice===lastDecision.choice)?.count || 0)/totalVotes)} % des premiers choix enregistrés suivent ta décision précédente · {totalVotes} participant{totalVotes>1?'s':''}.</p>}
  </section>;
}
