import { useState } from 'react';
import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import SectionCard from './SectionCard.jsx';
import WorldPortalCard from './WorldPortalCard.jsx';
import CompactCard from './CompactCard.jsx';
import PassportNexus from './PassportNexus.jsx';
import { useLuxury } from '../design-system/LuxuryExperience.jsx';
import { Building2 } from 'lucide-react';
import {Button} from '../design-system/index.jsx';

const PRIMARY_IDS = ['passport', 'world3b'];
const GUIDE_ID = 'guide';

export default function HomePage({goTo,menuItems,member}){
 const [cityOpen,setCityOpen]=useState(false);
 const { present, policy } = useLuxury();
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
    <p className="luxury-edition">3B INTERNATIONAL <span>UNIVERS DIGITAL</span></p>
    <p className="eyebrow brand-glow-badge">BLACK • BLANC • BEUR</p>
    <h1>Un héritage.<br/><em>Ton univers.</em></h1>
    <p className="welcome-description">Des racines. Des rencontres. Des mondes à construire. Entre dans une histoire qui porte la tienne.</p>
    <div className="home-hero-actions">
     <Button as={RouteLink} page={nextPage} goTo={goTo} variant="champagne" className="dashboard-cta">{nextLabel}<span aria-hidden="true">→</span></Button>
    </div>
    <div className="home-manifesto"><span>01 / PASSEPORT</span><span>02 / MA VILLE</span><span>03 / MONDE DU 3B</span><span>04 / EXPLORER 3B</span></div>
   </div>
   <div className="luxury-hero-art">
    <picture><source media="(max-width: 720px)" srcSet="/nexus/cinema-v1/hall-mobile.webp"/><img src="/nexus/cinema-v1/hall.webp" width="941" height="1116" alt="Le Cercle Brisé au cœur du Nexus, entouré des huit héritages" fetchPriority="high"/></picture>
    <div className="luxury-hero-art-caption"><span>LE CERCLE BRISÉ</span><strong>Nos différences.<br/>Notre force.</strong></div>
   </div>
  </div>

  <div className="luxury-manifesto-line"><span>01 — IDENTITÉ</span><p>Ce n’est pas une marque. <em>C’est un héritage.</em></p><span>08 — HÉRITAGES</span></div>

  <WorldPortalCard goTo={goTo}/>

  <section className="universe-directory home-primary-directory" aria-labelledby="journey-title">
   <div className="section-heading"><h2 id="journey-title">L’essentiel</h2><span>Passeport → Ma Ville → Monde du 3B</span></div>
   <div className="universe-grid">{primary.flatMap(item => item.id === 'passport' ? [<SectionCard key={item.id} item={item} goTo={goTo}/>,<CompactCard key="city" as="button" type="button" onClick={()=>{present("portal");setCityOpen(true);}} className="universe-card city-essential-card" eyebrow="NEXUS 3B" title="Créer ma ville" description="Ouvre le portail de ta cité personnelle." action="Entrer" icon={<Building2 size={22}/>}/>] : [<SectionCard key={item.id} item={item} goTo={goTo}/>])}</div>
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
  <PassportNexus open={cityOpen} onClose={()=>setCityOpen(false)} reducedMotion={!policy.animate}/>
 </section>;
}
