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

export default function HomePage({goTo,menuItems,member,installation}){
 const [cityOpen,setCityOpen]=useState(false);
 const { present, policy } = useLuxury();
 const primary=PRIMARY_IDS.map(id=>menuItems.find(item=>item.id===id)).filter(Boolean);
 const secondaryGroups=NAV_GROUPS.map(group=>({
  ...group,
  items:group.ids
   .filter(id=>!PRIMARY_IDS.includes(id)&&id!==GUIDE_ID)
   .map(id=>menuItems.find(item=>item.id===id))
   .filter(item=>item&&item.status!=='soon'),
 })).filter(group=>group.items.length>0);

 return <section className="home-dashboard home-dashboard-simplified home-app-hub">
  <WorldPortalCard goTo={goTo}/>

  <section className="universe-directory home-primary-directory" aria-labelledby="journey-title">
   <div className="section-heading"><h2 id="journey-title">L’essentiel</h2><span>Ton espace 3B</span></div>
   <div className="universe-grid">{primary.flatMap(item => item.id === 'passport' ? [<SectionCard key={item.id} item={item} goTo={goTo}/>,<CompactCard key="city" as="button" type="button" onClick={()=>{present("portal");setCityOpen(true);}} className="universe-card city-essential-card" eyebrow="NEXUS 3B" title="Créer ma ville" description="Ouvre le portail de ta cité personnelle." action="Entrer" icon={<Building2 size={22}/>}/>] : [<SectionCard key={item.id} item={item} goTo={goTo}/>])}</div>
  </section>

  <section className="universe-directory" aria-labelledby="directory-title">
   <div className="section-heading"><h2 id="directory-title">Explorer 3B</h2></div>
   {secondaryGroups.map(group=><section className="universe-group" key={group.title} aria-label={group.title}>
    <h2>{group.title}</h2>
    <div className="universe-grid">{group.items.map(item=><SectionCard key={item.id} item={item} goTo={goTo}/>)}</div>
   </section>)}
  </section>

  <section className="home-guide-zone" aria-labelledby="home-guide-title">
   <div><h2 id="home-guide-title">Tes premiers pas</h2><p>Passeport, Coins, XP : retrouve tes repères.</p></div>
   <Button as={RouteLink} page="guide" goTo={goTo} variant="ghost" className="home-guide-button">Comprendre l’écosystème 3B <span aria-hidden="true">↗</span></Button>
  </section>

  <PassportNexus open={cityOpen} onClose={()=>setCityOpen(false)} reducedMotion={!policy.animate}/>
 </section>;
}
