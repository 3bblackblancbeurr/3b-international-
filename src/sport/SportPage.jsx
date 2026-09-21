import {useEffect,useMemo,useState} from 'react';
import {
 ArrowUpRight,RefreshCw,Trophy,Globe2,Flame,Handshake,Users,Dumbbell,
 Sparkles,Languages,MapPin,ShieldCheck,ChevronDown,Clock3
} from 'lucide-react';
import {ecosystemPublic} from '../lib/ecosystem.js';
import {SPORTS} from '../../supabase/functions/ecosystem/sports.js';
import './sport.css';

const SECTIONS=[
 {id:'news',label:'Actualités',icon:Globe2},
 {id:'challenges',label:'Défis 3B',icon:Flame},
 {id:'collabs',label:'Collaborations',icon:Handshake}
];

const CHALLENGES=[
 {title:'30 minutes · 7 jours',tag:'RÉGULARITÉ',level:'Tous niveaux',description:'Choisis ton activité et bouge 30 minutes par jour pendant une semaine. Marche, course, vélo, salle ou sport collectif.',icon:Dumbbell},
 {title:'10 000 pas collectif',tag:'ENDURANCE',level:'Accessible',description:'Un défi simple à lancer avec les membres 3B : objectif quotidien, progression personnelle et motivation collective.',icon:Users},
 {title:'Match local 3B',tag:'RENCONTRE',level:'À organiser',description:'Football, basket, padel, futsal ou autre : propose un lieu, une date, un niveau et rassemble une équipe près de chez toi.',icon:MapPin},
 {title:'Découvre un nouveau sport',tag:'EXPLORATION',level:'1 nouvelle pratique',description:'Teste une discipline que tu ne pratiques jamais et partage ton retour au collectif pour donner envie à d’autres.',icon:Sparkles}
];

const COLLABORATIONS=[
 {title:'Club ou association',tag:'TERRAIN',description:'Présente ton club, ton association ou ton projet sportif et explique ce que tu aimerais construire avec 3B.',icon:ShieldCheck},
 {title:'Athlète ou coach',tag:'TALENT',description:'Profil, discipline, parcours, besoins et idée de collaboration : crée une proposition claire pour le collectif.',icon:Trophy},
 {title:'Tournoi ou événement',tag:'ÉVÉNEMENT',description:'Propose un tournoi, une rencontre, une animation locale ou une activation sportive avec un format concret.',icon:Users},
 {title:'Textile & équipement',tag:'CRÉATION',description:'Imagine un maillot, une tenue, un équipement ou une capsule sport 3B puis partage le concept avec la communauté.',icon:Sparkles}
];

const dateLabel=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});

export default function SportPage({goTo}){
 const[data,setData]=useState(null);
 const[error,setError]=useState('');
 const[busy,setBusy]=useState(false);
 const[reload,setReload]=useState(0);
 const[section,setSection]=useState('news');
 const[sport,setSport]=useState('Tous');
 const[language,setLanguage]=useState('priority');
 const[visibleCount,setVisibleCount]=useState(9);

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

 useEffect(()=>setVisibleCount(9),[sport,language]);

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

 function openCommunityIntent(intent){
  try{sessionStorage.setItem('3b-community-intent',intent);}catch{}
  goTo('community');
 }

 return <section className="editorial-page sport-page">
  <div className="sport-heading">
   <div className="editorial-heading">
    <p className="eyebrow">LE SPORT, AU QUOTIDIEN</p>
    <h1>La passion<br/><em>n’a pas de frontières.</em></h1>
    <p>L’actualité multisports, les idées de défis et les collaborations du collectif 3B.</p>
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
    <div><p className="eyebrow">BOUGER ENSEMBLE</p><h2>Les Défis 3B.</h2><p>Des formats simples pour participer seul, entre amis ou avec la communauté, sans transformer l’espace sport en compétition permanente.</p></div>
    <Flame size={58} strokeWidth={1}/>
   </header>
   <div className="sport-action-grid">
    {CHALLENGES.map(item=>{const Icon=item.icon;return <article className="sport-action-card" key={item.title}>
     <div className="sport-action-icon"><Icon size={23}/></div>
     <span>{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.level}</small>
    </article>;})}
   </div>
   <div className="sport-feature-cta">
    <div><span className="eyebrow">TON IDÉE · TON SPORT · TA VILLE</span><h3>Propose ton propre défi.</h3><p>Donne un titre, les règles, le niveau, le lieu si nécessaire et partage-le directement dans le collectif 3B.</p></div>
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
