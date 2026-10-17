import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,ArrowRight,ArrowUpRight,BookOpen,Check,Clapperboard,Headphones,Library,Pencil,Plus,Search,Star,Trash2,Upload} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {WORLD_REALMS} from '../../components/world-living-data.js';
import narration from '../../world/narration-manifest.json';
import CinemaFinder from '../CinemaFinder.jsx';
import {MEDIA_BACKUP_MAX_BYTES,MEDIA_STATUSES,addWatchEntry,createMediaLibrarySession,exportMediaLibrary,findWatchEntries,mergeMediaLibrary,rememberNarration,toggleSavedNarration,updateWatchEntry} from './media-library.js';
import './media-studio.css';

const CLIPS=[narration.clips.find(item=>item.id==='prologue'),...WORLD_REALMS.map(realm=>narration.clips.find(item=>item.id==='entry-'+realm.id))].filter(Boolean);
const seconds=clip=>Math.round(clip.durationMs/1000);
const label=clip=>clip.id==='prologue'?'Le Cercle Brisé · Prologue':WORLD_REALMS.find(item=>'entry-'+item.id===clip.id)?.name||clip.id;
const artwork=clip=>clip.id==='prologue'?'/games/origins-cover.jpg':'/art/atlas-v4/'+clip.id.replace('entry-','')+'.webp';
function download(state){const url=URL.createObjectURL(new Blob([exportMediaLibrary(state)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='3B-mediatheque.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export default function MediaStudio({mode='tv',goTo}){
 const [session]=useState(()=>createMediaLibrarySession());const [state,setState]=useState(session.loaded.state),[notice,setNotice]=useState(session.loaded.warning),[tab,setTab]=useState(mode==='cinema'?'list':'origins');
 const [selected,setSelected]=useState(CLIPS[0].id),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[onlySaved,setOnlySaved]=useState(false),[draft,setDraft]=useState({title:'',creator:'',kind:'film',notes:''}),[formOpen,setFormOpen]=useState(false),[audioError,setAudioError]=useState(false),[importDraft,setImportDraft]=useState(null),[deleted,setDeleted]=useState(null);
 const input=useRef(null),audio=useRef(null),lastSecond=useRef(-1);
 const [editingId,setEditingId]=useState(null);
 useEffect(()=>{setTab(mode==='cinema'?'list':'origins');setQuery('');},[mode]);
 const clip=CLIPS.find(item=>item.id===selected)||CLIPS[0];
 const entries=useMemo(()=>findWatchEntries(state,{query,status:filter}),[state,query,filter]);
 const clips=CLIPS.filter(item=>(!onlySaved||state.savedNarrations.includes(item.id))&&[label(item),item.text].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()));
 const finished=Object.values(state.positions).filter(position=>position.finished).length;
 function commit(change,message='') {
  const operation=session.commit(change);setState(operation.state);
  operation.persistence.then(result=>{if(!session.isCurrent(operation.revision))return;setState(result.state);setNotice(result.ok?(result.warning||message):result.warning);});
 }
 function changeTab(next){audio.current?.pause();setTab(next);setQuery('');setFilter('all');}
 function selectClip(id){audio.current?.pause();setSelected(id);setAudioError(false);lastSecond.current=-1;}
 function editEntry(entry){setEditingId(entry.id);setDraft({title:entry.title,creator:entry.creator,kind:entry.kind,notes:entry.notes});setFormOpen(true);requestAnimationFrame(()=>document.getElementById('med3b-title-input')?.focus());}
 function closeForm(){setFormOpen(false);setEditingId(null);setDraft({title:'',creator:'',kind:'film',notes:''});}
 function progress(event,ended=false){const element=event.currentTarget,current=Math.floor(element.currentTime);if(!ended&&lastSecond.current===current)return;lastSecond.current=current;const duration=Number.isFinite(element.duration)?element.duration:seconds(clip),position=element.currentTime;commit(previous=>rememberNarration(previous,clip.id,position,duration,ended));}
 async function prepareImport(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;try{if(file.size>MEDIA_BACKUP_MAX_BYTES)throw Error('Le fichier dépasse 1 Mo.');const source=await file.text(),next=mergeMediaLibrary(state,source);setImportDraft({source,added:next.entries.length-state.entries.length});}catch(error){setNotice(error.message);}}
 return <section className="med3b" aria-label={mode==='cinema'?'Ma médiathèque cinéma':'3B Origins · Récits disponibles'}>
  <header className="med3b-heading"><div><span className="med3b-eyebrow">3B ORIGINALS · MÉDIATHÈQUE</span><h2>{mode==='cinema'?'Les histoires que tu choisis.':'Écouter. Imaginer. Explorer.'}</h2><p>{mode==='cinema'?'Garde les titres qui te parlent, puis retrouve leurs sources légales.':'Neuf récits audio du Monde du 3B, avec leur texte intégral et ta progression sur cet appareil.'}</p></div><span className="med3b-seal"><Clapperboard size={32}/></span></header>
  <nav className="med3b-tabs" aria-label="Parcours de la médiathèque"><Button variant="ghost" aria-pressed={tab==='origins'} onClick={()=>changeTab('origins')}><Headphones size={17}/>Récits 3B <span>{CLIPS.length}</span></Button><Button variant="ghost" aria-pressed={tab==='list'} onClick={()=>changeTab('list')}><Library size={17}/>Ma liste <span>{state.entries.length}</span></Button><Button variant="ghost" aria-pressed={tab==='search'} onClick={()=>changeTab('search')}><Search size={17}/>Trouver un film</Button></nav>
  {notice&&<p className="med3b-notice" role="status">{notice}</p>}
  {tab==='origins'&&<>
   <article className="med3b-feature"><img src={artwork(clip)} alt=""/><div className="med3b-feature-copy"><span className="med3b-eyebrow">RÉCIT AUDIO · {seconds(clip)} SECONDES</span><h3>{label(clip)}</h3><p>{clip.text}</p><div className="med3b-audio"><audio key={clip.id} ref={audio} controls preload="none" src={clip.src} aria-label={'Écouter '+label(clip)} onLoadedMetadata={event=>{const position=state.positions[clip.id];if(position&&!position.finished)event.currentTarget.currentTime=Math.min(position.seconds,Math.max(0,event.currentTarget.duration-.2));}} onTimeUpdate={event=>progress(event)} onPause={event=>{if(event.currentTarget.currentTime>0)progress(event);}} onEnded={event=>progress(event,true)} onError={()=>setAudioError(true)}/>{audioError&&<p role="alert">La lecture audio est indisponible. Le texte intégral du récit reste affiché.</p>}</div><div className="med3b-feature-actions"><Button variant="ghost" aria-pressed={state.savedNarrations.includes(clip.id)} onClick={()=>commit(previous=>toggleSavedNarration(previous,clip.id))}><Star size={16} fill={state.savedNarrations.includes(clip.id)?'currentColor':'none'}/>{state.savedNarrations.includes(clip.id)?'Récit enregistré':'Garder ce récit'}</Button><Button variant="ghost" onClick={()=>goTo?.('world3b')}>Explorer le Monde 3B <ArrowUpRight size={16}/></Button></div><small>Voix de synthèse · <a href={narration.attributionUrl} target="_blank" rel="noopener noreferrer">{narration.attribution}</a></small></div></article>
   <div className="med3b-collection-head"><div><h3>Les voix des huit héritages</h3><p>{finished} récit{finished>1?'s':''} écouté{finished>1?'s':''} jusqu’au bout · {state.savedNarrations.length} enregistré{state.savedNarrations.length>1?'s':''}</p></div><Button variant="ghost" aria-pressed={onlySaved} onClick={()=>setOnlySaved(value=>!value)}><Star size={15}/>{onlySaved?'Tous les récits':'Mes récits enregistrés'}</Button></div>
   <label className="med3b-search"><Search size={17}/><input type="search" aria-label="Rechercher un récit 3B" placeholder="Un pays, une valeur, une histoire…" value={query} onChange={event=>setQuery(event.target.value)} maxLength={100}/></label>
   <div className="med3b-episodes">{clips.map((item,index)=><Button key={item.id} variant="ghost" className="med3b-episode" aria-pressed={clip.id===item.id} onClick={()=>selectClip(item.id)}><img src={artwork(item)} loading="lazy" alt=""/><span className="med3b-episode-copy"><small>RÉCIT {String(CLIPS.indexOf(item)+1).padStart(2,'0')} · {seconds(item)} S</small><strong>{label(item)}</strong><span>{state.positions[item.id]?.finished?<><Check size={13}/>Écouté</>:state.positions[item.id]?.seconds>0?'Reprendre à '+Math.floor(state.positions[item.id].seconds)+' s':'Découvrir le récit'}</span></span><ArrowRight size={17}/></Button>)}</div>
   {!clips.length&&<p className="med3b-empty">Aucun récit ici pour le moment. Essaie un autre mot ou affiche tous les récits.</p>}
   <p className="med3b-footnote">ORIGINS TV présente ici les récits audio disponibles. Aucun flux télévisé ni long métrage 3B n’est annoncé comme diffusé.</p>
  </>}
  {tab==='list'&&<>
   <div className="med3b-list-intro"><div><h3>Ton carnet de cinéma.</h3><p>Les titres sont ceux que tu ajoutes. Leur disponibilité se vérifie auprès des plateformes.</p></div><Button variant="champagne" onClick={()=>{if(formOpen)closeForm();else{closeForm();setFormOpen(true);}}} aria-expanded={formOpen}><Plus size={16}/>{formOpen?'Fermer le formulaire':'Ajouter un titre'}</Button></div>
   {formOpen&&<form className="med3b-form" onSubmit={event=>{event.preventDefault();try{commit(previous=>editingId?updateWatchEntry(previous,editingId,draft):addWatchEntry(previous,draft),editingId?'Titre et notes mis à jour.':'Titre ajouté à ta liste locale.');closeForm();}catch(error){setNotice(error.message);}}}>
    {editingId&&<strong>Modifier ton titre et tes notes</strong>}
    <label>Titre du film ou de la série<input id="med3b-title-input" required value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} maxLength={100}/></label>
    <div><label>Réalisateur ou créateur<input value={draft.creator} onChange={event=>setDraft({...draft,creator:event.target.value})} maxLength={100}/></label><label>Format<select value={draft.kind} onChange={event=>setDraft({...draft,kind:event.target.value})}><option value="film">Film</option><option value="series">Série</option></select></label></div>
    <label>Pourquoi tu veux le découvrir<textarea value={draft.notes} onChange={event=>setDraft({...draft,notes:event.target.value})} rows={2} maxLength={1000}/></label>
    <Button type="submit" variant="champagne">{editingId?'Enregistrer les modifications':'Enregistrer dans ma liste'}</Button>
    <Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button>
   </form>}
   <div className="med3b-tools"><label className="med3b-search"><Search size={17}/><input aria-label="Rechercher dans ma liste cinéma" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Titre, créateur ou note…" maxLength={100}/></label><select aria-label="Filtrer ma liste cinéma" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Tous les titres</option>{Object.entries(MEDIA_STATUSES).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></div>
   <div className="med3b-watchlist">{entries.map(entry=><article key={entry.id}>
    <span className="med3b-watch-icon"><Clapperboard size={24}/></span><div><span className="med3b-eyebrow">{entry.kind==='series'?'SÉRIE':'FILM'} · AJOUT PERSONNEL</span><h4>{entry.title}</h4>{entry.creator&&<small>{entry.creator}</small>}{entry.notes&&<p>{entry.notes}</p>}<Button variant="ghost" onClick={()=>{changeTab('search');setQuery(entry.title);}}>Trouver une source légale <ArrowUpRight size={14}/></Button></div>
    <div className="med3b-watch-actions"><select aria-label={'État de '+entry.title} value={entry.status} onChange={event=>commit(previous=>updateWatchEntry(previous,entry.id,{status:event.target.value}))}>{Object.entries(MEDIA_STATUSES).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select>
     <Button variant="ghost" aria-label={'Modifier '+entry.title} onClick={()=>editEntry(entry)}><Pencil size={16}/></Button>
     <Button variant="ghost" aria-label={'Retirer '+entry.title} onClick={()=>{if(editingId===entry.id)closeForm();setDeleted(entry);commit(previous=>({...previous,entries:previous.entries.filter(item=>item.id!==entry.id)}),'Titre retiré. Tu peux annuler cette suppression.');}}><Trash2 size={16}/></Button>
    </div>
   </article>)}</div>
   {!entries.length&&<div className="med3b-empty"><Library size={33}/><h4>{state.entries.length?'Aucun titre avec ces filtres.':'Ta prochaine histoire commence ici.'}</h4><p>Ajoute un titre à découvrir, puis garde tes notes et ton état de lecture.</p></div>}
   {deleted&&<Button variant="ghost" onClick={()=>{if(state.entries.some(item=>item.id===deleted.id)){setDeleted(null);return;}commit(previous=>previous.entries.some(item=>item.id===deleted.id)?previous:({...previous,entries:[deleted,...previous.entries]}),'Suppression annulée.');setDeleted(null);}}>Annuler le retrait de « {deleted.title} »</Button>}
  </>}
  {tab==='search'&&<CinemaFinder initialQuery={query}/>}
  <footer className="med3b-backup"><span><BookOpen size={16}/> Bibliothèque locale · cet appareil</span><div><Button variant="ghost" onClick={()=>{download(state);setNotice('Sauvegarde JSON téléchargée.');}}><ArrowDownToLine size={15}/>Exporter</Button><Button variant="ghost" onClick={()=>input.current?.click()}><Upload size={15}/>Importer</Button><input ref={input} hidden type="file" accept=".json,application/json" onChange={prepareImport}/></div></footer>
  {importDraft&&<div className="med3b-import" role="region" aria-label="Aperçu de la sauvegarde cinéma"><p>{importDraft.added} nouveau{importDraft.added>1?'x':''} titre{importDraft.added>1?'s':''} à ajouter. Tes entrées existantes et leur progression seront conservées.</p><Button variant="champagne" onClick={()=>{try{commit(previous=>mergeMediaLibrary(previous,importDraft.source),'Sauvegarde fusionnée.');setImportDraft(null);}catch(error){setNotice(error.message);}}}>Fusionner la bibliothèque</Button><Button variant="ghost" onClick={()=>setImportDraft(null)}>Annuler</Button></div>}
 </section>;
}
