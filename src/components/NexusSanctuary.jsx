import { ArrowUpRight, ChevronRight, Compass, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { CircleArtwork, PortalArtwork } from './NexusArtwork.jsx';
import { NEXUS_ART } from '../passport/nexus-art-data.js';

export default function NexusSanctuary({ id, world, progress, selectedCode, onSelect, onTravel, onRetry, busy, loading, error, saveMessage }) {
  const selected = progress.doors.find(door => door.code === selectedCode) || progress.doors[0];
  const art = NEXUS_ART[selected.code];
  const encounter = world?.adventure?.encounter;
  const unresolved = encounter && !['victory','recruited','missed','defeat'].includes(encounter.result);
  const resumeOrigin = !!encounter?.final && unresolved && !progress.finished;
  const originEnabled = !!world && (progress.originReady || resumeOrigin);
  const stateText = door => !world ? 'Synchronisation' : door.restored ? 'Pays reconstruit' : door.sealed ? 'Sceau retrouvé' : 'À découvrir';
  function moveDoor(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % 8;
    else if (event.key === 'ArrowLeft') next = (index + 7) % 8;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 7;
    else return;
    event.preventDefault();
    onSelect(progress.doors[next].code);
    const button = event.currentTarget.parentElement?.querySelectorAll('.nx-door')[next];
    button?.focus({preventScroll:true});
    button?.scrollIntoView({behavior:'instant',block:'nearest',inline:'nearest'});
  }
  return <main className="nx-sanctuary" aria-label="Sanctuaire Nexus 3B">
    <section className="nx-hero" id={`${id}-sanctuary`} style={{'--gate-color':art.color}}>
      <div className="nx-architecture" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
      <div className="nx-hero-intro">
        <p className="nx-overline"><span/> LE SANCTUAIRE DES HÉRITAGES</p>
        <h2>NEXUS <em>3B</em></h2>
        <p className="nx-manifesto">Huit mondes.<br/>{' '}Une seule origine.</p>
        <p className="nx-intro-text">Chaque porte porte une valeur.<br/>Chaque fragment raconte ton histoire.</p>
        <div className="nx-heritage-progress">
          <CircleArtwork doors={progress.doors} id={`${id}-small-circle`}/>
          <div><span className="nx-overline">LE CERCLE BRISÉ</span><strong>{world ? `${progress.sealCount}` : '—'}<small> / 8 sceaux</small></strong><span>{world ? `${progress.restoredCount} pays reconstruits` : 'Lecture de ta progression…'}</span></div>
        </div>
        <button className="nx-resume" type="button" disabled={busy||loading} onClick={()=>onTravel()}><Compass size={16}/>{unresolved?'Reprendre ma rencontre':'Reprendre mon aventure'}<ChevronRight size={15}/></button>
      </div>
      <div className="nx-stage" aria-label={`Porte ${selected.country}, ${selected.value}`}>
        <div className="nx-stage-halo" aria-hidden="true"/>
        <div className="nx-star-field" aria-hidden="true">{Array.from({length:14},(_,n)=><i key={n} style={{left:`${(n*37+11)%100}%`,top:`${(n*19+13)%75}%`,'--delay':`${-n*.8}s`}}/>)}</div>
        <div className="nx-stage-orbit" aria-hidden="true"/>
        <div className="nx-stage-gateway" key={selected.code}><PortalArtwork code={selected.code} id={`${id}-hero-${selected.code}`}/></div>
        <div className="nx-stage-floor" aria-hidden="true"/>
        <span className="nx-stage-coordinate" aria-hidden="true">{selected.number} / VIII <i/> {selected.code} — 3B</span>
      </div>
      <section className="nx-destination" aria-label="Destination sélectionnée" aria-live="polite" aria-atomic="true">
        <p className="nx-overline">PORTE {selected.number} <i/> {selected.value.toUpperCase()}</p>
        <h3>{selected.country}</h3>
        <p className="nx-destination-title">{art.title}</p>
        <p className="nx-destination-description">{art.description}</p>
        <dl><div><dt>Gardien du passage</dt><dd>{art.guardian}</dd></div><div><dt>Matières & lumière</dt><dd>{art.material}</dd></div></dl>
        <p className="nx-seal-state" data-complete={selected.sealed}><ShieldCheck size={14}/>{stateText(selected)}</p>
        <button type="button" className="nx-enter" disabled={!world||busy||loading||!!unresolved} onClick={()=>onTravel(selected.code)}><span>{busy?'Préparation du passage…':'Franchir la porte'}</span><ArrowUpRight size={19}/></button>
        {unresolved&&<small className="nx-encounter-hint">Termine ta rencontre en cours pour changer de pays.</small>}
      </section>
    </section>

    <section className="nx-gallery" id={`${id}-doors`} aria-labelledby={`${id}-doors-title`}>
      <header className="nx-section-head"><div><p className="nx-overline">L’ATLAS DU CERCLE</p><h3 id={`${id}-doors-title`}>Les huit portes</h3></div><p>Sélectionne ton passage <ChevronRight size={15}/></p></header>
      <div className="nx-door-gallery" role="group" aria-label="Choisir une porte du Nexus">
        {progress.doors.map((door,index)=><button type="button" key={door.code} className="nx-door" aria-pressed={door.code===selectedCode} onClick={()=>onSelect(door.code, true)} onKeyDown={event=>moveDoor(event,index)} style={{'--gate-color':NEXUS_ART[door.code].color}}>
          <span className="nx-door-id">{door.number}<span>{door.code}</span></span>
          <PortalArtwork code={door.code} id={`${id}-tile-${door.code}`} compact/>
          <span className="nx-door-copy"><strong>{door.country}</strong><small>{door.value}</small></span>
          <span className="nx-door-dot" data-sealed={!!door.sealed} aria-label={stateText(door)}/>
        </button>)}
      </div>
      <p className="nx-gallery-caption">Huit gardiens. Huit valeurs. Un héritage à reconstruire.<span>BLACK · BLANC · BEUR</span></p>
    </section>

    <section className="nx-origin" id={`${id}-origin`} data-unlocked={originEnabled} aria-labelledby={`${id}-origin-title`}>
      <div className="nx-origin-art"><PortalArtwork code="ORIGINE" id={`${id}-origin-gate`} compact locked={!originEnabled}/></div>
      <div className="nx-origin-copy"><p className="nx-overline"><LockKeyhole size={12}/> LE NEUVIÈME PASSAGE</p><h3 id={`${id}-origin-title`}>ORIGINE</h3><p>{progress.finished?'Le Cercle est réuni. Ton héritage continue.':'Ce n’est pas une marque. C’est un héritage.'}</p><span>{progress.finished?'L’Union est retrouvée':resumeOrigin?'Ton défi de l’Union est en cours.':originEnabled?'Les huit valeurs sont réunies. Le passage t’attend.':'Réunis les huit sceaux et reconstruis les huit pays.'}</span></div>
      <div className="nx-origin-access"><div className="nx-origin-marks" aria-label={world?`${progress.sealCount} sceaux sur huit`:'Sceaux en cours de chargement'}>{progress.doors.map(door=><span key={door.code} data-complete={door.sealed} title={`${door.country} — ${door.sealed?'sceau retrouvé':'sceau à retrouver'}`}/>)}</div><button type="button" disabled={!originEnabled||busy||loading} onClick={()=>onTravel('ORIGINE')}>{originEnabled?<ArrowUpRight size={15}/>:<LockKeyhole size={15}/>} {progress.finished?'L’Union retrouvée':resumeOrigin?'Reprendre le défi':originEnabled?'Ouvrir ORIGINE':'Passage verrouillé'}</button></div>
    </section>
    <div className="nx-feedback" aria-live="polite">{busy&&<p role="status">Préparation du passage. Ta progression est conservée.</p>}{error&&<div className="nx-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry} disabled={busy}><RotateCcw size={14}/>Réessayer</button></div>}</div>
    <footer className="nx-footer"><span>3B INTERNATIONAL <i/> LE CERCLE BRISÉ</span><p>{saveMessage||'Ton passeport. Ton monde. Ton héritage.'}</p><span>ÉDITION NEXUS · 01</span></footer>
  </main>;
}
