import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import SectionCard from './SectionCard.jsx';
import InstallApp from '../install/InstallApp.jsx';
export default function HomePage({goTo,menuItems,installation}){
 const sections=NAV_GROUPS.flatMap(group=>group.ids).map(id=>menuItems.find(item=>item.id===id)).filter(Boolean);
 return <section className="home-dashboard">
  <div className="welcome-hero"><div className="welcome-copy"><p className="eyebrow brand-glow-badge">BLACK • BLANC • BEUR</p><h1>Un héritage.<br/><em>Ton univers.</em></h1><p className="welcome-description">Crée. Explore. Partage. Un seul menu pour retrouver tout ce qui fait le 3B.</p><div className="home-manifesto"><span>01 / TON IDENTITÉ</span><span>02 / TES AVENTURES</span><span>03 / LE COLLECTIF</span></div></div><div className="heritage-poster"><img src="/background.png" alt="Affiche officielle 3B International : un héritage, de zéro à l’international"/><span>DE ZÉRO À L’INTERNATIONAL</span></div></div>
  <InstallApp installation={installation} />
  <section className="universe-directory" aria-labelledby="directory-title"><div className="section-heading"><h2 id="directory-title">Tout ton univers, au même endroit.</h2><span>{sections.length} rubriques · une destination par carte</span></div>
   {NAV_GROUPS.map(group=>{const items=group.ids.map(id=>sections.find(item=>item.id===id)).filter(Boolean);return items.length>0&&<section className="universe-group" key={group.title} aria-label={group.title}><h2>{group.title}</h2><div className="universe-grid">{items.map(item=><SectionCard key={item.id} item={item} index={sections.indexOf(item)} goTo={goTo}/>)}</div></section>;})}
  </section><footer className="dashboard-footer"><strong>3B INTERNATIONAL</strong><span>BLACK · BLANC · BEUR</span><RouteLink page="intro" goTo={goTo}>Revoir l’introduction</RouteLink></footer>
 </section>;
}
