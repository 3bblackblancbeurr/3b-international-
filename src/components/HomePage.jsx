import { NAV_GROUPS, RouteLink } from './AppNavigation.jsx';
import SectionCard from './SectionCard.jsx';

const PRIMARY_IDS = ['passport', 'world3b', 'shop'];

export default function HomePage({goTo,menuItems}){
 const primary=PRIMARY_IDS.map(id=>menuItems.find(item=>item.id===id)).filter(Boolean);
 const secondary=NAV_GROUPS.flatMap(group=>group.ids).filter(id=>!PRIMARY_IDS.includes(id)).map(id=>menuItems.find(item=>item.id===id)).filter(Boolean);
 return <section className="home-dashboard">
  <div className="welcome-hero"><div className="welcome-copy"><p className="eyebrow brand-glow-badge">BLACK • BLANC • BEUR</p><h1>Un héritage.<br/><em>Ton univers.</em></h1><p className="welcome-description">Entre par ton Passeport, rejoins le Monde du 3B, puis retrouve la Boutique. Les autres espaces restent accessibles juste après.</p><div className="home-manifesto"><span>01 / PASSEPORT</span><span>02 / MONDE DU 3B</span><span>03 / BOUTIQUE</span></div></div><div className="heritage-poster"><img src="/background.png" alt="Affiche officielle 3B International : un héritage, de zéro à l’international"/><span>DE ZÉRO À L’INTERNATIONAL</span></div></div>
  <section className="universe-directory" aria-labelledby="journey-title"><div className="section-heading"><h2 id="journey-title">Ton parcours principal</h2><span>Accueil → Passeport → Monde du 3B → Boutique</span></div><div className="universe-grid">{primary.map((item,index)=><SectionCard key={item.id} item={item} index={index} goTo={goTo}/>)}</div></section>
  <section className="universe-directory" aria-labelledby="directory-title"><div className="section-heading"><h2 id="directory-title">Explorer le reste de 3B</h2><span>{secondary.length} rubriques complémentaires</span></div>
   {NAV_GROUPS.map(group=>{const items=group.ids.filter(id=>!PRIMARY_IDS.includes(id)).map(id=>secondary.find(item=>item.id===id)).filter(Boolean);return items.length>0&&<section className="universe-group" key={group.title} aria-label={group.title}><h2>{group.title}</h2><div className="universe-grid">{items.map(item=><SectionCard key={item.id} item={item} index={secondary.indexOf(item)} goTo={goTo}/>)}</div></section>;})}
  </section><footer className="dashboard-footer"><strong>3B INTERNATIONAL</strong><span>BLACK · BLANC · BEUR</span><RouteLink page="intro" goTo={goTo}>Revoir l’introduction</RouteLink></footer>
 </section>;
}
