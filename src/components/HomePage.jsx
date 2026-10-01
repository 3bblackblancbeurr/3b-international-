import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import SectionCard from './SectionCard.jsx';
import WorldPortalCard from './WorldPortalCard.jsx';
import {Button} from '../design-system/index.jsx';
import {ArrowDown, ArrowUpRight, Pause, Play} from 'lucide-react';
import UniverseJourney from './UniverseJourney.jsx';
import useSceneMotion from './useSceneMotion.js';

const PRIMARY_IDS = ['passport', 'city3b', 'world3b'];
const GUIDE_ID = 'guide';

export default function HomePage({goTo,menuItems,member,options}){
 const motion=useSceneMotion(options);
 const registered=member?.isRegistered===true;
 const nextPage=registered?'world3b':'passport';
 const nextLabel=registered?'Entrer dans le Monde du 3B':'Activer mon Passeport 3B';
 const primary=PRIMARY_IDS.map(id=>menuItems.find(item=>item.id===id)).filter(Boolean);
 const secondaryGroups=NAV_GROUPS.map(group=>({
  ...group,
  items:group.ids
   .filter(id=>!PRIMARY_IDS.includes(id)&&id!==GUIDE_ID)
   .map(id=>menuItems.find(item=>item.id===id))
   .filter(Boolean),
 })).filter(group=>group.items.length>0);

 return <section className="home-dashboard cinematic-home" data-motion={motion.playing?'running':'paused'}>
  <div className="welcome-hero cinematic-welcome" ref={motion.ref}>
   <div className="cinematic-aurora" aria-hidden="true"><i/><i/></div>
   <div className="welcome-copy">
    <p className="eyebrow cinematic-kicker"><span/>BLACK • BLANC • BEUR</p>
    <h1>Différents horizons.<br/><em>Un même univers.</em></h1>
    <p className="welcome-description">Ton identité. Ta création. Ton aventure.<br/>Entre dans 3B et écris la suite.</p>
    <div className="home-hero-actions">
     <Button as={RouteLink} page={nextPage} goTo={goTo} variant="champagne" className="dashboard-cta">{nextLabel}<ArrowUpRight size={18}/></Button>
     <a className="cinematic-explore" href="#journey-title" onClick={event=>{event.preventDefault();const target=document.getElementById('journey-title');target?.scrollIntoView({behavior:motion.allowed?'smooth':'auto',block:'start'});target?.focus({preventScroll:true});}}>Découvrir les espaces <ArrowDown size={16}/></a>
    </div>
    <div className="home-manifesto"><span>01 / PASSEPORT</span><span>02 / MA VILLE</span><span>03 / MONDE DU 3B</span><span>04 / EXPLORER 3B</span></div>
   </div>
   <div className="cinematic-window">
    <picture><source media="(max-width: 720px)" srcSet="/nexus/cinema-v1/hall-mobile.webp"/><img src="/nexus/cinema-v1/hall.webp" alt="Le Cercle Brisé au centre des huit portes du Monde du 3B" width="941" height="1116" fetchPriority="high" decoding="async"/></picture>
    <div className="cinematic-window-light" aria-hidden="true"/>
    <div className="cinematic-scene-caption"><span>LE MONDE DU 3B</span><strong>La mémoire nous relie.</strong><small>Cité des Huit Héritages</small></div>
    <div className="cinematic-motion-control">{motion.allowed?<Button variant="ghost" size="sm" onClick={motion.toggle} aria-pressed={motion.paused} aria-label={motion.paused?'Reprendre les animations':'Mettre les animations en pause'}>{motion.paused?<Play size={14}/>:<Pause size={14}/>}<span>{motion.paused?'Reprendre':'Pause'}</span></Button>:<span>Animations réduites</span>}</div>
   </div>
  </div>

  <section className="universe-directory home-primary-directory" aria-labelledby="journey-title">
   <div className="section-heading"><div><p className="eyebrow">À TOI DE CHOISIR</p><h2 id="journey-title" tabIndex={-1}>Trois chemins. Ton histoire.</h2></div><span>Ton identité · Ta ville · Ton aventure</span></div>
   <div className="journey-grid">{primary.map(item=><UniverseJourney key={item.id} item={item} goTo={goTo}/>)}</div>
  </section>

  <WorldPortalCard goTo={goTo}/>

  <section className="universe-directory" aria-labelledby="directory-title">
   <div className="section-heading"><div><p className="eyebrow">L’ÉCOSYSTÈME</p><h2 id="directory-title">Explorer 3B</h2></div><span>Des rencontres, des créations, des découvertes.</span></div>
   {secondaryGroups.map(group=><section className="universe-group" key={group.title} aria-label={group.title}>
    <h2>{group.title}</h2>
    <div className="universe-grid">{group.items.map(item=><SectionCard key={item.id} item={item} goTo={goTo}/>)}</div>
   </section>)}
  </section>

  <section className="home-guide-zone" aria-labelledby="home-guide-title">
   <div><p className="eyebrow">REPÈRES & PROGRESSION</p><h2 id="home-guide-title">Besoin de comprendre l’écosystème 3B ?</h2><p>Retrouve le fonctionnement du Passeport, des espaces, des gains et de la progression dans un seul guide.</p></div>
   <Button as={RouteLink} page="guide" goTo={goTo} variant="champagne" className="home-guide-button">Comprendre l’écosystème 3B <span aria-hidden="true">↗</span></Button>
  </section>

  <footer className="dashboard-footer"><strong>3B INTERNATIONAL</strong><span>BLACK · BLANC · BEUR</span><RouteLink page="intro" goTo={goTo}>Revoir l’introduction</RouteLink></footer>
 </section>;
}
