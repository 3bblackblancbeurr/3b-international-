import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,BadgeCheck,CalendarDays,Check,ChevronRight,Clapperboard,Download,ExternalLink,FileText,Gamepad2,Globe2,LockKeyhole,Play,Search,ShieldCheck,Swords,Trophy,Upload,UserPlus,Users,Video,X,RefreshCw} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {CLUB,GAMES,CURRENT_MEMBERS,RECRUITMENT_ROLES,PLATFORMS,AVAILABILITIES,CIRCUITS,EVENTS,ADMIN_STEPS,DATA_CHECKED_AT,formatEventDate,filterEvents,buildICS} from './esports-data.js';
import {fetchEsportsSnapshot,applyToEsports,sendEsportsMedia,moderateEsports,playableMediaUrl,getEsportsError} from './esports-api.js';
import './esports.css';

const VIEWS=[
 {id:'accueil',label:'Accueil',icon:Gamepad2},
 {id:'equipes',label:'Nos équipes',icon:Users},
 {id:'calendrier',label:'Compétitions',icon:CalendarDays},
 {id:'recrutement',label:'Recrutement',icon:UserPlus},
 {id:'medias',label:'Gameplays & vidéos',icon:Video},
 {id:'association',label:'L’association',icon:ShieldCheck}
];
const initialApplication={pseudo:'',game_id:'warzone',role:RECRUITMENT_ROLES[0],platform:PLATFORMS[0],availability:AVAILABILITIES[0],note:''};
const initialMedia={title:'',game_id:'warzone',media_url:''};
const APPLICATION_STATUSES={pending:'À étudier',trial:'Essai proposé',accepted:'Retenu pour contact',rejected:'Non retenu'};
const MEDIA_STATUSES={pending:'En vérification',published:'Publiée',rejected:'Non retenue'};
const gameName=id=>GAMES.find(game=>game.id===id)?.name||id;
const monthYear=date=>new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
function ExternalLinkButton({url,children,subtle=false}){
 return <a className={subtle?'es16-textlink':'es16-cta es16-cta-secondary'} href={url} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={16} aria-hidden="true"/></a>;
}
function MiniEyebrow({children}){return <p className="es16-overline">{children}</p>;}
function EmptyState({title,description,children}){return <div className="es16-empty"><span className="es16-empty-ring" aria-hidden="true">16—18</span><h3>{title}</h3><p>{description}</p>{children}</div>;}
function GameGlyph({game}){return <span className="es16-game-glyph" aria-hidden="true">{game.short}</span>;}
function downloadClubCalendar(events){
 const file=new Blob([buildICS(events)],{type:'text/calendar;charset=utf-8'});
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download='16-18-esport-calendrier-2026-2027.ics';document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export default function EsportsPage({goTo}){
 const {user}=useLoyalty();
 const [view,setView]=useState('accueil');
 const [game,setGame]=useState('all'),[search,setSearch]=useState(''),[upcoming,setUpcoming]=useState(true);
 const [application,setApplication]=useState(initialApplication),[consent,setConsent]=useState(false);
 const [media,setMedia]=useState(initialMedia),[file,setFile]=useState(null),[uploadType,setUploadType]=useState('link');
 const [sending,setSending]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [snapshot,setSnapshot]=useState({ready:false,staff:false,published:[],applications:[],myMedia:[],queueApplications:[],queueMedia:[]});
 const [selectedVideo,setSelectedVideo]=useState(null),[refreshing,setRefreshing]=useState(false);
 const [loading,setLoading]=useState(true);
 const nextEvents=useMemo(()=>filterEvents({onlyFuture:true}),[]);
 const filteredEvents=useMemo(()=>filterEvents({game,search,onlyFuture:upcoming}),[game,search,upcoming]);
 const scrollBehavior=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
 const showView=id=>{
  setView(id);setNotice('');setError('');
  const area=document.getElementById('es16-main-area');
  if(area)window.requestAnimationFrame(()=>area.scrollIntoView({behavior:scrollBehavior(),block:'start'}));
 };
 const refresh=useCallback(async()=>{
  setRefreshing(true);
  try{const result=await fetchEsportsSnapshot(user);setSnapshot(result);setError('');}
  catch(cause){setSnapshot(current=>({...current,ready:false}));setError(getEsportsError(cause));}
  finally{setLoading(false);setRefreshing(false);}
 },[user?.id]);
 useEffect(()=>{let active=true;setLoading(true);
  fetchEsportsSnapshot(user).then(data=>{if(active){setSnapshot(data);setError('');}})
  .catch(cause=>{if(active){setSnapshot(current=>({...current,ready:false}));setError(getEsportsError(cause));}})
  .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[user?.id]);
 const submitApplication=async e=>{
  e.preventDefault();if(sending||!consent)return;setSending(true);setNotice('');
  try{await applyToEsports(user,application);setNotice('Candidature enregistrée et réservée aux responsables. Rien n’est publié publiquement.');setConsent(false);setApplication(initialApplication);await refresh();}
  catch(cause){setNotice(getEsportsError(cause));}finally{setSending(false);}
 };
 const submitMedia=async e=>{
  e.preventDefault();if(sending)return;const form=e.currentTarget;setSending(true);setNotice('');
  try{await sendEsportsMedia(user,{...media,file:uploadType==='file'?file:null,media_url:uploadType==='link'?media.media_url:null});
   setNotice('Vidéo reçue et placée dans la file de validation. Elle n’est pas encore publique.');setMedia(initialMedia);setFile(null);
   form.reset();await refresh();}
  catch(cause){setNotice(getEsportsError(cause));}finally{setSending(false);}
 };
 const review=async(kind,id,status)=>{
  if(sending)return;setSending(true);setNotice('');
  try{await moderateEsports(kind,id,status);setNotice('Décision enregistrée.');await refresh();}
  catch(cause){setNotice(getEsportsError(cause));}finally{setSending(false);}
 };
 const watch=async item=>{
  setNotice('');
  try{const url=await playableMediaUrl(item);if(!url)throw Error('Vidéo indisponible.');
   if(item.media_url){window.open(url,'_blank','noopener,noreferrer');return;}
   setSelectedVideo({title:item.title,url});}
  catch(cause){setNotice(getEsportsError(cause));}
 };
 return <section className="es16" aria-label="16-18 ESPORT — quartier général gaming">
  <div className="es16-ambient" aria-hidden="true"/>
  <div className="es16-width">
   <header className="es16-hero">
    <div className="es16-hero-copy">
     <p className="es16-hero-kicker"><span className="es16-live-dot"/> ASSOCIATION GAMING MULTIJEUX · FRANCE</p>
     <h1><span>16<span className="es16-dash">—</span>18</span><small>ESPORT</small></h1>
     <p className="es16-tagline">Une équipe. Plusieurs terrains.<br/><strong>Des milliers de défis à relever.</strong></p>
     <p className="es16-hero-text">Joue, progresse, trouve ton équipe et suis les compétitions. Warzone est notre point de départ — l'aventure ne s'arrête pas là.</p>
     <div className="es16-hero-actions">
      <button type="button" className="es16-cta es16-cta-primary" onClick={()=>showView('recrutement')}><UserPlus size={18}/> Rejoindre 16‑18 <ArrowRight size={17}/></button>
      <button type="button" className="es16-cta es16-cta-secondary" onClick={()=>showView('calendrier')}><CalendarDays size={18}/> Calendrier esport</button>
     </div>
     <div className="es16-proof"><BadgeCheck size={18}/><span>Association déclarée · RNA {CLUB.rna}</span></div>
    </div>
    <div className="es16-hero-visual" aria-hidden="true">
     <img src="/esports/16-18-arena.svg" alt="" width="960" height="850" loading="eager"/>
     <div className="es16-hero-visual-caption"><span>3B / GAMING NETWORK</span><strong>ONE TEAM · MANY GAMES</strong></div>
    </div>
   </header>
   <div className="es16-vitals" aria-label="Le club en un regard">
    <span><strong>05</strong><small>Joueurs de départ</small></span>
    <span><strong>{String(GAMES.length).padStart(2,'0')}</strong><small>Disciplines accueillies</small></span>
    <span><strong>{String(EVENTS.length).padStart(2,'0')}</strong><small>Dates annoncées suivies</small></span>
    <span className="es16-vitals-last"><strong>FR / EU</strong><small>Priorité régionale</small></span>
   </div>
   <nav className="es16-navigation" aria-label="Rubriques du club 16-18">
    {VIEWS.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={view===item.id?'es16-nav-active':''} aria-current={view===item.id?'page':undefined} onClick={()=>showView(item.id)}><Icon size={19} strokeWidth={1.65} aria-hidden="true"/><span>{item.label}</span></button>;})}
    {snapshot.staff&&<button type="button" className={view==='bureau'?'es16-nav-active':''} onClick={()=>showView('bureau')}><LockKeyhole size={18}/> Bureau privé</button>}
   </nav>
   <div id="es16-main-area" className="es16-stage">
    {notice&&<div className="es16-notice" role="status"><Check size={17}/>{notice}<button type="button" aria-label="Fermer le message" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    {error&&<div className="es16-alert" role="status"><ShieldCheck size={18}/><p>{error}</p></div>}
    {view==='accueil'&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>LES UNIVERS DE 16‑18</MiniEyebrow><h2>Notre terrain est immense.</h2><p>Des sections officielles du club à développer selon les joueurs qui nous rejoignent, sans prétendre que toutes les équipes sont déjà constituées.</p></div><button type="button" className="es16-plain-action" onClick={()=>showView('equipes')}>Explorer les jeux <ChevronRight size={18}/></button></div>
     <div className="es16-game-ribbon" aria-label="Disciplines du club">
      {GAMES.slice(0,10).map(g=><button type="button" key={g.id} className={g.id==='warzone'?'es16-game-ribbon-item es16-game-ribbon-feature':'es16-game-ribbon-item'} onClick={()=>{setGame(g.id);showView('equipes');}}>
       <GameGlyph game={g}/><span><strong>{g.name}</strong><small>{g.category}</small></span><ChevronRight size={17}/>
      </button>)}
     </div>
     <div className="es16-home-split">
      <article className="es16-feature-story">
       <MiniEyebrow>NOTRE POINT DE DÉPART</MiniEyebrow>
       <h3>Warzone <em>16‑18.</em></h3>
       <p>Une équipe, cinq joueurs identifiés, un objectif : nous entraîner, nous améliorer et entrer dans les compétitions auxquelles nous sommes éligibles.</p>
       <button type="button" className="es16-plain-action" onClick={()=>showView('equipes')}>Découvrir l'effectif <ArrowRight size={18}/></button>
       <div className="es16-story-art" aria-hidden="true"><Swords strokeWidth={0.65}/><b>16—18</b></div>
      </article>
      <article className="es16-next">
       <MiniEyebrow>PROCHAINS RENDEZ-VOUS OFFICIELS</MiniEyebrow>
       <h3>À l'horizon.</h3>
       <div className="es16-next-list">{nextEvents.slice(0,4).map(e=><div key={e.id}><span>{e.start.slice(8,10)}<small>{monthYear(e.start).split(' ')[0]}</small></span><p><strong>{e.title}</strong><small>{gameName(e.game)} · {e.region}</small></p></div>)}</div>
       <button type="button" className="es16-plain-action" onClick={()=>showView('calendrier')}>Voir tous les événements <ChevronRight size={18}/></button>
      </article>
     </div>
     <div className="es16-callout"><div><MiniEyebrow>RENFORTS RECHERCHÉS</MiniEyebrow><h3>Ton talent a sa place.</h3><p>Joueurs, coachs, analystes, créateurs de contenus : propose ta candidature, quel que soit ton jeu favori.</p></div><button type="button" className="es16-cta es16-cta-primary" onClick={()=>showView('recrutement')}>Recrutement <ArrowRight size={18}/></button></div>
    </div>}
    {view==='equipes'&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>ROSTERS ET DISCIPLINES</MiniEyebrow><h2>Nos équipes.</h2><p>Un noyau Warzone déjà identifié. Les autres sections grandissent au rythme des candidatures et des entraînements.</p></div></div>
     <div className="es16-roster-heading"><span className="es16-roster-emblem">WZ</span><div><MiniEyebrow>SECTION ACTIVE</MiniEyebrow><h3>Warzone / 16‑18</h3><p>Composition déclarée · comptes compétitifs et disponibilités à vérifier individuellement.</p></div><ExternalLinkButton url={GAMES[0].link} subtle>Voir le circuit officiel</ExternalLinkButton></div>
     <div className="es16-roster">{CURRENT_MEMBERS.map(p=><article key={p.pseudo} className={p.lead?'es16-player es16-player-lead':'es16-player'}><div className="es16-player-icon" aria-hidden="true"><span>{p.initials}</span></div><h4>{p.pseudo}</h4><p>{p.role}</p><small>{p.group}</small></article>)}</div>
     <div className="es16-section-heading es16-other-heading"><div><MiniEyebrow>OUVERT À TOUS LES TALENTS</MiniEyebrow><h3>Choisis ton jeu.</h3></div><label className="es16-inline-select">Discipline<select value={game} onChange={e=>setGame(e.target.value)}><option value="all">Tous les jeux</option>{GAMES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label></div>
     <div className="es16-game-grid">{GAMES.filter(g=>game==='all'||g.id===game).map(g=><article className="es16-game-tile" key={g.id}><GameGlyph game={g}/><span className="es16-game-copy"><h4>{g.name}</h4><p>{g.category} · {g.format}</p><small>{g.team}</small></span><button type="button" aria-label={'Candidater pour '+g.name} onClick={()=>{setApplication(a=>({...a,game_id:g.id}));showView('recrutement');}}><ArrowUpRight size={20}/></button></article>)}</div>
    </div>}
    {view==='calendrier'&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>AGENDA COMPÉTITIF / 2026—2027</MiniEyebrow><h2>L’arène ne s’arrête jamais.</h2><p>Dates vérifiées sur des sources officielles le {new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'}).format(new Date(DATA_CHECKED_AT+'T12:00:00Z'))}. Un événement au calendrier ne signifie pas que 16‑18 y est inscrit.</p></div><button type="button" className="es16-cta es16-cta-secondary" onClick={()=>downloadClubCalendar(filteredEvents)}><Download size={18}/> Ajouter à mon agenda</button></div>
     <div className="es16-filterbar"><label><Search size={17}/><input type="search" placeholder="Tournoi, ville, format..." aria-label="Rechercher un événement" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filtrer par jeu" value={game} onChange={e=>setGame(e.target.value)}><option value="all">Tous les jeux</option>{GAMES.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select><label className="es16-checkbox"><input type="checkbox" checked={upcoming} onChange={e=>setUpcoming(e.target.checked)}/> À venir uniquement</label></div>
     <div className="es16-event-list">{filteredEvents.length?filteredEvents.map(e=><article key={e.id} className="es16-event"><div className="es16-date"><strong>{e.start.slice(8,10)}</strong><span>{monthYear(e.start).split(' ')[0]}</span><small>{e.start.slice(0,4)}</small></div><div className="es16-event-info"><span className="es16-kind">{e.category} · {gameName(e.game)}</span><h3>{e.title}</h3><p>{formatEventDate(e)} · {e.region}</p>{e.note&&<small>{e.note}</small>}<span className="es16-check">Inscription de 16‑18 : non confirmée · Vérifier les conditions EU/EMEA</span></div><ExternalLinkButton url={e.sourceUrl} subtle>Source officielle</ExternalLinkButton></article>):<EmptyState title="Aucune date confirmée pour ce filtre." description="Une compétition peut exister sans calendrier publié. Accède au circuit concerné ci-dessous pour consulter ses prochaines inscriptions."/>}</div>
     <div className="es16-section-heading es16-other-heading"><div><MiniEyebrow>AU-DELÀ DE CALL OF DUTY</MiniEyebrow><h3>Explorer les circuits.</h3><p>Ces plateformes servent à découvrir des tournois ; l'accès gratuit, le jeu, la région et les modalités sont propres à chaque événement.</p></div></div>
     <div className="es16-portals">{CIRCUITS.map(c=><a href={c.url} rel="noopener noreferrer" target="_blank" key={c.id}><span><strong>{c.name}</strong><small>{c.subtitle}</small></span><ArrowUpRight size={19}/></a>)}</div>
    </div>}
    {view==='recrutement'&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>JOIN THE SQUAD / TALENT SCOUT</MiniEyebrow><h2>Recherche de joueurs.</h2><p>La porte est ouverte aux candidats de tous les jeux, aux joueurs loisirs motivés comme aux compétiteurs expérimentés. Aucune sélection automatique.</p></div></div>
     <div className="es16-recruit-intro"><div className="es16-recruit-glow" aria-hidden="true"><UserPlus size={80} strokeWidth={0.8}/></div><h3>Une seule candidature.<br/><em>Ta prochaine équipe commence ici.</em></h3><p>Choisis ton jeu, ta plateforme, ton rôle et tes disponibilités. Les responsables pourront examiner ta demande de façon privée.</p></div>
     <div className="es16-two-col"><div className="es16-form-zone">
      <MiniEyebrow>CANDIDATURE CONFIDENTIELLE</MiniEyebrow><h3>Présente-toi.</h3>
      {!user?<div className="es16-form-locked"><LockKeyhole size={23}/><p>La candidature exige un compte 3B connecté pour limiter les abus et permettre un suivi privé.</p><button className="es16-cta es16-cta-primary" type="button" onClick={()=>goTo('member')}>Se connecter à 3B <ArrowRight size={17}/></button></div>:
       <form onSubmit={submitApplication} className="es16-form">
        <label>Pseudo de jeu<input required minLength={2} maxLength={36} autoComplete="nickname" value={application.pseudo} placeholder="Ton pseudo (pas ton nom civil)" onChange={e=>setApplication(a=>({...a,pseudo:e.target.value}))}/></label>
        <div className="es16-form-pair"><label>Jeu<select value={application.game_id} onChange={e=>setApplication(a=>({...a,game_id:e.target.value}))}>{GAMES.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label><label>Plateforme<select value={application.platform} onChange={e=>setApplication(a=>({...a,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></label></div>
        <div className="es16-form-pair"><label>Rôle<select value={application.role} onChange={e=>setApplication(a=>({...a,role:e.target.value}))}>{RECRUITMENT_ROLES.map(p=><option key={p}>{p}</option>)}</select></label><label>Disponibilités<select value={application.availability} onChange={e=>setApplication(a=>({...a,availability:e.target.value}))}>{AVAILABILITIES.map(p=><option key={p}>{p}</option>)}</select></label></div>
        <label>Ton expérience (facultatif)<textarea rows={4} maxLength={600} value={application.note} placeholder="Jeu, niveau, objectifs, expériences en équipe... sans coordonnées personnelles" onChange={e=>setApplication(a=>({...a,note:e.target.value}))}/></label>
        <label className="es16-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>J'accepte que les responsables de 16‑18 consultent ces informations uniquement pour étudier ma candidature. Je ne publie pas de données privées.</span></label>
        <button type="submit" className="es16-cta es16-cta-primary" disabled={!snapshot.ready||!consent||sending}>{sending?'Envoi sécurisé…':'Envoyer ma candidature'} <ArrowRight size={18}/></button>
        {!snapshot.ready&&<p className="es16-hint">Les inscriptions internes seront activées après la validation de la base sécurisée. Aucun formulaire ne part tant que ce n’est pas prêt.</p>}
       </form>}
      {user&&<div className="es16-my-submissions"><h4>Mes candidatures</h4>{snapshot.applications?.length?snapshot.applications.map(a=><p key={a.id}><span>{gameName(a.game_id)} · {a.role}</span><strong>{APPLICATION_STATUSES[a.status]||a.status}</strong></p>):<p>Aucune candidature enregistrée pour le moment.</p>}</div>}
     </div><aside className="es16-recruit-right"><MiniEyebrow>LES PROFILS QUE NOUS ACCUEILLONS</MiniEyebrow><h3>Au-delà du score.</h3><p>Il nous faut des joueurs qui s’entraînent, communiquent, respectent les autres et représentent bien le club.</p><div className="es16-roles">{RECRUITMENT_ROLES.map(r=><span key={r}><Check size={15}/>{r}</span>)}</div><div className="es16-ethics"><ShieldCheck size={24}/><p>Pas de pièce d’identité dans le formulaire. Les règles d'âge, d'anti-triche, de vérification de compte et de nationalité/résidence se contrôlent séparément avant chaque tournoi.</p></div></aside></div>
    </div>}
    {view==='medias'&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>CLIPS · GAMEPLAY · COULISSES</MiniEyebrow><h2>16‑18 TV.</h2><p>Les meilleures actions de nos joueurs, les futurs matchs, entraînements et reportages. Une publication n’est visible qu’après validation des responsables.</p></div><button type="button" className="es16-cta es16-cta-secondary" onClick={()=>document.getElementById('es16-publish-form')?.scrollIntoView({behavior:scrollBehavior(),block:'start'})}><Clapperboard size={18}/> Proposer un gameplay</button></div>
     <div className="es16-media-grid">{snapshot.published?.length?snapshot.published.map(item=><article className="es16-media-tile" key={item.id}><div className="es16-media-art"><Gamepad2 size={46} strokeWidth={1.1}/><button type="button" onClick={()=>watch(item)} aria-label={'Regarder '+item.title}><Play size={23} fill="currentColor"/></button></div><p>{gameName(item.game_id)}</p><h3>{item.title}</h3><small>Contenu de la communauté 16‑18</small></article>):<EmptyState title="La chaîne attend ses premières vidéos." description="Aucun gameplay n’a encore été approuvé. Sois le premier à partager une belle action ou une présentation du club !" />}</div>
     <form id="es16-publish-form" className="es16-upload" onSubmit={submitMedia}><div><MiniEyebrow>STUDIO DE L’ÉQUIPE</MiniEyebrow><h3>Proposer une vidéo.</h3><p>Un lien YouTube, Twitch ou TikTok pour les vidéos longues, ou un fichier MP4/WebM jusqu'à 30 Mo pour un clip court sur notre stockage limité.</p></div>
      {!user?<button type="button" className="es16-cta es16-cta-primary" onClick={()=>goTo('member')}>Se connecter pour publier <ArrowRight size={18}/></button>:<div className="es16-form es16-upload-controls">
       <div className="es16-choice" aria-label="Méthode de publication"><button type="button" aria-pressed={uploadType==='link'} onClick={()=>setUploadType('link')}>Lien vidéo</button><button type="button" aria-pressed={uploadType==='file'} onClick={()=>setUploadType('file')}>Fichier vidéo</button></div>
       <label>Titre<input required minLength={3} maxLength={110} placeholder="Le clutch de notre équipe…" value={media.title} onChange={e=>setMedia(m=>({...m,title:e.target.value}))}/></label>
       <label>Jeu<select value={media.game_id} onChange={e=>setMedia(m=>({...m,game_id:e.target.value}))}>{GAMES.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
       {uploadType==='link'?<label>Lien HTTPS public<input required type="url" placeholder="https://www.youtube.com/watch?v=…" value={media.media_url} onChange={e=>setMedia(m=>({...m,media_url:e.target.value}))}/></label>:<label>Clip MP4 ou WebM, 30 Mo max<input required type="file" accept="video/mp4,video/webm" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<small>{file.name} · {(file.size/1048576).toFixed(1)} Mo</small>}</label>}
       <p className="es16-hint">En envoyant, tu confirmes avoir les droits de publier l’enregistrement et l’accord des personnes concernées. Les contenus sont modérés.</p>
       <button type="submit" className="es16-cta es16-cta-primary" disabled={!snapshot.ready||sending||uploadType==='file'&&!file}><Upload size={18}/>{sending?'Envoi en cours…':'Envoyer pour validation'}</button>
       {!snapshot.ready&&<p className="es16-hint">Publication privée non activée avant validation de l’infrastructure.</p>}
      </div>}
      {user&&<div className="es16-my-submissions"><h4>Mes vidéos proposées</h4>{snapshot.myMedia?.length?snapshot.myMedia.map(m=><p key={m.id}><span>{m.title}</span><strong>{MEDIA_STATUSES[m.status]||m.status}</strong></p>):<p>Aucune vidéo soumise.</p>}</div>}
     </form>
    </div>}
    {view==='association'&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>UNE VRAIE ASSOCIATION</MiniEyebrow><h2>Notre structure.</h2><p>Un club compétitif et humain, construit autour d'une association française déclarée : des rôles clairs, des engagements sérieux et des joueurs protégés.</p></div></div>
     <div className="es16-association"><div><MiniEyebrow>IDENTITÉ JURIDIQUE</MiniEyebrow><h3>{CLUB.name}</h3><span className="es16-rna">RNA · {CLUB.rna}</span><p>{CLUB.location} · Déclaration du 13 octobre 2026.</p><p className="es16-hint">{CLUB.warning} La marque 3B et l’association sont présentées séparément.</p><ExternalLinkButton url="https://www.service-public.gouv.fr/" subtle>Mon compte Association</ExternalLinkButton></div><div className="es16-checklist"><h3>Notre feuille de route administrative</h3>{ADMIN_STEPS.map(step=><div className="es16-check-row" key={step.id}><span className={step.state==='done'?'es16-done':'es16-pending'}>{step.state==='done'?<Check size={16}/>:<FileText size={16}/>}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div><a href={step.url} target="_blank" rel="noopener noreferrer" aria-label={'Démarche '+step.title}><ExternalLink size={17}/></a></div>)}</div></div>
     <div className="es16-principles"><span><ShieldCheck/> Identité des joueurs protégée</span><span><Users/> Respect & fair-play</span><span><Globe2/> France, Europe, international</span><span><Trophy/> Aucune qualification inventée</span></div>
    </div>}
    {view==='bureau'&&snapshot.staff&&<div className="es16-sections">
     <div className="es16-section-heading"><div><MiniEyebrow>ACCÈS CONTRÔLÉ</MiniEyebrow><h2>Bureau / Modération.</h2><p>Accès réservé aux comptes explicitement autorisés dans les droits de l'association. Les candidatures sont privées.</p></div><button type="button" className="es16-cta es16-cta-secondary" disabled={refreshing} onClick={refresh}><RefreshCw size={17}/> Actualiser</button></div>
     <div className="es16-admin-columns"><div><h3>Candidatures</h3>{snapshot.queueApplications?.length?snapshot.queueApplications.map(a=><article className="es16-admin-item" key={a.id}><strong>{a.pseudo} · {gameName(a.game_id)}</strong><p>{a.role} · {a.platform} · {a.availability}</p>{a.note&&<p>{a.note}</p>}<small>État : {APPLICATION_STATUSES[a.status]||a.status}</small><div><button type="button" disabled={sending} onClick={()=>review('application',a.id,'trial')}>Proposer un essai</button><button type="button" disabled={sending} onClick={()=>review('application',a.id,'accepted')}>Retenir</button><button type="button" disabled={sending} onClick={()=>review('application',a.id,'rejected')}>Refuser</button></div></article>):<p>Aucune candidature à examiner.</p>}</div><div><h3>Vidéos à approuver</h3>{snapshot.queueMedia?.length?snapshot.queueMedia.map(m=><article className="es16-admin-item" key={m.id}><strong>{m.title} · {gameName(m.game_id)}</strong><small>État : {MEDIA_STATUSES[m.status]||m.status}</small><div><button type="button" onClick={()=>watch(m)}>Prévisualiser</button><button type="button" disabled={sending} onClick={()=>review('media',m.id,'published')}>Approuver</button><button type="button" disabled={sending} onClick={()=>review('media',m.id,'rejected')}>Refuser</button></div></article>):<p>Aucun média à examiner.</p>}</div></div>
    </div>}
   </div>
   <footer className="es16-footer"><div><strong>16—18 <span>ESPORT</span></strong><small>Le terrain de ceux qui avancent ensemble.</small></div><p>Dates issues des calendriers officiels publiés. Vérifie toujours les règles, l'âge minimal, la plateforme, la région et les frais éventuels avant inscription.</p><button type="button" onClick={()=>goTo('home')}>Retour à 3B <ArrowRight size={16}/></button></footer>
  </div>
  {selectedVideo&&<div className="es16-video-backdrop" role="presentation" onClick={()=>setSelectedVideo(null)}><div className="es16-video-dialog" role="dialog" aria-modal="true" aria-label={selectedVideo.title} onClick={e=>e.stopPropagation()}><header><h3>{selectedVideo.title}</h3><button type="button" aria-label="Fermer la vidéo" onClick={()=>setSelectedVideo(null)}><X size={22}/></button></header><video controls autoPlay playsInline src={selectedVideo.url}>La lecture de cette vidéo n’est pas prise en charge sur ce téléphone.</video></div></div>}
 </section>;
}
