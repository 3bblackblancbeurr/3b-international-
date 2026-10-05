import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,Clapperboard,Film,Play,Settings2,Sparkles} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {destinRequest,sourceUrl} from './client.js';
import {DESTIN_TAGLINE,demoManifest} from './model.js';
import DestinPlayer,{previewSnapshot} from './DestinPlayer.jsx';
import DestinStudio from './DestinStudio.jsx';
import {DestinAccess} from './DirectorAccess.jsx';
import './destin.css';

function dateLabel(value) { const d=new Date(value); return Number.isFinite(d.getTime())?d.toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'}):''; }
export default function DestinPage({goTo}) {
  const account=useLoyalty(),userId=account.user?.id;
  const [tab,setTab]=useState('films'),[catalog,setCatalog]=useState({stories:[],polls:[],media:{}}),[history,setHistory]=useState({runs:[],unlocks:[]});
  const [owner,setOwner]=useState(false),[studio,setStudio]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[player,setPlayer]=useState(null);
  const live=useRef(true),commandBusy=useRef(false),clockOffset=useRef(0);
  const [now,setNow]=useState(Date.now());
  const load=useCallback(async()=>{
    if(!userId)return;
    setLoading(true);setError('');
    try {
      const result=await destinRequest('catalog',{},userId);
      if(!live.current)return;
      setCatalog(result);setOwner(result.owner===true);
      if(result.serverNow)clockOffset.current=Date.parse(result.serverNow)-Date.now();
    }catch(e){if(live.current)setError(e.message);}
    finally{if(live.current)setLoading(false);}
  },[userId]);
  const loadHistory=useCallback(async()=>{
    if(!userId)return;
    setLoading(true);setError('');
    try {const result=await destinRequest('history',{},userId);if(live.current)setHistory(result);}
    catch(e){if(live.current)setError(e.message);}
    finally{if(live.current)setLoading(false);}
  },[userId]);
  useEffect(()=>{live.current=true;load();return()=>{live.current=false;};},[load]);
  useEffect(()=>{if(tab==='history')loadHistory();},[tab,loadHistory]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  async function operation(task){
    if(commandBusy.current)return;
    commandBusy.current=true;setBusy(true);setError('');setMessage('');
    try{await task();}catch(e){if(live.current)setError(e.message || 'Cette action n’a pas abouti.');}
    finally{commandBusy.current=false;if(live.current)setBusy(false);}
  }
  async function startStory(storyId){
    await operation(async()=>{
      const snapshot=await destinRequest('start',{storyId,requestId:crypto.randomUUID()},userId);
      if(live.current)setPlayer({key:crypto.randomUUID(),snapshot,storyId,preview:false});
    });
  }
  async function resumeRun(runId){
    await operation(async()=>{const snapshot=await destinRequest('resume',{runId},userId);if(live.current)setPlayer({key:crypto.randomUUID(),snapshot,storyId:snapshot.storyId,preview:false});});
  }
  function demo(){setPlayer({key:crypto.randomUUID(),snapshot:previewSnapshot(demoManifest()),preview:true});}
  function closePlayer(){setPlayer(null);if(tab==='history')loadHistory();else load();}
  async function vote(poll,choiceId){
    await operation(async()=>{const result=await destinRequest('vote',{pollId:poll.id,choiceId},userId);if(live.current){setCatalog(old=>({...old,polls:result.polls}));setMessage('Ton vote est enregistré.');}});
  }
  async function claim(unlock){
    await operation(async()=>{const result=await destinRequest('claim',{storyId:unlock.story_id,endingId:unlock.ending_id},userId);if(live.current)setMessage(result.status==='awarded'?'La récompense a été traitée par le serveur. Consulte ton Passeport.':'La demande est conservée. La récompense n’est pas encore confirmée.');await account.refresh();await loadHistory();});
  }
  if(account.loading)return <section className="destin"><div className="destin-loading" role="status"><span className="destin-loader"/>Ouverture de 3B DESTIN…</div></section>;
  if(!userId)return <section className="destin"><div className="destin-empty"><span className="destin-kicker">3B DESTIN</span><h1>Une histoire. Ton choix.</h1><p>Connecte-toi à ton compte 3B pour retrouver tes parcours et tes fins découvertes.</p><button className="destin-primary" onClick={()=>goTo('member')}>Ouvrir mon compte</button></div></section>;
  if(studio && owner)return <DestinStudio userId={userId} onClose={()=>{setStudio(false);load();}}/>;
  if(player)return <><DestinPlayer key={player.key} initialSnapshot={player.snapshot} userId={userId} preview={player.preview} goTo={goTo} onClose={closePlayer} onRestart={player.preview?demo:undefined} onComplete={()=>{if(!player.preview)account.refresh();}}/>{error && <div className="destin destin-alert" role="alert">{error}</div>}</>;
  return <section className="destin destin-page" aria-labelledby="destin-title">
    <div className="destin-toolbar"><div className="destin-tabs" aria-label="Rubriques 3B DESTIN">{[['films','Films'],['history','Mes destins'],['votes','Votes']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setMessage('');if(id!=='history')load();}}>{label}</button>)}</div>{owner && <button className="destin-secondary" onClick={()=>setStudio(true)}><Settings2 size={17}/>Studio DESTIN</button>}</div>
    {!loading && <DestinAccess owner={owner} access={catalog.passportAccess} onPassport={()=>goTo('passport')} onStudio={()=>setStudio(true)}/>}
    {tab==='films' && <><header className="destin-hero"><span className="destin-kicker">LE CINÉMA DONT TU ES LE CHOIX</span><h1 id="destin-title">3B <span>DESTIN</span></h1><p className="destin-tagline">{DESTIN_TAGLINE}</p><div className="destin-actions"><button className="destin-primary" onClick={demo}><Play size={18}/>Essayer l’expérience</button><span className="destin-muted">Démonstration · sans récompense</span></div></header><div className="destin-section-title"><h2>Choisis ton histoire.</h2>{catalog.stories.length>0 && <span className="destin-muted">{catalog.stories.length} film{catalog.stories.length>1?'s':''}</span>}</div></>}
    {tab==='history' && <div className="destin-section-title"><div><span className="destin-kicker">TON PARCOURS PERSONNEL</span><h1 id="destin-title">Mes destins</h1><p className="destin-muted">Les décisions et les fins conservées avec ton compte 3B.</p></div><button className="destin-secondary" onClick={()=>goTo('passport')}>Mon Passeport<ArrowRight size={17}/></button></div>}
    {tab==='votes' && <div className="destin-section-title"><div><span className="destin-kicker">LA COMMUNAUTÉ DÉCIDE</span><h1 id="destin-title">Le prochain chapitre</h1><p className="destin-muted">Un compte, une voix. Les résultats affichés correspondent aux votes enregistrés.</p></div></div>}
    {error && <div className="destin-alert" role="alert"><p>{error}</p><button disabled={busy || loading} onClick={()=>tab==='history'?loadHistory():load()}>Réessayer</button></div>}
    {message && <p className="destin-notice" role="status">{message}</p>}
    {loading?<div className="destin-loading" role="status"><span className="destin-loader"/>Chargement…</div>:<>
      {tab==='films' && (catalog.stories.length?<div className="destin-film-grid">{catalog.stories.map(story=><article className="destin-film" key={story.id}><div className="destin-film-art">{sourceUrl(story.cover,catalog.media)?<img src={sourceUrl(story.cover,catalog.media)} alt="" loading="lazy"/>:<Clapperboard size={58} strokeWidth={1}/>}</div><div className="destin-film-copy"><span className="destin-kicker">FILM INTERACTIF</span><h3>{story.title}</h3>{story.synopsis && <p>{story.synopsis}</p>}<div className="destin-film-meta"><span>{story.scenes} scènes</span><span>Un parcours · choix définitifs</span></div><div className="destin-actions"><button className="destin-primary" disabled={busy} onClick={()=>catalog.passportAccess?.allowed?(story.resume?resumeRun(story.resume):startStory(story.id)):goTo('passport')}><Play size={17}/>{!catalog.passportAccess?.allowed?'Voir mon Passeport':story.resume?'Reprendre mon histoire':'Ouvrir mon destin'}</button></div></div></article>)}</div>:!error && <div className="destin-empty"><Film size={35} aria-hidden="true"/><h3>Le premier film n’a pas encore été publié.</h3><p>Découvre les choix avec la démonstration. Les films interactifs apparaîtront ici dès leur publication.</p>{owner && <div className="destin-actions"><button className="destin-secondary" onClick={()=>setStudio(true)}>Préparer mon premier film<ArrowRight size={17}/></button></div>}</div>)}
      {tab==='history' && <><div className="destin-section-title"><h2>Fins découvertes</h2></div>{history.unlocks.length?<div className="destin-history-grid">{history.unlocks.map(unlock=><article className="destin-history-item" key={unlock.story_id+':'+unlock.ending_id}><span className="destin-kicker">{unlock.rarity==='secret'?'FIN SECRÈTE':unlock.rarity==='rare'?'FIN RARE':'FIN DÉCOUVERTE'}</span><h3>{unlock.title}</h3>{unlock.fragment && <p>{unlock.fragment}</p>}<time dateTime={unlock.created_at}>{dateLabel(unlock.created_at)}</time>{unlock.reward_status==='pending' && <p><button disabled={busy} onClick={()=>claim(unlock)}>Reprendre la demande de récompense</button></p>}{unlock.reward_status==='awarded' && <p className="destin-muted">Récompense traitée par le serveur.</p>}</article>)}</div>:!error && <p className="destin-muted">Aucune fin découverte pour le moment. Tes premières décisions écriront la suite.</p>}<div className="destin-section-title"><h2>Mes parcours</h2></div><div className="destin-history-grid">{history.runs.map(run=><article className="destin-history-item" key={run.id}><span className="destin-kicker">{run.state==='complete'?'ACCOMPLI':run.state==='playing'?'À REPRENDRE':'ANCIEN PARCOURS'}</span><h3>{run.title}</h3><time dateTime={run.updatedAt}>{dateLabel(run.updatedAt)}</time>{run.path.length>0 && <p className="destin-path">{run.path.map(p=>p.label).join(' → ')}</p>}<div className="destin-actions" style={{marginTop:16}}>{run.state==='playing'?<button className="destin-primary" disabled={busy} onClick={()=>resumeRun(run.id)}>Reprendre</button>:<span className="destin-sealed-label">Destin accompli · choix conservés</span>}</div></article>)}</div></>}
      {tab==='votes' && (catalog.polls.length?catalog.polls.map(poll=>{const closed=poll.closed || Date.parse(poll.closesAt)<=now+clockOffset.current,total=poll.options.reduce((sum,o)=>sum+o.count,0);return <article className="destin-poll" key={poll.id}><span className="destin-kicker">{closed?'VOTE TERMINÉ':'VOTE OUVERT'}</span><h2>{poll.question}</h2><p className="destin-muted">{closed?'Clôturé le ':'Clôture : '}{dateLabel(poll.closesAt)} · {total} vote{total>1?'s':''}</p><div className="destin-poll-choices">{poll.options.map(option=><button key={option.id} disabled={busy || closed || !!poll.myChoice || !catalog.passportAccess?.allowed} aria-pressed={poll.myChoice===option.id} onClick={()=>vote(poll,option.id)}><span className="destin-poll-fill" style={{width:`${total?100*option.count/total:0}%`}}/><span>{option.label}{poll.myChoice===option.id?' · Ton choix':''}</span><span>{total?Math.round(100*option.count/total):0} %</span></button>)}</div>{owner && !closed && <p><button className="destin-text-button" disabled={busy} onClick={()=>operation(async()=>{if(!window.confirm('Annuler ce vote et le retirer de la page publique ?'))return;const result=await destinRequest('poll-cancel',{pollId:poll.id},userId);if(live.current)setCatalog(old=>({...old,polls:result.polls}));})}>Annuler ce vote</button></p>}</article>;}):!error && <div className="destin-empty"><Sparkles size={32} aria-hidden="true"/><h3>Aucun vote pour le moment.</h3><p>Les prochaines décisions collectives apparaîtront ici.</p>{owner && <button onClick={()=>setStudio(true)}>Créer un vote dans le studio</button>}</div>)}</>}
    {busy && <p className="destin-notice" role="status">Enregistrement de ta demande…</p>}
  </section>;
}
