import {Button} from '../design-system/index.jsx';
import {useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowRight,BadgePercent,BookImage,BookOpen,ChevronLeft,ChevronRight,Clapperboard,Compass,CreditCard,Eye,FileText,Gamepad2,Globe2,HandHeart,Handshake,Headphones,HeartPulse,IdCard,Landmark,MapPin,Newspaper,Plane,Search,ShieldCheck,ShoppingBag,Sparkles,Star,Trophy,UserRound,Users,X} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import LivingWorldGlobe from './LivingWorldGlobe.jsx';
import {WORLD_MODULE_GROUPS,WORLD_MODULES,WORLD_MORE_SERVICES,WORLD_REALMS,findWorldModules} from './world-living-data.js';
import '../styles/world-living-home.css';

const MODULE_ICONS={
 deals:BadgePercent,health:HeartPulse,religion:BookOpen,invisible:Eye,world3b:Globe2,
 sport:Trophy,manga:BookImage,games:Gamepad2,esports:Headphones,passport:IdCard,
 member:UserRound,loyalty:CreditCard,shop:ShoppingBag,community:Users,ia:Sparkles,
 news:Newspaper,association:HandHeart,partners:Handshake,finance:Landmark,
 travel:Plane,tv:Clapperboard,admin:FileText
};
const TABS=[
 {id:'world',label:'Monde',Icon:Globe2},
 {id:'realms',label:'Royaumes',Icon:Compass},
 {id:'community',label:'Communauté',Icon:Users},
 {id:'opportunities',label:'Opportunités',Icon:Sparkles},
];
const TAB_COPY={
 world:{eyebrow:'MONDE 3B · LE DÉPART',title:'Un monde. Huit héritages.',description:'Fais tourner la planète, choisis un royaume, puis accède à son univers.'},
 realms:{eyebrow:'LES HUIT ROYAUMES',title:'Un héritage dans chaque royaume.',description:'France, Algérie, Maroc, Tunisie, Espagne, Italie, Turquie et Estonie.'},
 community:{eyebrow:'ENSEMBLE · COMMUNAUTÉ',title:'Une communauté à construire.',description:'Entre dans les espaces membres et partage avec les autres.'},
 opportunities:{eyebrow:'DÉCOUVRIR · AGIR',title:'Des espaces pour avancer.',description:'Bons plans, voyages, informations et partenariats réunis.'}
};
const FAVORITES_KEY='threeb-world-favorites-v1';
function readFavorites(){
 try{const saved=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');return Array.isArray(saved)?saved.filter(id=>WORLD_MODULES.some(module=>module.id===id)).slice(0,22):[];}
 catch{return [];}
}

export default function LivingWorldHome({goTo,menuItems=[]}){
 const [tab,setTab]=useState('world');
 const [activeRealm,setActiveRealm]=useState('france');
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('all');
 const [favorites,setFavorites]=useState(readFavorites);
 const [storageNotice,setStorageNotice]=useState('');
 const [allServices,setAllServices]=useState(true);
 const items=useMemo(()=>findWorldModules({query,category,favorites}),[query,category,favorites]);
 const realm=WORLD_REALMS.find(item=>item.id===activeRealm)||WORLD_REALMS[0];
 const copy=TAB_COPY[tab];
 const visibleModuleIds=new Set(menuItems.filter(item=>item.status!=='soon').map(item=>item.id));
 function toggleFavorite(id){
  const next=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];
  setFavorites(next);
  try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(next));setStorageNotice('');}
  catch{setStorageNotice('Favori modifié pour cette session. La sauvegarde sur ce téléphone est indisponible.');}
 }
 function stepRealm(direction){
  const index=WORLD_REALMS.findIndex(item=>item.id===activeRealm);
  setActiveRealm(WORLD_REALMS[(index+direction+WORLD_REALMS.length)%WORLD_REALMS.length].id);
 }
 return <section className="world3b-home" aria-label="3B World — accueil international">
  <header className="world3b-intro">
   <div className="world3b-intro-name"><span className="world3b-brand">3B <span>INTERNATIONAL</span></span><p>UN MONDE · UNE COMMUNAUTÉ · HUIT HÉRITAGES</p></div>
   <RouteLink page="albert" goTo={goTo} className="world3b-albert-shortcut"><Sparkles size={18}/> Albert APEX <ArrowRight size={16}/></RouteLink>
  </header>
  <div className="world3b-hero" aria-labelledby="world3b-hero-title">
   <div className="world3b-hero-background" aria-hidden="true"/>
   <div className="world3b-hero-head">
    <span className="world3b-eyebrow"><span className="world3b-glow-dot"/> CARTE DU MONDE VIVANTE</span>
    <h1 id="world3b-hero-title">Le monde 3B <em>à portée de main.</em></h1>
    <p>Explore, découvre, partage et avance dans un univers qui se construit avec toi.</p>
   </div>
   <div className="world3b-globe-frame">
    <div className="world3b-globe-aura" aria-hidden="true"/>
    <LivingWorldGlobe selectedId={activeRealm} onSelect={setActiveRealm}/>
    <div className="world3b-globe-emblem" aria-hidden="true"><span>3B</span><small>INTERNATIONAL</small></div>
    <div className="world3b-globe-caption"><span>8 ROYAUMES</span><span>22 UNIVERS</span></div>
   </div>
   <div className="world3b-realm-selector">
    <Button variant="ghost" type="button" onClick={()=>stepRealm(-1)} aria-label="Royaume précédent"><ChevronLeft size={20}/></Button>
    <div aria-live="polite" className="world3b-realm-current"><span>{realm.flag} {realm.name}</span><small>{realm.value} · {realm.guardian}</small></div>
    <Button variant="ghost" type="button" onClick={()=>stepRealm(1)} aria-label="Royaume suivant"><ChevronRight size={20}/></Button>
   </div>
   <div className="world3b-hero-bottom"><p>Tourne la planète ou touche un royaume</p><Button variant="ghost" type="button" onClick={()=>document.getElementById('world3b-modules')?.scrollIntoView({behavior:'smooth',block:'start'})}>Découvrir les 22 univers <ArrowDown size={16}/></Button></div>
  </div>
  <nav className="world3b-tabs" aria-label="Explorer la carte mondiale">
   {TABS.map(({id,label,Icon})=><Button variant="ghost" type="button" key={id} className={tab===id?'is-active':''} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}><Icon size={18}/>{label}</Button>)}
  </nav>
  <section className="world3b-active-view" aria-label="Section sélectionnée">
   <div className="world3b-active-copy"><span className="world3b-eyebrow">{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p></div>
   <div className="world3b-active-actions">
    <RouteLink goTo={goTo} page={tab==='community'?'community':tab==='opportunities'?'deals':'world3b'} className="world3b-outline-link">{tab==='community'?'Découvrir la Communauté':tab==='opportunities'?'Voir les bons plans':'Explorer le Monde du 3B'} <ArrowRight size={17}/></RouteLink>
   </div>
  </section>
  <section className="world3b-country-section" aria-labelledby="world3b-country-title">
   <div className="world3b-section-title"><div><span className="world3b-eyebrow">LES HUIT HÉRITAGES</span><h2 id="world3b-country-title">Royaumes à découvrir</h2></div><span className="world3b-subtle">Univers du Monde 3B</span></div>
   <div className="world3b-country-rail">
    {WORLD_REALMS.map(item=><Button variant="ghost" key={item.id} type="button" aria-pressed={activeRealm===item.id} onClick={()=>{setActiveRealm(item.id);setTab('realms');}} className={'world3b-country-card'+(activeRealm===item.id?' is-selected':'')}>
      <span className="world3b-country-flag" aria-hidden="true">{item.flag}</span>
      <span className="world3b-country-name">{item.name}</span>
      <small>{item.value} · {item.guardian}</small>
      <MapPin size={15} aria-hidden="true"/>
    </Button>)}
   </div>
   <p className="world3b-clarity"><ShieldCheck size={15}/> Ces pays représentent les royaumes narratifs de 3B. Ils ne désignent pas des locaux ou des hubs physiques officiellement ouverts.</p>
  </section>
  <section className="world3b-module-section" id="world3b-modules" aria-labelledby="world3b-modules-title">
   <div className="world3b-section-title"><div><span className="world3b-eyebrow">UN SEUL UNIVERS · DES ACCÈS RÉELS</span><h2 id="world3b-modules-title">Les 22 univers 3B</h2></div><span className="world3b-count">22</span></div>
   <div className="world3b-searchbar"><Search size={21} aria-hidden="true"/><label htmlFor="world3b-search" className="visually-hidden">Rechercher une rubrique 3B</label><input id="world3b-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Rechercher un univers, un service…" autoComplete="off"/>{query&&<Button variant="ghost" type="button" onClick={()=>setQuery('')} aria-label="Effacer la recherche"><X size={19}/></Button>}</div>
   <div className="world3b-filter-rail" aria-label="Filtrer les univers">
    {WORLD_MODULE_GROUPS.map(group=><Button variant="ghost" key={group.id} type="button" aria-pressed={category===group.id} className={category===group.id?'is-active':''} onClick={()=>setCategory(group.id)}>{group.label}</Button>)}
    <Button variant="ghost" type="button" className={category==='favorites'?'is-active':''} aria-pressed={category==='favorites'} onClick={()=>setCategory('favorites')}><Star size={14}/> Favoris</Button>
   </div>
   <div className="world3b-universes" aria-live="polite">
    {items.map(item=>{
     const Icon=MODULE_ICONS[item.id]||Globe2;
     const actual=menuItems.find(menu=>menu.id===item.id);
     const available=item.id==='loyalty'||visibleModuleIds.has(item.id);
     return <article key={item.id} className={'world3b-universe'+(!available?' is-unavailable':'')}>
      <RouteLink page={item.id} goTo={goTo} className="world3b-universe-link" aria-label={'Ouvrir '+item.label}>
       <span className="world3b-universe-icon"><Icon size={28} strokeWidth={1.6}/></span>
       <strong>{actual?.id==='member'&&actual.label==='Connexion / Inscription'?'Mon compte':item.label}</strong>
       <span className="world3b-universe-arrow" aria-hidden="true"><ArrowRight size={14}/></span>
      </RouteLink>
      <Button variant="ghost" type="button" className={'world3b-universe-fav'+(favorites.includes(item.id)?' is-favorite':'')} onClick={()=>toggleFavorite(item.id)} aria-label={(favorites.includes(item.id)?'Retirer '+item.label+' des favoris':'Ajouter '+item.label+' aux favoris')} aria-pressed={favorites.includes(item.id)}><Star size={14} fill={favorites.includes(item.id)?'currentColor':'none'}/></Button>
     </article>;
    })}
   </div>
   {items.length===0&&<p className="world3b-no-results">Aucune rubrique correspondante. Essaie un autre mot ou affiche « Tout ».</p>}
   {storageNotice&&<p role="status" className="world3b-clarity">{storageNotice}</p>}
   <p className="world3b-clarity">Les cases ouvrent les pages existantes. Certaines fonctionnalités peuvent encore dépendre d’un compte, d’une autorisation ou d’une activation officielle.</p>
  </section>
  <section className="world3b-albert-promo" aria-labelledby="world3b-albert-title">
   <div className="world3b-albert-orb" aria-hidden="true"><Sparkles size={36}/></div>
   <div><span className="world3b-eyebrow">INTELLIGENCE · 3B</span><h2 id="world3b-albert-title">Albert APEX, ton futur concierge 3B.</h2><p>Un espace d’assistance élégant, des raccourcis et un guide des univers accessible dès maintenant. Le moteur Albert personnel reste protégé.</p></div>
   <RouteLink goTo={goTo} page="albert" className="world3b-albert-open">Découvrir Albert <ArrowRight size={17}/></RouteLink>
  </section>
  <section className="world3b-extra" aria-labelledby="world3b-extra-title">
   <div className="world3b-section-title"><div><span className="world3b-eyebrow">ET BIEN PLUS ENCORE</span><h2 id="world3b-extra-title">Les autres services 3B</h2></div><Button variant="ghost" type="button" onClick={()=>setAllServices(value=>!value)} aria-expanded={allServices} aria-controls="world3b-extra-list">{allServices?'Réduire':'Voir tout'} <ArrowRight size={16}/></Button></div>
   <div className={'world3b-extra-links'+(allServices?' is-expanded':'')} id="world3b-extra-list">
    {WORLD_MORE_SERVICES.map(item=><RouteLink key={item.id} page={item.id} goTo={goTo}>{item.label}<ArrowRight size={16}/></RouteLink>)}
   </div>
  </section>
 </section>;
}
