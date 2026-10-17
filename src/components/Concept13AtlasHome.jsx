import {useMemo,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,BadgePercent,BookOpen,Clapperboard,Compass,CreditCard,Crown,Eye,FileText,Gamepad2,Globe2,Handshake,Headphones,HeartHandshake,HeartPulse,IdCard,Landmark,Menu,Newspaper,Plane,Search,ShieldCheck,ShoppingBag,Sparkles,Trophy,UserRound,Users,X} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {RouteLink} from './AppNavigation.jsx';
import AtlasCinematicMap from './AtlasCinematicMap.jsx';
import {WORLD_MODULES,WORLD_MORE_SERVICES,WORLD_REALMS,findWorldModules,normalizeWorldSearch} from './world-living-data.js';
import '../styles/concept13-atlas-v4.css';

const TABS=[
 {id:'world',label:'Monde'},
 {id:'hubs',label:'Hubs 3B'},
 {id:'community',label:'Communauté'},
 {id:'opportunities',label:'Opportunités'}
];
const ICONS={
 deals:BadgePercent,health:HeartPulse,religion:BookOpen,invisible:Eye,world3b:Globe2,
 sport:Trophy,manga:BookOpen,games:Gamepad2,esports:Headphones,passport:IdCard,
 member:UserRound,loyalty:CreditCard,shop:ShoppingBag,community:Users,ia:Sparkles,
 news:Newspaper,association:HeartHandshake,partners:Handshake,finance:Landmark,
 travel:Plane,tv:Clapperboard,admin:FileText,maintenant:Compass,foodscan:Search,
 cinema:Clapperboard,join:Users,albert:Sparkles
};
const REALM_ART=Object.freeze({
 france:'/art/atlas-v4/france.webp',
 algerie:'/art/atlas-v4/algerie.webp',
 maroc:'/art/atlas-v4/maroc.webp',
 tunisie:'/art/atlas-v4/tunisie.webp',
 espagne:'/art/atlas-v4/espagne.webp',
 italie:'/art/atlas-v4/italie.webp',
 turquie:'/art/atlas-v4/turquie.webp',
 estonie:'/art/atlas-v4/estonie.webp'
});
const FEATURED=[
 {id:'world3b',name:'Monde 3B',Icon:Globe2},
 {id:'health',name:'Santé',Icon:HeartPulse},
 {id:'games',name:'Jeux 3B',Icon:Gamepad2},
 {id:'albert',name:'Albert APEX',Icon:Sparkles}
];
const PANELS={
 hubs:{eyebrow:'UNE VISION INTERNATIONALE',title:'Des liens à construire',description:'Découvre nos univers et les possibilités de rencontres. Aucun lieu physique 3B n’est présenté comme déjà ouvert.',actions:[{id:'community',label:'La communauté'},{id:'partners',label:'Collaborations'},{id:'travel',label:'Explorer Voyage 3B'}]},
 community:{eyebrow:'BLACK · BLANC · BEUR',title:'Un monde, plusieurs héritages',description:'Accède aux espaces de la communauté, aux initiatives solidaires et aux partenaires proposés dans 3B.',actions:[{id:'community',label:'Espace communauté'},{id:'association',label:'Association 3B'},{id:'member',label:'Espace membre'}]},
 opportunities:{eyebrow:'EXPLORER ET ENTREPRENDRE',title:'Chaque horizon compte',description:'Voyage, création, informations et collaborations : découvre les vrais espaces de ton application.',actions:[{id:'travel',label:'Voyage 3B'},{id:'join',label:'Nous recherchons'},{id:'news',label:'Info Actu'},{id:'partners',label:'Partenaires'}]}
};
function globalMenu(){
 window.dispatchEvent(new CustomEvent('threeb:open-app-menu',{detail:{category:'principal'}}));
}
export default function Concept13AtlasHome({goTo}){
 const [tab,setTab]=useState('world');
 const [realmIndex,setRealmIndex]=useState(0);
 const [query,setQuery]=useState('');
 const [allOpen,setAllOpen]=useState(false);
 const [category,setCategory]=useState('all');
 const directoryRef=useRef(null),searchRef=useRef(null);
 const realm=WORLD_REALMS[realmIndex];
 const cleaned=normalizeWorldSearch(query);
 const foundModules=useMemo(()=>findWorldModules({query}),[query]);
 const foundExtra=useMemo(()=>WORLD_MORE_SERVICES.filter(x=>normalizeWorldSearch([x.label,...(x.aliases||[])].join(' ')).includes(cleaned)),[cleaned]);
 const foundRealms=useMemo(()=>WORLD_REALMS.filter(x=>normalizeWorldSearch([x.name,x.value,x.guardian].join(' ')).includes(cleaned)),[cleaned]);
 const allItems=[...foundModules,...foundExtra];
 const matches=cleaned?allItems.slice(0,6):[];
 const selectedPanel=PANELS[tab];
 const grouped=category==='all'?WORLD_MODULES:WORLD_MODULES.filter(x=>x.group===category);
 function selectRealm(id){const index=WORLD_REALMS.findIndex(x=>x.id===id);if(index>=0){setRealmIndex(index);setTab('world');}}
 function openDirectory(){setQuery('');setAllOpen(true);requestAnimationFrame(()=>directoryRef.current?.showModal());}
 function closeDirectory(){directoryRef.current?.close();setAllOpen(false);}
 function activateSearch(){const target=matches[0];if(target){setQuery('');goTo(target.id);return;}if(foundRealms.length){selectRealm(foundRealms[0].id);setQuery('');}}
 return <section className="atlas3b" aria-label="3B International — Carte du Monde Vivante">
  <div className="atlas3b-atmosphere" aria-hidden="true"/>
  <header className="atlas3b-header">
   <Button variant="ghost" type="button" className="atlas3b-menu" aria-label="Ouvrir le menu général 3B" onClick={globalMenu}><Menu size={22}/></Button>
   <div className="atlas3b-brand" aria-label="3B International"><Crown size={16} aria-hidden="true"/><strong>3B</strong><span>INTERNATIONAL</span></div>
   <RouteLink page="member" goTo={goTo} className="atlas3b-profile" aria-label="Accéder à mon espace membre"><UserRound size={22}/></RouteLink>
  </header>
  <div className="atlas3b-find">
   <Search size={18} aria-hidden="true"/>
   <input ref={searchRef} type="search" autoComplete="off" spellCheck={false} maxLength={80} value={query}
    placeholder="Explorer un pays, un univers, une idée…" aria-label="Rechercher un pays ou un univers 3B"
    onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');if(e.key==='Enter'){e.preventDefault();activateSearch();}}}/>
   {cleaned&&<Button type="button" variant="ghost" className="atlas3b-search-clear" aria-label="Effacer la recherche" onClick={()=>{setQuery('');searchRef.current?.focus();}}><X size={18}/></Button>}
   {cleaned&&<div className="atlas3b-search-results" role="region" aria-label="Résultats de recherche">
    {matches.map(item=><Button type="button" variant="ghost" key={item.id} onClick={()=>{setQuery('');goTo(item.id);}}>
     <Search size={16}/><span>{item.label}</span><ArrowRight size={15}/>
    </Button>)}
    {foundRealms.slice(0,3).map(item=><Button type="button" variant="ghost" key={item.id} onClick={()=>{selectRealm(item.id);setQuery('');}}>
     <Globe2 size={16}/><span>{item.name} · royaume {item.value}</span><ArrowRight size={15}/>
    </Button>)}
    {!matches.length&&!foundRealms.length&&<p>Aucun résultat. Essaie « santé », « Maroc » ou « jeux ».</p>}
   </div>}
  </div>
  <nav className="atlas3b-tabs" role="tablist" aria-label="Explorer les grandes expériences 3B">
   {TABS.map((item,i)=><Button variant="ghost" role="tab" type="button" key={item.id} id={'atlas3b-tab-'+item.id}
    aria-selected={tab===item.id} aria-controls="atlas3b-map-content" tabIndex={tab===item.id?0:-1}
    onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setTab(TABS[(i+(e.key==='ArrowRight'?1:3))%4].id);}}}
    onClick={()=>setTab(item.id)}>{item.label}</Button>)}
  </nav>
  <div className="atlas3b-stage" id="atlas3b-map-content" role="tabpanel" aria-labelledby={'atlas3b-tab-'+tab}>
   <div className="atlas3b-stage-head"><span><span className="atlas3b-live-dot"/> CARTE DU MONDE VIVANTE</span><span>8 ROYAUMES · 22 UNIVERS</span></div>
   <AtlasCinematicMap activeRealm={realm.id} onRealm={selectRealm} onTravel={()=>goTo('travel')}/>
   <div className="atlas3b-stage-veil" aria-hidden="true"/>
   {selectedPanel?<div className="atlas3b-panel">
    <span>{selectedPanel.eyebrow}</span>
    <h1>{selectedPanel.title}</h1>
    <p>{selectedPanel.description}</p>
    <div className="atlas3b-panel-links">{selectedPanel.actions.map(x=><RouteLink key={x.id} page={x.id} goTo={goTo}>{x.label}<ArrowUpRight size={15}/></RouteLink>)}</div>
   </div>:<div className="atlas3b-map-caption">
    <span className="atlas3b-map-numbers">LE MONDE 3B · <strong>{realm.name}</strong></span>
    <p>{realm.value} · {realm.guardian} <span aria-hidden="true">✦</span> Royaume narratif</p>
    <RouteLink goTo={goTo} page="world3b" aria-label={'Explorer le royaume '+realm.name}>Entrer dans les huit royaumes <ArrowRight size={15}/></RouteLink>
   </div>}
   <span className="atlas3b-attribution"><a href="https://earthobservatory.nasa.gov/images/79765/night-lights-2012" target="_blank" rel="noopener noreferrer">NASA / Earth Observatory</a> · Connexions illustratives, pas de hubs actifs</span>
  </div>
  <section className="atlas3b-realms" aria-label="Les huit royaumes narratifs 3B">
   <div className="atlas3b-strip-title"><h2>Les huit royaumes</h2><RouteLink goTo={goTo} page="world3b">Explorer <ArrowRight size={14}/></RouteLink></div>
   <div className="atlas3b-realm-rail">
    {WORLD_REALMS.map((country,i)=><Button variant="ghost" type="button" key={country.id}
     className="atlas3b-realm" aria-pressed={i===realmIndex} onClick={()=>selectRealm(country.id)}>
     <img src={REALM_ART[country.id]} loading={i<3?'eager':'lazy'} decoding="async" alt=""/>
     <span className="atlas3b-realm-shade"/>
     <span className="atlas3b-realm-name"><strong>{country.name}</strong><small>{country.value}</small></span>
    </Button>)}
   </div>
  </section>
  <section className="atlas3b-modules" aria-label="Les 22 univers 3B">
   <div className="atlas3b-strip-title"><h2>Les 22 univers 3B</h2><Button type="button" variant="ghost" onClick={openDirectory} aria-label="Afficher les 22 univers 3B">Voir tout <ArrowRight size={14}/></Button></div>
   <nav className="atlas3b-module-rail" aria-label="Accès rapides aux univers">
    {WORLD_MODULES.map((item,i)=>{
     const Icon=ICONS[item.id]||Globe2;
     return <RouteLink key={item.id} page={item.id} goTo={goTo} className={'atlas3b-module-link'+(i===4?' atlas3b-module-feature':'')}>
      <span className="atlas3b-module-icon"><Icon size={22} strokeWidth={1.75}/></span><span>{item.label}</span>
     </RouteLink>;
    })}
   </nav>
  </section>
  <nav className="atlas3b-dock" aria-label="Navigation essentielle 3B">
   <RouteLink page="home" goTo={goTo} aria-current="page"><Globe2 size={20}/><span>Accueil</span></RouteLink>
   <RouteLink page="world3b" goTo={goTo}><Compass size={20}/><span>Monde</span></RouteLink>
   <Button type="button" variant="ghost" className="atlas3b-dock-center" aria-label="Explorer les 22 univers" onClick={openDirectory}><span>3B</span></Button>
   <RouteLink page="albert" goTo={goTo}><Sparkles size={20}/><span>Albert</span></RouteLink>
   <RouteLink page="member" goTo={goTo}><UserRound size={20}/><span>Profil</span></RouteLink>
  </nav>
  <dialog ref={directoryRef} className="atlas3b-directory" aria-labelledby="atlas3b-directory-title" onClose={()=>setAllOpen(false)}>
   <div className="atlas3b-directory-header"><div><span>TOUT L’UNIVERS 3B</span><h2 id="atlas3b-directory-title">Les 22 univers.</h2><p>De vrais accès à ton application, sans étapes artificielles.</p></div>
    <Button type="button" variant="ghost" aria-label="Fermer les univers" onClick={closeDirectory}><X size={24}/></Button>
   </div>
   <div className="atlas3b-directory-filters" role="group" aria-label="Filtrer les univers">
    {[{id:'all',label:'Tous'},{id:'daily',label:'Vie quotidienne'},{id:'play',label:'Jeux & passions'},{id:'member',label:'Ma communauté'},{id:'business',label:'Opportunités'}].map(x=><Button variant="ghost" type="button" key={x.id} aria-pressed={category===x.id} onClick={()=>setCategory(x.id)}>{x.label}</Button>)}
   </div>
   <div className="atlas3b-directory-grid">
    {grouped.map(item=>{const Icon=ICONS[item.id]||Globe2;return <RouteLink key={item.id} goTo={goTo} page={item.id} onClick={closeDirectory}>
     <Icon size={25} strokeWidth={1.7}/><span>{item.label}</span><ArrowUpRight size={15}/>
    </RouteLink>})}
   </div>
   <div className="atlas3b-directory-more">
    <h3>À découvrir aussi</h3>
    {WORLD_MORE_SERVICES.filter(x=>x.id!=='secret').map(x=><RouteLink key={x.id} page={x.id} goTo={goTo} onClick={closeDirectory}>{x.label}</RouteLink>)}
   </div>
   <p className="atlas3b-directory-foot"><ShieldCheck size={15}/> Les royaumes sont narratifs. Aucune statistique de membres ni ouverture de hub n’est inventée.</p>
  </dialog>
 </section>;
}
