import {useState} from 'react';
import {ArrowDownRight,ArrowRight,BookOpen,Compass,Gamepad2,Globe2,HeartPulse,Menu,Pause,Play,Plus,Minus,RotateCcw,ScanLine,Search,ShoppingBag,Sparkles,Users} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';
import {Button} from '../design-system/index.jsx';
import {WORLD_REALMS} from './world-living-data.js';
import AdaptiveHeritageGlobe from './AdaptiveHeritageGlobe.jsx';
import '../styles/immersive-master-v2.css';

function openAppMenu(category='principal',search=false){
 window.dispatchEvent(new CustomEvent('threeb:open-app-menu',{detail:{category,search}}));
}
const shortcuts=[
 {id:'world3b',name:'Monde du 3B',Icon:Globe2},
 {id:'health',name:'Santé',Icon:HeartPulse},
 {id:'games',name:'Jeux 3B',Icon:Gamepad2},
 {id:'albert',name:'Albert APEX',Icon:Sparkles},
];
export default function ImmersiveWorldHome({goTo}){
 const [realmIndex,setRealmIndex]=useState(0);
 const [paused,setPaused]=useState(false);
 const [zoom,setZoom]=useState(1);
 const realm=WORLD_REALMS[realmIndex];
 function selectRealm(id){const index=WORLD_REALMS.findIndex(r=>r.id===id);if(index>=0)setRealmIndex(index);}
 return <section className="th-world-screen" aria-label="3B International — expérience immersive" data-motion-paused={paused}>
  <div className="th-world-environment" aria-hidden="true"/>
  <div className="th-world-aura" aria-hidden="true"/>
  <header className="th-world-header">
   <span className="th-world-wordmark" aria-label="3B International"><strong>3B</strong><span>INTERNATIONAL<small>BLACK · BLANC · BEUR</small></span></span>
   <span className="th-world-header-center">8 HÉRITAGES <span aria-hidden="true">✦</span> 1 MONDE</span>
   <Button variant="ghost" type="button" className="th-world-menu-launch" onClick={()=>openAppMenu('principal')} aria-label="Ouvrir tous les univers 3B"><Menu size={22}/><span>LE MENU</span><i aria-hidden="true"/></Button>
  </header>

  <div className="th-world-title-block">
   <span className="th-world-kicker"><span className="th-world-spark"/> LE CERCLE VIVANT · 3B WORLD</span>
   <h1>Un monde<span>sans frontières.</span></h1>
   <p>Huit héritages. Des horizons infinis. Le tien commence ici.</p>
   <Button variant="ghost" type="button" className="th-world-explore" onClick={()=>openAppMenu('principal')}>
    Explorer les univers <ArrowDownRight size={19}/>
   </Button>
  </div>

  <div className="th-world-cosmos" aria-label="Terre interactive">
   <div className="th-world-orbit th-world-orbit--gold" aria-hidden="true"/>
   <div className="th-world-orbit th-world-orbit--blue" aria-hidden="true"/>
   <div className="th-world-planetsheen" aria-hidden="true"/>
   <AdaptiveHeritageGlobe selectedId={realm.id} onSelect={selectRealm} paused={paused} zoom={zoom}/>
   <div className="th-world-globe-insignia" aria-hidden="true">3B</div>
  </div>

  <aside className="th-world-realm-insight" aria-label="Royaume sélectionné">
   <span className="th-world-insight-kicker">LES HUIT ROYAUMES</span>
   <p className="th-world-realm-number">0{realmIndex+1} <span>/ 08</span></p>
   <h2><span aria-hidden="true">{realm.flag}</span> {realm.name}</h2>
   <p>{realm.value} <span aria-hidden="true">—</span> {realm.guardian}</p>
   <RouteLink page="world3b" goTo={goTo} className="th-world-realm-entry">Entrer dans le Monde du 3B <ArrowRight size={18}/></RouteLink>
   <div className="th-world-realm-mover" aria-label="Parcourir les royaumes">
    <Button variant="ghost" type="button" aria-label="Royaume précédent" onClick={()=>setRealmIndex(i=>(i+7)%8)}>←</Button>
    <span>CHANGER DE ROYAUME</span>
    <Button variant="ghost" type="button" aria-label="Royaume suivant" onClick={()=>setRealmIndex(i=>(i+1)%8)}>→</Button>
   </div>
  </aside>

  <div className="th-world-earth-controls" role="group" aria-label="Contrôles de la planète">
   <Button variant="ghost" type="button" aria-label="Agrandir la planète" onClick={()=>setZoom(n=>Math.min(1.34,Math.round((n+.12)*100)/100))} disabled={zoom>=1.34}><Plus size={19}/></Button>
   <Button variant="ghost" type="button" aria-label="Réduire la planète" onClick={()=>setZoom(n=>Math.max(.8,Math.round((n-.12)*100)/100))} disabled={zoom<=.8}><Minus size={19}/></Button>
   <Button variant="ghost" type="button" aria-label="Réinitialiser le zoom" onClick={()=>setZoom(1)} disabled={zoom===1}><RotateCcw size={18}/></Button>
   <Button variant="ghost" type="button" aria-label={paused?'Relancer la rotation':'Mettre la rotation en pause'} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={19}/>:<Pause size={19}/>}</Button>
  </div>

  <nav className="th-world-realms-line" aria-label="Choisir un royaume">
   {WORLD_REALMS.map((item,i)=><Button variant="ghost" key={item.id} type="button" aria-label={'Choisir le royaume '+item.name} aria-pressed={i===realmIndex} onClick={()=>selectRealm(item.id)}>
    <span className="th-world-realm-dot" aria-hidden="true">{item.flag}</span><span className="th-world-realm-label">{item.name}</span>
   </Button>)}
  </nav>

  <footer className="th-world-foot">
   <span>LA TERRE EST À NOUS TOUS <span aria-hidden="true">✦</span> 3B INTERNATIONAL</span>
   <span>Terre : <a href="https://svs.gsfc.nasa.gov/2915/" target="_blank" rel="noopener noreferrer">NASA / GSFC</a> · Royaumes 3B fictifs</span>
  </footer>

  <nav className="th-world-quicknav" aria-label="Accès direct 3B">
   {shortcuts.map(({id,name,Icon})=><RouteLink page={id} goTo={goTo} key={id} aria-label={name}><Icon size={21} strokeWidth={1.7}/><span>{name}</span></RouteLink>)}
   <Button variant="ghost" type="button" onClick={()=>openAppMenu('principal')} aria-label="Afficher toutes les rubriques 3B"><Compass size={23} strokeWidth={1.6}/><span>Tous les univers</span></Button>
  </nav>
 </section>;
}
