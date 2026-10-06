import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Boxes, CreditCard, Gamepad2, Globe2, Home, Menu, Compass, Search, ShoppingBag, Sparkles, Trophy, UserRound, Users, LockKeyhole, X, Fingerprint } from "lucide-react";
import { getPageHref } from "../lib/navigation.js";
import CompactCard from './CompactCard.jsx';
import { ExperienceControls } from "../design-system/LuxuryExperience.jsx";
import { Button } from "../design-system/index.jsx";
import InstallApp from "../install/InstallApp.jsx";
import SecretClock from "../secret/SecretClock.jsx";
import CompanionPresenceControl from '../companion/CompanionPresenceControl.jsx';
import BrokenCircle3D from './BrokenCircle3D.jsx';

const ICONS = { home: Home, passport: Fingerprint, loyalty: CreditCard, manga: BookOpen, world3b: Globe2, nosbloc: Boxes, games: Gamepad2, religion: BookOpen, guide: Compass, community: Users, secret: LockKeyhole, sport: Trophy, ia: Sparkles, shop: ShoppingBag, member: UserRound };
export function SectionIcon({ page, ...props }) {
  const Icon = ICONS[page] || Globe2;
  return <Icon size={22} strokeWidth={1.65} aria-hidden="true" {...props} />;
}

export const NAV_GROUPS = [
  { title: "Identité & progression", ids: ["passport", "member"] },
  { title: "Univers 3B", ids: ["world3b", "secret"] },
  { title: "Services & avantages", ids: ["shop", "control"] },
  { title: "En préparation", ids: ["nosbloc", "games", "manga", "religion", "sport", "community", "ia"] },
  { title: "Comprendre 3B", ids: ["guide"] },
];

export function RouteLink({ page, goTo, children, ...props }) {
  return <a href={getPageHref(page)} onClick={(event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(page);
  }} {...props}>{children}</a>;
}

const QUICK_LINKS = [
  { id: "home", label: "Accueil" },
  { id: "passport", label: "Passeport" },
  { id: "world3b", label: "Monde 3B" },
  { id: "shop", label: "Boutique" },
];

const MOBILE_MENU_ORDER = ["passport", "world3b", "shop", "member", "control", "secret", "guide"];

export default function AppNavigation({ page, title, menuItems, goTo, secret, options, toggleOption, installation }) {
  const dialog = useRef(null), searchInput = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const activePage = page.startsWith("ia-") ? "ia" : page;
  const allItems = menuItems;

  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const matching = allItems.filter(item => normalize(`${item.label} ${item.description}`).includes(normalize(query.trim())));
  const mobileMenuItems = MOBILE_MENU_ORDER
    .map(id => matching.find(item => item.id === id))
    .filter(item => item && item.status !== "soon");

  useEffect(() => { dialog.current?.close(); }, [page]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    const shortcut = event => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (event.target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      event.preventDefault();
      if (!dialog.current?.open) openMenu();
      else searchInput.current?.focus();
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  // The native modal makes the background inert. Avoid an additional body
  // overflow lock: on mobile it can survive a route change or another modal
  // closing and leave the entire application unable to scroll.

  function openMenu() {
    setQuery("");
    if (!dialog.current?.open) dialog.current?.showModal();
    setIsOpen(true);
    // Focusing search on a phone opens the keyboard over the menu and shrinks
    // its scroll area before the user has chosen to search.
    if (!window.matchMedia("(max-width: 720px)").matches) {
      requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
    }
  }
  function navigate(nextPage) {
    dialog.current.close();
    goTo(nextPage);
  }
  return <>
    <a className="skip-link" href="#main-content" onClick={event => {
      event.preventDefault();
      document.getElementById("main-content")?.focus();
    }}>Aller au contenu</a>
    <header className="site-header">
      <RouteLink page="home" goTo={goTo} className="brand-link" aria-label="3B International — Accueil">
        <span className="brand-wordmark" aria-hidden="true">3B</span>
        <span className="brand-name">INTERNATIONAL</span>
      </RouteLink>
      <nav className="desktop-navigation" aria-label="Navigation principale">
        {QUICK_LINKS.map(item => <RouteLink key={item.id} page={item.id} goTo={goTo} aria-current={page === item.id ? "page" : undefined}>{item.label}</RouteLink>)}
      </nav>
      <div className="header-actions">{options && <ExperienceControls options={options} toggleOption={toggleOption} page={page}/>}<span className="network-status is-offline" role="status" hidden={online}>Hors ligne</span><Button variant="ghost" className="menu-trigger" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen} aria-keyshortcuts="/"><Menu size={20} aria-hidden="true" /><span>Menu</span></Button></div>
    </header>
    {page !== "home" && <div className="page-breadcrumb"><RouteLink page="home" goTo={goTo}><ArrowLeft size={16} aria-hidden="true" /> Accueil</RouteLink><span aria-hidden="true">/</span><span>{title}</span></div>}
    <nav className="mobile-navigation" aria-label="Navigation mobile">
      {QUICK_LINKS.map(item => <RouteLink key={item.id} page={item.id} goTo={goTo} aria-current={page === item.id ? "page" : undefined}><SectionIcon page={item.id} /><span>{item.label}</span></RouteLink>)}
      <button type="button" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen} className={!QUICK_LINKS.some(item => item.id === page) ? "section-active" : undefined}><Menu size={22} strokeWidth={1.65} aria-hidden="true" /><span>Menu</span></button>
    </nav>
    <dialog id="universe-menu" ref={dialog} className="universe-dialog menu-master-dialog" aria-labelledby="menu-title" onClose={() => setIsOpen(false)} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); dialog.current.close(); }
      if (event.key === "Tab") {
        const targets = [...dialog.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')].filter(element => element.getClientRects().length);
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }} onClick={event => {
      if (event.target !== dialog.current) return;
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
    }}>
      <div className="menu-master-shell">
        <div className="dialog-heading menu-master-heading">
          <div className="menu-master-brandline">
            <span className="menu-master-monogram" aria-hidden="true">3B</span>
            <div className="menu-master-titleblock">
              <p className="eyebrow">3B INTERNATIONAL · INTERFACE 2026</p>
              <h2 id="menu-title">Ton univers. Un seul centre.</h2>
              <p className="menu-master-legacy">Black · Blanc · Beur — Héritage, unité, création.</p>
            </div>
          </div>
          <button className="icon-button menu-master-close" type="button" autoFocus aria-label="Fermer le menu" onClick={() => dialog.current.close()}><X size={23} aria-hidden="true" /></button>
        </div>

        <div className="menu-master-main">
          <section className="menu-master-visual" aria-label="Signature visuelle 3B">
            <div className="menu-master-visual-copy">
              <p className="eyebrow">CERCLE BRISÉ · MONUMENT VIVANT</p>
              <h3>L’héritage<br/><em>en mouvement.</em></h3>
              <p>Le Cercle Brisé tourne réellement en 3D. Le cœur 3B reste fixe.</p>
            </div>

            <div className="menu-master-circle-stage" aria-hidden="true">
              <span className="menu-master-orbit menu-master-orbit-a" />
              <span className="menu-master-orbit menu-master-orbit-b" />
              <span className="menu-master-orbit menu-master-orbit-c" />
              <BrokenCircle3D variant="menu"/>
              <div className="menu-master-core">
                <strong>3B</strong>
                <span>BLACK · BLANC · BEUR</span>
              </div>
              <span className="menu-master-axis menu-master-axis-n">HÉRITAGE</span>
              <span className="menu-master-axis menu-master-axis-e">UNITÉ</span>
              <span className="menu-master-axis menu-master-axis-s">AVENIR</span>
              <span className="menu-master-axis menu-master-axis-w">LIBERTÉ</span>
            </div>

            <div className="menu-master-heritage-band" aria-hidden="true">
              <span><b>01</b> HÉRITAGE</span>
              <span><b>02</b> UNITÉ</span>
              <span><b>03</b> CRÉATION</span>
            </div>
          </section>

          <section className="menu-mobile-master" aria-label="Menu général mobile 3B">
            <div className="menu-mobile-kicker">
              <span>MENU GÉNÉRAL</span>
              <small>{online ? "LIVE" : "LOCAL"}</small>
            </div>

            <div className="menu-mobile-grid">
              {mobileMenuItems.map(item => (
                <RouteLink
                  key={item.id}
                  page={item.id}
                  goTo={navigate}
                  className="menu-mobile-tile"
                  aria-current={activePage === item.id ? "page" : undefined}
                >
                  <span className="menu-mobile-tile-icon"><SectionIcon page={item.id}/></span>
                  <span className="menu-mobile-tile-copy">
                    <strong>{item.label}</strong>
                    <small>{item.id === "passport" ? "TON IDENTITÉ 3B"
                      : item.id === "world3b" ? "ENTRER DANS LE MONDE"
                      : item.id === "shop" ? "COLLECTIONS 3B"
                      : item.id === "member" ? "TON ESPACE"
                      : item.id === "control" ? "CENTRE PRIVÉ"
                      : item.id === "secret" ? "SIGNAL DU JOUR"
                      : "COMPRENDRE 3B"}</small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true"/>
                </RouteLink>
              ))}
            </div>

            <div className="menu-mobile-secret">
              <SecretClock secret={secret} goTo={navigate} compact />
            </div>

            <nav className="menu-mobile-dock" aria-label="Accès rapides 3B">
              <RouteLink page="home" goTo={navigate} aria-label="Accueil"><Home size={19}/><span>Accueil</span></RouteLink>
              <RouteLink page="passport" goTo={navigate} aria-label="Passeport"><Fingerprint size={19}/><span>Passeport</span></RouteLink>
              <button type="button" className="menu-mobile-dock-core" onClick={() => dialog.current.close()} aria-label="Fermer le menu 3B"><strong>3B</strong></button>
              <RouteLink page="world3b" goTo={navigate} aria-label="Monde 3B"><Globe2 size={19}/><span>Monde</span></RouteLink>
              <RouteLink page="member" goTo={navigate} aria-label="Profil"><UserRound size={19}/><span>Profil</span></RouteLink>
            </nav>
          </section>

          <section className="menu-master-panel" aria-label="Navigation générale 3B">
            <div className="menu-master-status" role="status">
              <span className={online ? "menu-master-live-dot is-online" : "menu-master-live-dot"} aria-hidden="true" />
              <span>{online ? "SYSTÈME 3B · CONNECTÉ" : "MODE HORS LIGNE · ACCÈS LOCAL"}</span>
              <span className="menu-master-status-signature">MASTER INTERFACE · LIVE</span>
            </div>

            <div className="menu-search menu-master-search"><Search size={19} aria-hidden="true" /><input ref={searchInput} type="search" aria-label="Rechercher une rubrique" placeholder="Rechercher Passeport, Monde, Boutique…" value={query} onChange={event => setQuery(event.target.value)} /></div>
            <div className="menu-secret-clock menu-master-secret"><SecretClock secret={secret} goTo={navigate} compact /></div>

            <div className="dialog-scroll menu-master-scroll">
              <div className="menu-master-directory">
                {NAV_GROUPS.map(group => {
                  const items = group.ids.map(id => matching.find(item => item.id === id)).filter(Boolean);
                  return items.length > 0 && <section key={group.title} className="menu-group menu-master-group" aria-label={group.title}>
                    <div className="menu-master-group-heading"><h3>{group.title}</h3><span>{String(items.length).padStart(2, "0")}</span></div>
                    <div className="menu-master-grid">
                      {items.map(item => item.status === "soon"
                        ? <CompactCard as="article" key={item.id} className="dialog-route menu-master-card is-soon" eyebrow="En préparation" action="Bientôt" title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>}/>
                        : <CompactCard as={RouteLink} key={item.id} page={item.id} goTo={navigate} className="dialog-route menu-master-card" aria-current={activePage === item.id ? "page" : undefined} eyebrow={item.status === "preview" ? "Aperçu" : "Accès direct"} action={item.status === "preview" ? "Bientôt" : "Ouvrir"} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>}/>)}
                    </div>
                  </section>;
                })}
              </div>

              <section className="menu-group menu-companion-settings menu-master-settings" aria-label="Paramètres">
                <div className="menu-master-group-heading"><h3>Expérience 3B</h3><span>FX</span></div>
                <CompanionPresenceControl/>
              </section>

              {installation && <div className="menu-master-install"><InstallApp installation={installation}/></div>}
              {matching.length === 0 && <p className="menu-empty" role="status">Aucun espace trouvé. Essaie « passeport », « monde », « boutique » ou « secret ».</p>}
            </div>
          </section>
        </div>

        <div className="dialog-footer menu-master-footer">
          <RouteLink page="intro" goTo={navigate}>Revoir l’introduction <ArrowUpRight size={16} aria-hidden="true" /></RouteLink>
          <div className="menu-master-footer-mark"><strong>3B</strong><span>NOT A BRAND · A LEGACY</span></div>
          <span>© 3B INTERNATIONAL</span>
        </div>
      </div>
    </dialog>
  </>;
}
