import {useEffect,useRef,useState} from 'react';
import {ArrowDownToLine,ArrowRight,ArrowUpRight,CalendarDays,Check,CheckCircle2,ChevronRight,ClipboardList,Compass,Download,FileText,Globe2,MapPin,Navigation,Pencil,Plane,Plus,RotateCcw,ShieldCheck,Trash2,Upload,X} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {COUNTRY_INDEX,countryFor} from '../memberSources.js';
import {applyTravelAction,createTravelStep,createTravelTrip,exportTravelBackup,exportTravelText,formatTravelCost,formatTravelDate,orderedTravelSteps,parseTravelBackup,parseTravelCost,readTravelState,saveTravelState,TRAVEL_ADVICE_URL,TRAVEL_MAX_BYTES,TRAVEL_STORAGE_KEY,travelSummary} from './travel-model.js';
import './travel-notebook.css';

const ART={FR:'france',DZ:'algerie',MA:'maroc',TN:'tunisie',ES:'espagne',IT:'italie',TR:'turquie',EE:'estonie'};

function TripEditor({trip,onSave,onCancel}){
  const [draft,setDraft]=useState(trip),[error,setError]=useState('');
  const field=(key,value)=>{setDraft(old=>({...old,[key]:value}));setError('');};
  return <form className="travel-editor" onSubmit={event=>{event.preventDefault();try{onSave(draft);}catch(cause){setError(cause.message);}}}>
    <div className="travel-section-heading"><div><span className="travel-eyebrow">LES PREMIERS REPÈRES</span><h4>{trip.title?'Modifier mon voyage':'Imaginer mon prochain départ'}</h4></div><Button variant="health" className="travel-icon-button" aria-label="Fermer le formulaire de voyage" onClick={onCancel}><X size={19}/></Button></div>
    <label htmlFor="travel-title">Nom de mon voyage<input id="travel-title" autoFocus required maxLength={100} value={draft.title} onChange={event=>field('title',event.target.value)} placeholder="Ex. Mon escapade à Lisbonne"/></label>
    <label htmlFor="travel-country">Destination<select id="travel-country" value={draft.country} onChange={event=>field('country',event.target.value)}>{COUNTRY_INDEX.map(country=><option key={country[0]} value={country[0]}>{country[3]} {country[1]}</option>)}</select></label>
    <div className="travel-form-columns"><label htmlFor="travel-start">Départ <span>(facultatif)</span><input id="travel-start" type="date" value={draft.startDate} max={draft.endDate||undefined} onChange={event=>field('startDate',event.target.value)}/></label><label htmlFor="travel-end">Retour <span>(facultatif)</span><input id="travel-end" type="date" value={draft.endDate} min={draft.startDate||undefined} onChange={event=>field('endDate',event.target.value)}/></label></div>
    <label htmlFor="travel-notes">Mes idées et envies<textarea id="travel-notes" rows={3} maxLength={1200} value={draft.notes} onChange={event=>field('notes',event.target.value)} placeholder="Les lieux, les rencontres, ce que tu aimerais vivre…"/></label>
    <p className="travel-form-hint">Garde les références de réservation, documents d’identité et informations sensibles hors de ce carnet local.</p>
    {error&&<p className="travel-feedback is-error" role="alert">{error}</p>}
    <div className="travel-form-actions"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button variant="champagne" type="submit"><Check size={16}/>Enregistrer mon voyage</Button></div>
  </form>;
}

function StepEditor({step,trip,onSave,onCancel}){
  const [draft,setDraft]=useState(step),[cost,setCost]=useState(step.estimatedMinor?(step.estimatedMinor/100).toFixed(2):''),[error,setError]=useState('');
  const field=(key,value)=>{setDraft(old=>({...old,[key]:value}));setError('');};
  return <form className="travel-editor travel-step-editor" onSubmit={event=>{event.preventDefault();const estimatedMinor=parseTravelCost(cost);if(estimatedMinor===null){setError('Saisis un budget positif ou nul avec deux décimales maximum.');return;}try{onSave({...draft,estimatedMinor});}catch(cause){setError(cause.message);}}}>
    <div className="travel-section-heading"><h4>{step.title?'Modifier mon étape':'Une nouvelle étape'}</h4><Button variant="health" className="travel-icon-button" aria-label="Fermer le formulaire d’étape" onClick={onCancel}><X size={18}/></Button></div>
    <label htmlFor="travel-step-title">Mon programme<input id="travel-step-title" autoFocus required value={draft.title} maxLength={120} onChange={event=>field('title',event.target.value)} placeholder="Ex. Balade dans le centre historique"/></label>
    <label htmlFor="travel-step-place">Ville ou lieu <span>(facultatif)</span><input id="travel-step-place" value={draft.place} maxLength={120} onChange={event=>field('place',event.target.value)} placeholder="Ex. Lisbonne · Alfama"/></label>
    <div className="travel-form-columns"><label htmlFor="travel-step-date">Date <span>(facultatif)</span><input id="travel-step-date" type="date" min={trip.startDate||undefined} max={trip.endDate||undefined} value={draft.date} onChange={event=>field('date',event.target.value)}/></label><label htmlFor="travel-step-cost">Budget estimé en €<input id="travel-step-cost" inputMode="decimal" maxLength={11} value={cost} onChange={event=>{setCost(event.target.value);setError('');}} placeholder="0,00"/></label></div>
    <label htmlFor="travel-step-notes">Ce que je veux retenir<textarea id="travel-step-notes" rows={2} maxLength={800} value={draft.notes} onChange={event=>field('notes',event.target.value)} placeholder="Une idée, un créneau, un conseil à vérifier…"/></label>
    {error&&<p className="travel-feedback is-error" role="alert">{error}</p>}
    <div className="travel-form-actions"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button variant="champagne" type="submit"><Check size={16}/>Enregistrer l’étape</Button></div>
  </form>;
}

export default function TravelNotebook({initialCountry='FR'}){
  const [session,setSession]=useState(()=>readTravelState()),[country,setCountry]=useState(COUNTRY_INDEX.some(item=>item[0]===initialCountry)?initialCountry:'FR');
  const current=useRef(session);
  const [tripDraft,setTripDraft]=useState(null),[stepDraft,setStepDraft]=useState(null),[panel,setPanel]=useState('itinerary');
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[newCheck,setNewCheck]=useState(''),[deleting,setDeleting]=useState(''),[pendingImport,setPendingImport]=useState(null),[undo,setUndo]=useState(null),[external,setExternal]=useState(false);
  const fileInput=useRef(null),editorRef=useRef(null);
  const state=session.state,trip=state.trips.find(item=>item.id===state.selectedId)||null,summary=trip?travelSummary(trip):null;
  const destination=countryFor(trip?.country||country),art=ART[destination[0]];
  function publish(next){current.current=next;setSession(next);}
  useEffect(()=>{
    const handle=event=>{if(event.key===TRAVEL_STORAGE_KEY||event.key===null)setExternal(true);};
    window.addEventListener('storage',handle);return()=>window.removeEventListener('storage',handle);
  },[]);
  useEffect(()=>{if(tripDraft||stepDraft)editorRef.current?.scrollIntoView?.({block:'nearest'});},[tripDraft?.id,stepDraft?.id]);
  function commit(action,text,remember=true){
    const old=current.current,next=applyTravelAction(old.state,action);
    const saved=saveTravelState(next,{expectedRaw:old.raw});
    if(saved.conflict){setExternal(true);setError(saved.warning);return false;}
    if(remember)setUndo(old.state);
    publish({state:next,raw:saved.ok?saved.raw:old.raw,warning:saved.ok?'':saved.warning});
    setError('');setMessage(text||'Carnet enregistré sur cet appareil.');return true;
  }
  function act(action,text,remember=true){try{return commit(action,text,remember);}catch(cause){setError(cause.message);return false;}}
  function reloadLocal(){publish(readTravelState());setExternal(false);setTripDraft(null);setStepDraft(null);setPendingImport(null);setUndo(null);setError('');setMessage('Carnets rechargés depuis la sauvegarde locale.');}
  function chooseTrip(id){if(act({type:'select',id},'Voyage ouvert.',false)){setTripDraft(null);setStepDraft(null);setDeleting('');setNewCheck('');}}
  function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Export téléchargé. Il contient les textes personnels de tes carnets.');}
  async function readBackup(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{if(file.size>TRAVEL_MAX_BYTES)throw Error('La sauvegarde dépasse 12 Mo.');const source=await file.text(),parsed=parseTravelBackup(source);setPendingImport({source,count:parsed.trips.length});setError('');}
    catch(cause){setError('Import impossible : '+cause.message);}
  }

  return <section className="travel-notebook" aria-labelledby="travel-notebook-title">
    <header className="travel-hero">
      {art&&<img src={'/art/atlas-v4/'+art+'.webp'} alt="" aria-hidden="true"/>}<div className="travel-hero-veil" aria-hidden="true"/>
      <div className="travel-hero-copy"><span className="travel-eyebrow"><Plane size={15}/> VOYAGE 3B · MON CARNET</span><h3 id="travel-notebook-title">Le prochain horizon<br/><em>commence ici.</em></h3><p>Des envies aux premières étapes, rassemble ton voyage dans un carnet qui reste avec toi.</p><span className="travel-local-badge"><ShieldCheck size={14}/> Personnel · sauvegarde sur cet appareil</span></div>
      <span className="travel-hero-location"><MapPin size={15}/>{destination[1]}<small>Visuel d’ambiance</small></span>
    </header>

    {session.warning&&<p className="travel-feedback is-warning" role="status"><ShieldCheck size={17}/>{session.warning}</p>}
    {message&&<p className="travel-feedback is-success" role="status"><CheckCircle2 size={17}/>{message}</p>}
    {error&&<p className="travel-feedback is-error" role="alert">{error}</p>}
    {external&&<div className="travel-external"><p>Une autre version locale est disponible. Recharge-la avant d’enregistrer de nouveaux changements.</p><Button variant="ghost" size="sm" onClick={reloadLocal}><RotateCcw size={15}/>Recharger les carnets</Button></div>}

    <div className="travel-topline"><div><span className="travel-eyebrow">MES VOYAGES</span><h4>{state.trips.length?`${state.trips.length} carnet${state.trips.length>1?'s':''}, mille possibilités.`:'Une page blanche, un nouveau départ.'}</h4></div><Button variant="champagne" size="sm" onClick={()=>{setTripDraft(createTravelTrip(trip?.country||country));setStepDraft(null);setDeleting('');}}><Plus size={16}/>Nouveau voyage</Button></div>
    {!!state.trips.length&&<div className="travel-trip-picker" aria-label="Choisir un voyage">{state.trips.map(item=><Button variant="health" key={item.id} aria-pressed={trip?.id===item.id} onClick={()=>chooseTrip(item.id)}><span>{countryFor(item.country)[3]}</span><span><strong>{item.title}</strong><small>{countryFor(item.country)[1]} · {item.steps.length} étape{item.steps.length>1?'s':''}</small></span><ChevronRight size={16}/></Button>)}</div>}
    {tripDraft&&<div ref={editorRef}><TripEditor key={tripDraft.id} trip={tripDraft} onCancel={()=>setTripDraft(null)} onSave={draft=>{if(commit({type:'save-trip',trip:draft},'Ton voyage est prêt à être organisé.')){setTripDraft(null);setPanel('itinerary');}}}/></div>}

    {!trip&&!tripDraft&&<div className="travel-empty"><span className="travel-empty-orbit" aria-hidden="true"><Globe2 size={48} strokeWidth={1}/><Plane size={22}/></span><h4>Où as-tu envie d’aller ?</h4><p>Choisis une destination, puis prépare tes étapes et ta checklist à ton rythme. Aucun voyage n’est prérempli ni réservé.</p><label htmlFor="travel-first-country">Ma destination<select id="travel-first-country" value={country} onChange={event=>setCountry(event.target.value)}>{COUNTRY_INDEX.map(item=><option key={item[0]} value={item[0]}>{item[3]} {item[1]}</option>)}</select></label><Button variant="champagne" onClick={()=>setTripDraft(createTravelTrip(country))}>Créer mon premier carnet <ArrowRight size={16}/></Button></div>}

    {trip&&<>
      <section className="travel-current" aria-label="Mon voyage sélectionné"><div><span className="travel-eyebrow">{destination[3]} {destination[1]}</span><h4>{trip.title}</h4><p><CalendarDays size={15}/>{formatTravelDate(trip.startDate)} <span>→</span> {formatTravelDate(trip.endDate)}</p></div><div className="travel-current-actions"><Button variant="ghost" size="sm" onClick={()=>{setTripDraft({...trip});setStepDraft(null);}} aria-label={'Modifier le voyage '+trip.title}><Pencil size={15}/>Modifier</Button><Button variant="health" className="travel-icon-button" onClick={()=>setDeleting(deleting===trip.id?'':trip.id)} aria-label={'Supprimer le voyage '+trip.title}><Trash2 size={17}/></Button></div></section>
      {trip.notes&&<p className="travel-trip-notes">{trip.notes}</p>}
      {deleting===trip.id&&<div className="travel-delete-confirm"><p><strong>Supprimer « {trip.title} » ?</strong> Ses étapes et préparatifs seront retirés de cet appareil.</p><Button variant="ghost" size="sm" onClick={()=>setDeleting('')}>Garder mon carnet</Button><Button variant="danger" size="sm" onClick={()=>{if(act({type:'delete-trip',id:trip.id},'Voyage supprimé. Tu peux annuler cette dernière modification.')){setDeleting('');setTripDraft(null);setStepDraft(null);}}}>Supprimer ce voyage</Button></div>}
      <div className="travel-stats"><div><Navigation size={20}/><span>Mon itinéraire<strong>{summary.steps} étape{summary.steps>1?'s':''}</strong></span></div><div><ClipboardList size={20}/><span>Mes préparatifs<strong>{summary.completed} / {summary.checks} cochés</strong></span></div><div><Compass size={20}/><span>Budget estimé saisi<strong>{formatTravelCost(summary.estimatedMinor)}</strong></span></div></div>
      <nav className="travel-content-tabs" aria-label="Organiser mon voyage"><Button variant="health" aria-pressed={panel==='itinerary'} onClick={()=>setPanel('itinerary')}><Navigation size={17}/>Mes étapes</Button><Button variant="health" aria-pressed={panel==='preparation'} onClick={()=>setPanel('preparation')}><ClipboardList size={17}/>Mes préparatifs <span>{summary.completed}/{summary.checks}</span></Button></nav>

      {panel==='itinerary'&&<section className="travel-itinerary" aria-labelledby="travel-itinerary-title"><div className="travel-section-heading"><div><h4 id="travel-itinerary-title">Dessiner mon itinéraire</h4><p>Les étapes datées sont classées dans l’ordre du voyage.</p></div><Button variant="ghost" size="sm" onClick={()=>{setStepDraft(createTravelStep());setTripDraft(null);}}><Plus size={15}/>Une étape</Button></div>
        {stepDraft&&<div ref={editorRef}><StepEditor key={stepDraft.id} trip={trip} step={stepDraft} onCancel={()=>setStepDraft(null)} onSave={draft=>{if(commit({type:'save-step',tripId:trip.id,step:draft},'Étape enregistrée dans ton carnet.'))setStepDraft(null);}}/></div>}
        {!trip.steps.length&&!stepDraft&&<div className="travel-itinerary-empty"><MapPin size={31} strokeWidth={1.2}/><h5>Une rencontre, une balade, un lieu.</h5><p>Ajoute ta première étape et donne une forme à ton voyage.</p><Button variant="ghost" size="sm" onClick={()=>setStepDraft(createTravelStep())}>Imaginer ma première étape <ArrowRight size={15}/></Button></div>}
        <ol className="travel-timeline">{orderedTravelSteps(trip).map((step,index)=><li key={step.id}><span className="travel-step-number">{String(index+1).padStart(2,'0')}</span><article><div className="travel-step-top"><time dateTime={step.date||undefined}>{formatTravelDate(step.date)}</time><span>{formatTravelCost(step.estimatedMinor)} estimés</span></div><h5>{step.title}</h5>{step.place&&<p className="travel-step-place"><MapPin size={13}/>{step.place}</p>}{step.notes&&<p className="travel-step-notes">{step.notes}</p>}<div className="travel-step-actions"><Button variant="health" onClick={()=>{setStepDraft({...step});setTripDraft(null);}} aria-label={'Modifier l’étape '+step.title}><Pencil size={13}/>Modifier</Button><Button variant="health" onClick={()=>act({type:'delete-step',tripId:trip.id,id:step.id},'Étape retirée. Tu peux annuler cette dernière modification.')} aria-label={'Retirer l’étape '+step.title}><Trash2 size={13}/>Retirer</Button></div></article></li>)}</ol>
      </section>}

      {panel==='preparation'&&<section className="travel-preparation" aria-labelledby="travel-preparation-title"><div className="travel-section-heading"><div><h4 id="travel-preparation-title">Partir l’esprit plus léger.</h4><p>Une checklist personnelle à adapter. Ces cases ne confirment aucune formalité.</p></div><span className="travel-preparation-count">{summary.completed}/{summary.checks}</span></div><progress max={summary.checks||1} value={summary.completed} aria-label="Préparatifs cochés"/>
        <ul className="travel-checklist">{trip.checklist.map(check=><li key={check.id}><Button variant="health" className={'travel-check-toggle '+(check.done?'is-done':'')} aria-pressed={check.done} onClick={()=>act({type:'toggle-check',tripId:trip.id,id:check.id},check.done?'Préparatif remis à faire.':'Préparatif coché.')}><span>{check.done&&<Check size={15}/>}</span><strong>{check.title}</strong></Button><Button variant="health" className="travel-icon-button" aria-label={'Retirer le préparatif '+check.title} onClick={()=>act({type:'delete-check',tripId:trip.id,id:check.id},'Préparatif retiré.')}><X size={15}/></Button></li>)}</ul>
        <form className="travel-add-check" onSubmit={event=>{event.preventDefault();if(act({type:'add-check',tripId:trip.id,title:newCheck},'Nouveau préparatif ajouté.'))setNewCheck('');}}><label htmlFor="travel-new-check">Mon prochain préparatif<input id="travel-new-check" required maxLength={180} value={newCheck} onChange={event=>setNewCheck(event.target.value)} placeholder="Ex. Préparer une playlist pour le trajet"/></label><Button variant="ghost" type="submit"><Plus size={16}/>Ajouter</Button></form>
      </section>}
      <div className="travel-trip-export"><div><FileText size={20}/><span><strong>Emporter mon carnet</strong><small>Un fichier texte lisible, à conserver hors ligne.</small></span></div><Button variant="ghost" size="sm" onClick={()=>download(exportTravelText(trip),'3B-mon-carnet-voyage.txt','text/plain;charset=utf-8')}><ArrowDownToLine size={16}/>Exporter ce voyage</Button></div>
    </>}

    <aside className="travel-source"><span className="travel-source-icon"><ShieldCheck size={23}/></span><div><span className="travel-eyebrow">AVANT DE PRENDRE LA ROUTE</span><h4>Les informations au bon endroit.</h4><p>Vérifie les conseils et conditions de ta destination auprès des organismes compétents. Ton carnet organise tes idées ; les démarches et réservations se font auprès de leurs services.</p><a href={TRAVEL_ADVICE_URL} target="_blank" rel="noopener noreferrer">Conseils aux voyageurs · France Diplomatie <ArrowUpRight size={16}/></a><a href={destination[4]} target="_blank" rel="noopener noreferrer">Découvrir {destination[1]} · site référencé <ArrowUpRight size={15}/></a></div></aside>
    <footer className="travel-footer"><p><ShieldCheck size={15}/> Carnets locaux · aucune réservation ni pièce d’identité collectée</p><div><Button variant="health" onClick={()=>download(exportTravelBackup(state),'3B-carnets-voyage.json','application/json')}><Download size={14}/>Sauvegarde JSON</Button><Button variant="health" onClick={()=>fileInput.current?.click()}><Upload size={14}/>Restaurer</Button><Button variant="health" disabled={!undo} onClick={()=>{if(act({type:'restore',source:undo},'Dernière modification annulée.',false)){setUndo(null);setTripDraft(null);setStepDraft(null);}}}><RotateCcw size={14}/>Annuler</Button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={readBackup}/></div></footer>
    {pendingImport&&<section className="travel-import-preview" aria-label="Aperçu de restauration"><h4>Restaurer {pendingImport.count} carnet{pendingImport.count>1?'s':''} ?</h4><p>Cette sauvegarde remplacera les {state.trips.length} carnet{state.trips.length>1?'s':''} de cette session. Télécharge d’abord tes carnets actuels si tu veux les conserver.</p><div><Button variant="ghost" size="sm" onClick={()=>download(exportTravelBackup(state),'3B-carnets-avant-restauration.json','application/json')}><Download size={14}/>Sauvegarder avant</Button><Button variant="champagne" size="sm" onClick={()=>{if(act({type:'restore',source:pendingImport.source},'Sauvegarde restaurée.')){setPendingImport(null);setTripDraft(null);setStepDraft(null);}}}>Remplacer mes carnets</Button><Button variant="ghost" size="sm" onClick={()=>setPendingImport(null)}>Annuler</Button></div></section>}
  </section>;
}
