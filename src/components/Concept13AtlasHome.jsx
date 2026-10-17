import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,BadgePercent,BookOpen,Clapperboard,Compass,CreditCard,Crown,Eye,FileText,Gamepad2,Globe2,Handshake,Headphones,HeartHandshake,HeartPulse,IdCard,Landmark,Menu,Newspaper,Plane,Search,ShieldCheck,ShoppingBag,Sparkles,Trophy,UserRound,Users,X} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {RouteLink} from './AppNavigation.jsx';
import AtlasCinematicMap from './AtlasCinematicMap.jsx';
import {Star} from 'lucide-react';
import {ATLAS_PREFERENCES_KEY,createAtlasPreferencesSession,readAtlasPreferences} from './atlas-preferences.js';
import {WORLD_MODULES,WORLD_MORE_SERVICES,WORLD_REALMS,findWorldExtraServices,findWorldModules,normalizeWorldSearch} from './world-living-data.js';
import '../styles/concept13-atlas-v4.css';
import '../styles/atlas-prestige.css';

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
 {id:'finance',name:'Banque & crypto',Icon:Landmark},
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
 const preferenceSession=useRef(null);if(!preferenceSession.current)preferenceSession.current=createAtlasPreferencesSession();
 const [preferences,setPreferences]=useState(()=>preferenceSession.current.loaded.preferences);
 const preferencesRef=useRef(preferences),preferenceSequence=useRef(0),preferencePending=useRef(0),preferenceFailed=useRef(!preferenceSession.current.loaded.saved),preferenceExternal=useRef(false);
 const [storageError,setStorageError]=useState(()=>!preferenceSession.current.loaded.saved);
 const [tab,setTab]=useState('world');
 const [realmIndex,setRealmIndex]=useState(()=>Math.max(0,WORLD_REALMS.findIndex(x=>x.id===preferences.realm)));
 const [query,setQuery]=useState('');
 const [allOpen,setAllOpen]=useState(false);
 const [category,setCategory]=useState('all');
 const [moduleQuery,setModuleQuery]=useState('');
 const [feedback,setFeedback]=useState('');
 const directoryRef=useRef(null),searchRef=useRef(null),realmRailRef=useRef(null);
 const realm=WORLD_REALMS[realmIndex];
 const cleaned=normalizeWorldSearch(query);
 const foundModules=useMemo(()=>findWorldModules({query}),[query]);
 const foundExtra=useMemo(()=>findWorldExtraServices(query),[query]);
 const foundRealms=useMemo(()=>WORLD_REALMS.filter(x=>{const blob=normalizeWorldSearch([x.name,x.value,x.guardian].join(' '));return cleaned.split(/\s+/).every(word=>blob.includes(word));}),[cleaned]);
 const allItems=[...foundModules,...foundExtra];
 const matches=cleaned?allItems.slice(0,6):[];
 const selectedPanel=PANELS[tab];
 const grouped=findWorldModules({query:moduleQuery,category,favorites:preferences.favorites});
 function applyPreferences(next){preferencesRef.current=next;setPreferences(next);setRealmIndex(Math.max(0,WORLD_REALMS.findIndex(item=>item.id===next.realm)));}
 function refreshPreferences(){if(preferencePending.current){preferenceExternal.current=true;return;}if(preferenceFailed.current)return;const next=createAtlasPreferencesSession();if(!next.loaded.saved){preferenceFailed.current=true;setStorageError(true);return;}preferenceSession.current=next;applyPreferences(next.loaded.preferences);}
 async function persistPreference(action){const ticket=++preferenceSequence.current;preferencePending.current++;
  try{const result=await preferenceSession.current.commit(action);if(ticket!==preferenceSequence.current)return;preferenceFailed.current=!result.saved;setStorageError(!result.saved);if(result.saved)applyPreferences(result.preferences);}
  catch{if(ticket===preferenceSequence.current){preferenceFailed.current=true;setStorageError(true);}}
  finally{preferencePending.current--;if(!preferencePending.current&&preferenceExternal.current){preferenceExternal.current=false;refreshPreferences();}}
 }
 useEffect(()=>{const sync=event=>{if(event.key!==ATLAS_PREFERENCES_KEY&&event.key!==null)return;if(event.storageArea&&event.storageArea!==window.localStorage)return;refreshPreferences();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(''),3200);return()=>clearTimeout(timer);},[feedback]);
 useEffect(()=>{
  const rail=realmRailRef.current,card=rail?.querySelector('[data-realm-id="'+realm.id+'"]');if(!rail||!card)return;
  const bounds=rail.getBoundingClientRect(),selected=card.getBoundingClientRect();
  if(selected.left>=bounds.left&&selected.right<=bounds.right)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.experienceMotion==='reduced';
  rail.scrollTo({left:rail.scrollLeft+selected.left-bounds.left-(rail.clientWidth-selected.width)/2,behavior:reduced?'auto':'smooth'});
 },[realm.id]);
 function toggleFavorite(id){const item=WORLD_MODULES.find(item=>item.id===id),current=preferencesRef.current,removing=current.favorites.includes(id);applyPreferences({...current,favorites:removing?current.favorites.filter(item=>item!==id):[...current.favorites,id]});persistPreference({type:'favorite',id,selected:!removing});setFeedback((item?.label||'Cet espace')+(removing?' retiré de tes favoris.':' ajouté à tes favoris.'));}
 function selectRealm(id){const index=WORLD_REALMS.findIndex(x=>x.id===id);if(index>=0){applyPreferences({...preferencesRef.current,realm:id});persistPreference({type:'realm',id});setTab('world');setFeedback(WORLD_REALMS[index].name+' · '+WORLD_REALMS[index].value+' · '+WORLD_REALMS[index].guardian);}}
 function openDirectory(){setQuery('');setModuleQuery('');setCategory('all');setAllOpen(true);requestAnimationFrame(()=>directoryRef.current?.showModal());}
 function closeDirectory(){directoryRef.current?.close();setAllOpen(false);}
 function activateSearch(){const target=matches[0];if(target){setQuery('');goTo(target.id);return;}if(foundRealms.length){selectRealm(foundRealms[0].id);setQuery('');}}
 return <section className="atlas3b" aria-label="3B International — Carte du Monde Vivante">
  <div className="atlas3b-atmosphere" aria-hidden="true"/>
  <header className="atlas3b-header">
   <Button variant="ghost" type="button" className="atlas3b-menu" aria-label="Ouvrir le menu général 3B" onClick={globalMenu}><Menu size={22}/></Button>
   <div className="atlas3b-brand" aria-label="3B International"><Crown size={16} aria-hidden="true"/><strong>3B</strong><span>INTERNATIONAL</span></div>
   <nav className="atlas3b-header-links" aria-label="Découvrir 3B"><RouteLink page="world3b" goTo={goTo}>Explorer le monde</RouteLink><RouteLink page="community" goTo={goTo}>La communauté</RouteLink><RouteLink page="albert" goTo={goTo}><Sparkles size={15}/> Albert APEX</RouteLink></nav>
   <RouteLink page="member" goTo={goTo} className="atlas3b-profile" aria-label="Accéder à mon espace membre"><UserRound size={22}/></RouteLink>
  </header>
  <div className="atlas3b-find">
   <Search size={18} aria-hidden="true"/>
   <input ref={searchRef} type="search" autoComplete="off" spellCheck={false} maxLength={80} value={query}
    placeholder="Explorer un pays, un univers, une idée…" aria-label="Rechercher un pays ou un espace 3B"
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
    onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?TABS[0]:e.key==='End'?TABS[3]:TABS[(i+(e.key==='ArrowRight'?1:3))%4];setTab(next.id);document.getElementById('atlas3b-tab-'+next.id)?.focus();}}}
    onClick={()=>setTab(item.id)}>{item.label}</Button>)}
  </nav>
  <div className="atlas3b-stage" id="atlas3b-map-content" role="tabpanel" aria-labelledby={'atlas3b-tab-'+tab}>
   <div className="atlas3b-stage-head"><span><span className="atlas3b-live-dot"/> CARTE DU MONDE VIVANTE</span><span>HÉRITAGES · PASSIONS · PROJETS</span></div>
   <AtlasCinematicMap activeRealm={realm.id} onRealm={selectRealm} onTravel={()=>goTo('travel')}/>
   <div className="atlas3b-stage-veil" aria-hidden="true"/>
   {!selectedPanel&&<div className="atlas3b-intro"><span className="atlas3b-eyebrow">BLACK · BLANC · BEUR</span><h1>Le monde 3B,<br/><em>à portée de main.</em></h1><p>Explore tes passions. Retrouve ta communauté.<br/>Donne une nouvelle dimension à tes projets.</p><div className="atlas3b-intro-actions"><RouteLink page="world3b" goTo={goTo}>Explorer mon monde <ArrowUpRight size={18}/></RouteLink><Button variant="ghost" onClick={openDirectory}>Découvrir les espaces <ArrowRight size={17}/></Button></div><span className="atlas3b-intro-note"><Compass size={14}/> 8 héritages. Une même ambition.</span></div>}
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
   <span className="atlas3b-attribution">Création visuelle IA · Connexions illustratives</span>
  </div>
  <section className="atlas3b-pathways" aria-label="Commencer une expérience">{FEATURED.map(({id,name,Icon},i)=><RouteLink key={id} page={id} goTo={goTo}><span className="atlas3b-pathway-number">0{i+1}</span><Icon size={23}/><span><strong>{name}</strong><small>{['Entre dans les huit royaumes','Prends soin de ton quotidien','Prépare ton projet financier','Comprendre, créer et entreprendre'][i]}</small></span><ArrowUpRight size={18}/></RouteLink>)}</section>
  <section className="atlas3b-modules" aria-label="Les espaces 3B">
   <div className="atlas3b-strip-title"><div><span className="atlas3b-section-kicker">À CHAQUE ENVIE, SON ESPACE</span><h2>Les espaces 3B</h2></div><Button type="button" variant="ghost" onClick={openDirectory} aria-label="Afficher tous les espaces 3B">Voir tout <ArrowRight size={14}/></Button></div>
   <div className="atlas3b-module-tools"><div className="atlas3b-module-filters" role="group" aria-label="Catégories des espaces">{[{id:'all',label:'Tous'},{id:'favorites',label:'Mes favoris'},{id:'daily',label:'Quotidien'},{id:'play',label:'Passions'},{id:'member',label:'Communauté'},{id:'business',label:'Opportunités'}].map(item=><Button key={item.id} variant="ghost" aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.id==='favorites'&&<Star size={13}/>} {item.label}</Button>)}</div><label className="atlas3b-module-search"><Search size={16}/><input type="search" aria-label="Filtrer les espaces" placeholder="Trouver un espace…" value={moduleQuery} onChange={event=>setModuleQuery(event.target.value)} maxLength={80}/></label></div>
   <p className="atlas3b-result-count">{grouped.length} espace{grouped.length>1?'s':''} {grouped.length>1?'disponibles':'disponible'} dans cette sélection</p>
   <nav className="atlas3b-module-rail" aria-label="Accès rapides aux espaces">
    {WORLD_MODULES.map((item,i)=>{
     const Icon=ICONS[item.id]||Globe2;
     if(!grouped.some(result=>result.id===item.id))return null;
     return <div className="atlas3b-module-card" key={item.id}><RouteLink page={item.id} goTo={goTo} className={'atlas3b-module-link'+(i===4?' atlas3b-module-feature':'')}>
      <span className="atlas3b-module-icon"><Icon size={25} strokeWidth={1.5}/></span><span>{item.label}</span><ArrowUpRight className="atlas3b-module-arrow" size={13}/>
     </RouteLink><Button variant="ghost" className="atlas3b-favorite" aria-label={(preferences.favorites.includes(item.id)?'Retirer des favoris : ':'Ajouter aux favoris : ')+item.label} aria-pressed={preferences.favorites.includes(item.id)} onClick={()=>toggleFavorite(item.id)}><Star size={14} fill={preferences.favorites.includes(item.id)?'currentColor':'none'}/></Button></div>;
    })}
   </nav>
   {!grouped.length&&<div className="atlas3b-empty"><Star size={25}/><h3>{category==='favorites'&&!moduleQuery?'Tes espaces préférés.':'Aucun espace trouvé.'}</h3><p>{category==='favorites'&&!moduleQuery?'Touche l’étoile d’un espace pour le retrouver ici.':'Essaie un autre mot ou explore toutes les catégories.'}</p><Button variant="ghost" onClick={()=>{setCategory('all');setModuleQuery('');}}>Explorer les espaces 3B <ArrowRight size={15}/></Button></div>}
   <p className="atlas3b-save-status" role={storageError?'status':undefined}>{storageError?'La sauvegarde sur cet appareil est indisponible. Tes choix restent actifs pour cette visite.':`${preferences.favorites.length} favori${preferences.favorites.length>1?'s':''} · Préférences enregistrées sur cet appareil`}</p>
  </section>
  <section className="atlas3b-realms" aria-label="Les huit royaumes narratifs 3B">
   <div className="atlas3b-strip-title"><div><span className="atlas3b-section-kicker">LE CERCLE BRISÉ · LES HUIT HÉRITAGES</span><h2>Les huit royaumes</h2></div><RouteLink goTo={goTo} page="world3b">Explorer <ArrowRight size={14}/></RouteLink></div>
   <div className="atlas3b-realm-rail" ref={realmRailRef}>
    {WORLD_REALMS.map((country,i)=><Button variant="ghost" type="button" key={country.id}
     className="atlas3b-realm" data-realm-id={country.id} aria-pressed={i===realmIndex} onClick={()=>selectRealm(country.id)}>
     <img src={REALM_ART[country.id]} loading="lazy" decoding="async" alt=""/>
     <span className="atlas3b-realm-shade"/>
     <span className="atlas3b-realm-name"><strong>{country.name}</strong><small>{country.value} · {country.guardian}</small></span>
    </Button>)}
   </div>
  </section>
  <div className="atlas3b-action-feedback" role="status" aria-live="polite" aria-atomic="true">{feedback}</div>
  <footer className="atlas3b-footer"><span>3B INTERNATIONAL</span><p>Des cultures, des liens, des possibilités.</p><RouteLink page="guide" goTo={goTo}>Premiers pas <ArrowUpRight size={14}/></RouteLink></footer>
  <nav className="atlas3b-dock" aria-label="Navigation essentielle 3B">
   <RouteLink page="home" goTo={goTo} aria-current="page"><Globe2 size={20}/><span>Accueil</span></RouteLink>
   <RouteLink page="world3b" goTo={goTo}><Compass size={20}/><span>Monde</span></RouteLink>
   <Button type="button" variant="ghost" className="atlas3b-dock-center" aria-label="Explorer les espaces 3B" onClick={openDirectory}><span>3B</span></Button>
   <RouteLink page="albert" goTo={goTo}><Sparkles size={20}/><span>Albert</span></RouteLink>
   <RouteLink page="member" goTo={goTo}><UserRound size={20}/><span>Profil</span></RouteLink>
  </nav>
  <dialog ref={directoryRef} className="atlas3b-directory" aria-labelledby="atlas3b-directory-title" onClose={()=>setAllOpen(false)}>
   <div className="atlas3b-directory-header"><div><span>À CHAQUE ENVIE, SON ESPACE</span><h2 id="atlas3b-directory-title">Tous les espaces.</h2><p>Tes passions, tes projets et ton quotidien. Choisis ton point de départ.</p></div>
    <Button type="button" variant="ghost" aria-label="Fermer les espaces" onClick={closeDirectory}><X size={24}/></Button>
   </div>
   <div className="atlas3b-directory-filters" role="group" aria-label="Filtrer les espaces">
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
