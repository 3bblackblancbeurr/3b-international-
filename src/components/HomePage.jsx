import { ArrowRight, ArrowUpRight } from "lucide-react";
import { NAV_GROUPS, RouteLink, SectionIcon } from "./AppNavigation.jsx";

export default function HomePage({ goTo, menuItems, member }) {
  const sections = menuItems.filter(item => !["passport", "shop", "member"].includes(item.id));
  return <section className="home-dashboard">
    <div className="welcome-hero">
      <div className="welcome-copy">
        <p className="eyebrow"><span className="gold-line" /> BLACK · BLANC · BEUR</p>
        <h1>Un héritage.<br /><em>Ton univers.</em></h1>
        <p className="welcome-description">Une identité, des histoires et un monde à explorer. Entre dans l’univers 3B et écris la suite.</p>
        <RouteLink page={member.isRegistered ? "member" : "passport"} goTo={goTo} className="dashboard-cta">{member.isRegistered ? "Retrouver mon espace" : "Découvrir mon passeport"}<ArrowUpRight size={20} aria-hidden="true" /></RouteLink>
      </div>
      <div className="heritage-art" aria-hidden="true"><span className="heritage-topline">DE ZÉRO À L’INTERNATIONAL</span><span className="heritage-number">3B</span><span className="heritage-bottomline">UNE IDENTITÉ. AUCUNE FRONTIÈRE.</span></div>
    </div>

    <section className="quick-access" aria-labelledby="quick-access-title">
      <div className="section-heading"><h2 id="quick-access-title">À portée de main</h2><span>Ton expérience 3B</span></div>
      <div className="feature-grid">
        <RouteLink page="passport" goTo={goTo} className="feature-link passport-feature"><div className="feature-topline"><SectionIcon page="passport" size={26} /><span>IDENTITÉ DIGITALE</span><ArrowUpRight size={21} /></div><div><h3>Ton passeport 3B</h3><p>{member.isRegistered ? "Retrouve ton identité et ta progression." : "Le premier chapitre de ton aventure."}</p></div><span className="feature-bottom">{member.isRegistered ? "Ouvrir mon passeport" : "Découvrir le passeport"}<ArrowRight size={19} aria-hidden="true" /></span></RouteLink>
        <RouteLink page="shop" goTo={goTo} className="feature-link boutique-feature"><div className="feature-topline"><SectionIcon page="shop" size={26} /><span>LA COLLECTION 3B</span><ArrowUpRight size={21} /></div><div><h3>Porte ton héritage.</h3><p>Découvre l’espace boutique et les prochains drops.</p></div><span className="feature-bottom">Explorer la boutique<ArrowRight size={19} aria-hidden="true" /></span></RouteLink>
      </div>
    </section>

    <section className="explore-section" aria-labelledby="explore-title">
      <div className="section-heading"><h2 id="explore-title">Explore ton univers</h2><span>Choisis ta prochaine destination</span></div>
      {NAV_GROUPS.map(group => {
        const items = group.ids.map(id => sections.find(item => item.id === id)).filter(Boolean);
        return items.length > 0 && <section className="explore-group" key={group.title} aria-label={group.title}><h3>{group.title}</h3><div className="explore-grid">{items.map(item => <RouteLink page={item.id} goTo={goTo} key={item.id} className="explore-link"><span className="explore-icon"><SectionIcon page={item.id} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight size={18} aria-hidden="true" /></RouteLink>)}</div></section>;
      })}
    </section>

    <div className="member-invitation"><div><p className="eyebrow">Ta place dans l’histoire</p><h2>{member.isRegistered ? `Bienvenue, ${member.name || "membre 3B"}.` : "L’aventure commence avec toi."}</h2><p>{member.isRegistered ? "Ton profil, ta progression et tes préférences au même endroit." : "Crée ton profil pour personnaliser ton expérience 3B."}</p></div><RouteLink page="member" goTo={goTo} className="dashboard-secondary">{member.isRegistered ? "Mon espace" : "Créer mon profil"}<ArrowUpRight size={19} aria-hidden="true" /></RouteLink></div>
    <footer className="dashboard-footer"><strong>3B INTERNATIONAL</strong><span>BLACK · BLANC · BEUR</span><RouteLink page="intro" goTo={goTo}>De zéro à l’international <ArrowUpRight size={14} aria-hidden="true" /></RouteLink></footer>
  </section>;
}
