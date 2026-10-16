import {useState} from 'react';
import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import LivingWorldHome from './LivingWorldHome.jsx';
import SectionCard from './SectionCard.jsx';
import WorldPortalCard from './WorldPortalCard.jsx';
import { ScanLine, ArrowUpRight, Compass } from 'lucide-react';
import {Button} from '../design-system/index.jsx';

const GUIDE_ID = 'guide';

export default function HomePage({goTo,menuItems,member,installation}){
 const [legacyOpen,setLegacyOpen]=useState(false);
 const secondaryGroups=NAV_GROUPS.map(group=>({
  ...group,
  items:group.ids
   .filter(id=>id!==GUIDE_ID&&id!=='world3b'&&id!=='invisible')
   .map(id=>menuItems.find(item=>item.id===id))
   .filter(item=>item&&item.status!=='soon'),
 })).filter(group=>group.items.length>0);

 return <section className="home-dashboard home-dashboard-simplified home-app-hub">
  <LivingWorldHome goTo={goTo} menuItems={menuItems}/>
  <div className="home-entry-actions"><RouteLink page="scanner" goTo={goTo} className="home-scanner-direct"><ScanLine size={24} aria-hidden="true"/><span><strong>Ouvrir le scanner</strong><small>Faire apparaître une scène autour de toi</small></span><ArrowUpRight size={20} aria-hidden="true"/></RouteLink></div>
  <details className="world3b-legacy-archive" onToggle={e=>setLegacyOpen(e.currentTarget.open)}><summary>Retrouver les expériences classiques 3B et les autres espaces</summary>
  {legacyOpen && <>
  <WorldPortalCard goTo={goTo}/>
  <RouteLink page="maintenant" goTo={goTo} className="threeb-now-entry"><Compass className="threeb-now-entry-icon" size={34} strokeWidth={1.4}/><span className="threeb-now-entry-copy"><small>3B MAINTENANT · NOUVEAU</small><strong>Et si ta journée commençait ici ?</strong><span>Apprendre, bouger, aider, explorer, transmettre — à ton rythme.</span></span><ArrowUpRight className="threeb-now-entry-arrow" size={25}/></RouteLink>

  <section className="universe-directory" aria-label="Les espaces 3B">
   {secondaryGroups.map(group=><section className="universe-group" key={group.title} aria-label={group.title}>
    <h2>{group.title}</h2>
    <div className="universe-grid">{group.items.map(item=><SectionCard key={item.id} item={item} goTo={goTo}/>)}</div>
   </section>)}
  </section>

  </>}
  </details>

  <section className="home-guide-zone" aria-labelledby="home-software-title">
   <div><h2 id="home-software-title">Logiciels 3B</h2><p>Images en lot et outils pour créateurs.</p></div>
   <Button as="a" href="/logiciels-3b.html" variant="ghost" className="home-guide-button">Découvrir les logiciels <span aria-hidden="true">↗</span></Button>
  </section>

  <section className="home-guide-zone" aria-labelledby="home-guide-title">
   <div><h2 id="home-guide-title">Besoin d’un repère ?</h2></div>
   <Button as={RouteLink} page="guide" goTo={goTo} variant="ghost" className="home-guide-button">Le guide 3B <span aria-hidden="true">↗</span></Button>
  </section>

 </section>;
}
