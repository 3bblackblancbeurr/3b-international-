import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import SectionCard from './SectionCard.jsx';
import WorldPortalCard from './WorldPortalCard.jsx';
import {Button} from '../design-system/index.jsx';

const PRIMARY_IDS = ['passport', 'city3b', 'world3b'];
const GUIDE_ID = 'guide';

export default function HomePage({goTo,menuItems,member}){
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

 return <section className="home-dashboard">
  <div className="welcome-hero welcome-hero-single">
   <div className="welcome-copy">
    <p className="eyebrow brand-glow-badge">BLACK • BLANC • BEUR</p>
    <h1>Un héritage.<br/><em>Ton univers.</em></h1>
    <p className="welcome-description">Ton Passeport porte ton identité. Crée ta ville, accueille ses habitants et explore le Monde du 3B depuis la Cité des Huit Héritages.</p>
    <div className="home-hero-actions">
     <Button as={RouteLink} page={nextPage} goTo={goTo} variant="champagne" className="dashboard-cta">{nextLabel}<span aria-hidden="true">→</span></Button>
    </div>
    <div className="home-manifesto"><span>01 / PASSEPORT</span><span>02 / MA VILLE</span><span>03 / MONDE DU 3B</span><span>04 / EXPLORER 3B</span></div>
   </div>
  </div>

  <WorldPortalCard goTo={goTo}/>

  <section className="universe-directory home-primary-directory" aria-labelledby="journey-title">
   <div className="section-heading"><h2 id="journey-title">L’essentiel</h2><span>Ton identité · Ta ville · Ton aventure</span></div>
   <div className="universe-grid">{primary.map(item=><SectionCard key={item.id} item={item} goTo={goTo}/>)}</div>
  </section>

  <section className="universe-directory" aria-labelledby="directory-title">
   <div className="section-heading"><h2 id="directory-title">Explorer 3B</h2><span>Des espaces rangés par usage</span></div>
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
