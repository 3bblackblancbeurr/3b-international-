import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowUpRight,ChevronLeft,Compass,KeyRound,LockKeyhole,Pause,Play,RotateCcw,SkipForward,X} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {NEXUS_DOORS,doorByCode,nexusProgress,readSelectedDoor,canTravelFromNexus} from './nexus-data.js';
import {enterNexusWorld} from '../passport/nexus-flow.js';
import {mountNexusDialog} from '../passport/nexus-dialog.js';
import '../styles/passport-nexus.css';
import '../styles/passport-nexus-premium.css';

const worldAPI=async()=>{const [save,engine]=await Promise.all([import('../world/save.js'),import('../world/engine.js')]);return {...save,applyWorldAction:engine.applyWorldAction};};

function PortalMark({shape='roman',...props}) {
  const paths={spire:'M12 53V20L20 14V10L30 3L40 10V14L48 20V53',facet:'M17 53L10 40V20L22 5H38L50 20V40L43 53',terrace:'M12 53V14H20V7H40V14H48V53',ogive:'M12 53V28Q12 15 30 3Q48 15 48 28V53',horseshoe:'M16 53V35C-2 9 15 3 30 3S62 9 44 35V53',keyhole:'M16 53V33C0 21 9 5 30 3C51 5 60 21 44 33V53',scallop:'M12 53V28Q4 20 14 17Q12 5 23 9Q30 -1 37 9Q48 5 46 17Q56 20 48 28V53',roman:'M12 53V25A18 18 0 0 1 48 25V53'};
  return <svg viewBox="0 0 60 60" fill="none" aria-hidden="true" {...props}><path d={paths[shape]||paths.roman} stroke="currentColor" strokeWidth="1.5"/><path d="M7 56H53M23 50V30M30 50V23M37 50V30" stroke="currentColor" strokeWidth=".6" opacity=".5"/></svg>;
}
export default function PassportNexus({open,onClose,goTo,reducedMotion=false}) {
  const account=useLoyalty(),uid=account.user?.id;
  const dialog=useRef(null),canvas=useRef(null),scene=useRef(null),session=useRef(0),inFlight=useRef(false),current=useRef(null);
  current.current={open,uid,loading:account.loading,onClose,goTo};
  const [phase,setPhase]=useState('scan'),[selected,setSelected]=useState('FR'),[overview,setOverview]=useState(true);
  const [paused,setPaused]=useState(false),[systemReduced,setSystemReduced]=useState(false),[quality,setQuality]=useState('auto');
  const [renderState,setRenderState]=useState('loading'),[save,setSave]=useState(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const reduced=reducedMotion||systemReduced,door=doorByCode(selected)||NEXUS_DOORS[0],progress=nexusProgress(save);
  const resumeOrigin=!!save?.adventure?.encounter?.final&&!progress.finished,originEnabled=loaded&&(progress.originUnlocked||resumeOrigin);
  useLayoutEffect(()=>{if(!open||!dialog.current)return;return mountNexusDialog(dialog.current,close);},[open]);
  useEffect(()=>{const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');if(!media)return;const sync=()=>setSystemReduced(media.matches);sync();media.addEventListener?.('change',sync);return()=>media.removeEventListener?.('change',sync);},[]);
  useEffect(()=>{
    if(!open)return;
    const active=++session.current;inFlight.current=false;
    try{setSelected(readSelectedDoor(window.localStorage));}catch{setSelected('FR');}setOverview(true);setPaused(false);setBusy(false);setSave(null);setLoaded(false);setNotice('');
    setPhase(reduced?'nexus':'scan');
    if(!account.loading)worldAPI().then(async module=>{
      const result=await module.loadWorld(uid);if(session.current!==active)return;
      setSave(result.data);setLoaded(true);setNotice(result.message);
    }).catch(()=>{if(session.current===active){setLoaded(false);setNotice('La progression est indisponible. Ferme puis rouvre le passeport pour réessayer.');}});
    return()=>{session.current++;inFlight.current=false;};
    // Opening/identity changes reset a session. Callback identity must NOT restart the tunnel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,uid,account.loading]);
  useEffect(()=>{
    if(!open)return;
    if(reduced){if(phase==='scan'||phase==='tunnel')setPhase('nexus');return;}
    if(paused)return;
    const next=phase==='scan'?'tunnel':phase==='tunnel'?'nexus':null;
    if(!next)return;
    const timer=window.setTimeout(()=>setPhase(next),phase==='scan'?950:3300);
    return()=>window.clearTimeout(timer);
  },[open,phase,paused,reduced]);
  useEffect(()=>{
    if(!open)return;let cancelled=false;setRenderState('loading');
    import('./nexus-scene.js').then(({createNexusScene})=>{
      if(cancelled||!canvas.current)return;
      const engine=createNexusScene(canvas.current,{onFailure:()=>{if(!cancelled)setRenderState('fallback');}});
      if(!engine){setRenderState('fallback');return;}
      scene.current=engine;setRenderState('ready');
    }).catch(()=>{if(!cancelled)setRenderState('fallback');});
    return()=>{cancelled=true;scene.current?.destroy();scene.current=null;};
  },[open]);
  useEffect(()=>{scene.current?.update({phase,selected,overview,paused,reduced,quality});},[phase,selected,overview,paused,reduced,quality,renderState]);
  useLayoutEffect(()=>{if(open&&dialog.current&&!dialog.current.contains(document.activeElement))dialog.current.querySelector('button:not(:disabled)')?.focus({preventScroll:true});},[open,phase]);
  function select(code){setSelected(code);setOverview(false);setPhase('nexus');}
  function close(){session.current++;inFlight.current=false;current.current.onClose?.();}
  async function travel(destination){
    if(inFlight.current||current.current.loading||(destination!=null&&!loaded))return;
    const active=session.current,owner=current.current.uid;
    const valid=()=>active===session.current&&current.current.open&&owner===current.current.uid&&!current.current.loading;
    inFlight.current=true;setBusy(true);
    try{
      if(destination!=null){const api=await worldAPI();if(!valid())return;const result=await enterNexusWorld(api,owner,destination,valid);if(!result||!valid())return;}
      if(!valid())return;const navigate=current.current.goTo;close();if(navigate)navigate('world3b');else window.location.hash='world3b';
    }catch(error){if(valid())setNotice(error.message||'Le passage ne peut pas être ouvert. Ta progression est conservée.');}
    finally{if(valid()){inFlight.current=false;setBusy(false);}}
  }
  if(!open)return null;
  const inTransit=phase==='scan'||phase==='tunnel';
  return createPortal(<dialog ref={dialog} className="n3-dialog" aria-labelledby="n3-title" tabIndex={-1} aria-modal="true" data-phase={phase} data-motion={reduced||paused?'still':'live'} style={{'--n3-accent':door.color}}>
    <div className="n3-environment" aria-hidden="true" onPointerMove={e=>{if(e.pointerType==='mouse'){const r=e.currentTarget.getBoundingClientRect();scene.current?.pointer((e.clientX-r.left)/r.width-.5,.5-(e.clientY-r.top)/r.height);}}}>
      <div className="n3-fallback" data-visible={renderState!=='ready'}><div className="n3-fallback-halo"/><PortalMark shape={phase==='origin'?'terrace':door.shape}/><span>3B</span><div className="n3-fallback-floor"/></div>
      <canvas ref={canvas} className="n3-canvas" data-visible={renderState==='ready'}/>
    </div>
    <div className="n3-shade" aria-hidden="true"/>
    <header className="n3-topbar">
      <div className="n3-brand"><b>3B</b><span>NEXUS<small>BLACK · BLANC · BEUR</small></span></div>
      <div className="n3-tools">
        <label className="n3-quality"><span>Rendu</span><select aria-label="Qualité du rendu" value={quality} onChange={e=>setQuality(e.target.value)}><option value="auto">Auto</option><option value="fluid">Fluide</option><option value="detail">Détaillé</option></select></label>
        <button type="button" className="n3-icon" aria-label={paused?'Reprendre les animations':'Mettre les animations en pause'} disabled={reduced} onClick={()=>setPaused(v=>!v)}>{paused||reduced?<Play size={17}/>:<Pause size={17}/>}</button>
        <button type="button" className="n3-icon" aria-label="Fermer et revenir au passeport" onClick={close} autoFocus><X size={20}/></button>
      </div>
    </header>
    {inTransit?<section className="n3-transit" aria-live="polite">
      <div className="n3-scan-sigil" aria-hidden="true"><i/><i/><b>3B</b></div>
      <p className="n3-kicker">{phase==='scan'?'LE PASSEPORT OUVRE LE PASSAGE':'AU-DELÀ DU VISIBLE'}</p>
      <h2 id="n3-title">{phase==='scan'?'Éveil du Cercle':'Traversée du Nexus'}</h2>
      <p>Huit mondes. Une même origine.</p>
      <button type="button" className="n3-text-button" onClick={()=>setPhase('nexus')}><SkipForward size={16}/> Passer l’introduction</button>
      <div className="n3-transit-line" aria-hidden="true"/>
    </section>:<main className="n3-content">
      <div className="n3-hero">
        <section className="n3-copy" aria-live="polite">
          <p className="n3-kicker">{phase==='origin'?'LE NEUVIÈME SEUIL':overview?'LE SANCTUAIRE DE L’HÉRITAGE':`PORTE ${String(NEXUS_DOORS.indexOf(door)+1).padStart(2,'0')} / 08 · ${door.value.toUpperCase()}`}</p>
          <h2 id="n3-title">{phase==='origin'?'ORIGINE':overview?<>L’héritage<br/><em>prend vie.</em></>:door.country}</h2>
          <div className="n3-copy-rule"/>
          <h3>{phase==='origin'?'Avant les frontières, le lien.':overview?'Huit portes. Un Cercle à reconstruire.':door.title}</h3>
          <p className="n3-description">{phase==='origin'?'Tu as réuni les huit sceaux et reconstruit les huit pays. Derrière chaque langue, chaque visage et chaque histoire, une même humanité. Le Cercle n’efface pas les différences : il les rassemble.':overview?'Chaque porte porte une valeur. Chaque voyage rend au Cercle une part de sa lumière. Choisis ton prochain horizon.':door.description}</p>
          {!overview&&phase!=='origin'&&<dl className="n3-door-meta"><div><dt>Gardien de l’héritage</dt><dd>{door.guardian} <span>· {door.value}</span></dd></div><div><dt>Signature du seuil</dt><dd>{door.material}</dd></div></dl>}
          {phase==='origin'?<><blockquote>« Ce n’est pas une marque, c’est un héritage. »</blockquote><button type="button" className="n3-primary" disabled={!originEnabled||busy||account.loading} onClick={()=>travel('ORIGINE')}>{busy?'Ouverture du passage…':resumeOrigin?'Reprendre le défi de l’Union':'Entrer dans le défi de l’Union'}<ArrowUpRight size={18}/></button><button type="button" className="n3-text-button" onClick={()=>{setPhase('nexus');setOverview(true);}}><ChevronLeft size={14}/> Retrouver les huit portes</button></>:<>
            <button type="button" className="n3-primary" disabled={busy||account.loading||(!overview&&!loaded)} onClick={()=>travel(overview?undefined:door.code)}>{busy?'Ouverture du passage…':overview?'Explorer le Monde 3B':`Traverser · ${door.country}`}<ArrowUpRight size={20}/></button>
            {!overview&&<button type="button" className="n3-text-button" onClick={()=>setOverview(true)}><RotateCcw size={14}/> Vue du Nexus</button>}
          </>}
        </section>
        <aside className="n3-progress" aria-label={loaded?`${progress.count} clés sur huit`:'Chargement de la progression'}>
          <div><KeyRound size={14}/><span>LE CERCLE BRISÉ</span><strong>{loaded?String(progress.count).padStart(2,'0'):'—'}<small> / 08</small></strong></div>
          <div className="n3-key-track">{NEXUS_DOORS.map(d=><i key={d.code} data-found={progress.keys.includes(d.code)} title={`${d.country} : ${progress.keys.includes(d.code)?'sceau retrouvé':'sceau à retrouver'}`}/>)}</div>
          <p>{loaded?`${progress.restoredCount} / 8 pays reconstruits` :'Lecture de ta progression…'}</p>
        </aside>
        <div className="n3-scene-caption" aria-hidden="true">{renderState==='fallback'?'MODE GRAPHIQUE SIMPLIFIÉ':renderState==='loading'?'OUVERTURE DE LA SCÈNE':phase==='origin'?'09 / LE COMMENCEMENT':overview?'LE CERCLE BRISÉ / NEXUS 3B':`${door.code} / ${door.value.toUpperCase()}`}</div>
      </div>
      <nav className="n3-destinations" aria-label="Choisir une porte du Nexus">
        <div className="n3-destinations-label"><span>LES HUIT HORIZONS</span><small>Choisis une porte pour l’approcher.</small></div>
        <div className="n3-door-list">{NEXUS_DOORS.map((d,i)=><button type="button" key={d.code} className="n3-door" style={{'--door-accent':d.color}} aria-pressed={!overview&&selected===d.code&&phase==='nexus'} aria-label={`${d.country}, ${d.value}, ${d.guardian}`} onClick={()=>select(d.code)}><span className="n3-door-index">0{i+1}</span><PortalMark shape={d.shape}/><strong>{d.country}</strong><small>{d.value}</small>{progress.keys.includes(d.code)&&<KeyRound size={11} className="n3-door-key"/>}</button>)}</div>
      </nav>
      <footer className="n3-footer">
        <div className="n3-save-status" role="status"><span className="n3-status-dot"/>{notice||'Aucune clé n’est donnée par une simple visite.'}{loaded&&!canTravelFromNexus(save)&&<button type="button" onClick={()=>travel()}>Reprendre la rencontre <ArrowUpRight size={13}/></button>}</div>
        <button type="button" className="n3-origin" disabled={!originEnabled||busy||account.loading} onClick={()=>{setPhase('origin');setOverview(false);}}><LockKeyhole size={17}/><span>3B — ORIGINE<small>{progress.finished?'L’Union est retrouvée':resumeOrigin?'Reprendre le défi de l’Union':originEnabled?'Les huit mondes sont réunis · ouvrir':`Requis : 8 sceaux + 8 pays reconstruits`}</small></span><b>09</b></button>
      </footer>
    </main>}
  </dialog>,document.body);
}
