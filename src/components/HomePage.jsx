import { useState } from 'react';
import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import SectionCard from './SectionCard.jsx';
import WorldPortalCard from './WorldPortalCard.jsx';
import CompactCard from './CompactCard.jsx';
import PassportNexus from './PassportNexus.jsx';
import { useLuxury } from '../design-system/LuxuryExperience.jsx';
import { Building2, ScanLine, ArrowUpRight } from 'lucide-react';
import {Button} from '../design-system/index.jsx';

const GUIDE_ID = 'guide';

export default function HomePage({goTo,menuItems,member,installation}){
 const [cityOpen,setCityOpen]=useState(false);
 const { present, policy } = useLuxury();
 const secondaryGroups=NAV_GROUPS.map(group=>({
  ...group,
  items:group.ids
   .filter(id=>id!==GUIDE_ID&&id!=='world3b'&&id!=='invisible')
   .map(id=>menuItems.find(item=>item.id===id))
   .filter(item=>item&&item.status!=='soon'),
 })).filter(group=>group.items.length>0);

 return <section className="home-dashboard home-dashboard-simplified home-app-hub">
  <div className="home-entry-actions"><RouteLink page="scanner" goTo={goTo} className="home-scanner-direct"><ScanLine size={24} aria-hidden="true"/><span><strong>Ouvrir le scanner</strong><small>Faire apparaître une scène autour de toi</small></span><ArrowUpRight size={20} aria-hidden="true"/></RouteLink></div>
  <WorldPortalCard goTo={goTo}/>

  <section className="universe-directory" aria-label="Les espaces 3B">
   {secondaryGroups.map(group=><section className="universe-group" key={group.title} aria-label={group.title}>
    <h2>{group.title}</h2>
    <div className="universe-grid">{group.items.map(item=><SectionCard key={item.id} item={item} goTo={goTo}/>)}{group.title==='Univers 3B'&&<CompactCard as="button" type="button" onClick={()=>{present("portal");setCityOpen(true);}} className="universe-card city-essential-card" title="Créer ma ville" action="Entrer" icon={<Building2 size={22}/>}/>}</div>
   </section>)}
  </section>

  <section className="home-guide-zone" aria-labelledby="home-guide-title">
   <div><h2 id="home-guide-title">Besoin d’un repère ?</h2></div>
   <Button as={RouteLink} page="guide" goTo={goTo} variant="ghost" className="home-guide-button">Le guide 3B <span aria-hidden="true">↗</span></Button>
  </section>

  <PassportNexus open={cityOpen} onClose={()=>setCityOpen(false)} reducedMotion={!policy.animate}/>
 </section>;
}
