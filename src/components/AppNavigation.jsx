import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, CreditCard, Gamepad2, Globe2, Home, Menu, Compass, Search, ShoppingBag, Sparkles, Trophy, UserRound, Users, LockKeyhole, X, Fingerprint } from "lucide-react";
import { getPageHref } from "../lib/navigation.js";
import CompactCard from './CompactCard.jsx';
import SecretClock from "../secret/SecretClock.jsx";

const ICONS = { home: Home, passport: Fingerprint, loyalty: CreditCard, manga: BookOpen, world3b: Globe2, games: Gamepad2, religion: BookOpen, guide: Compass, community: Users, secret: LockKeyhole, sport: Trophy, ia: Sparkles, shop: ShoppingBag, member: UserRound };
export function SectionIcon({ page, ...props }) {
  const Icon = ICONS[page] || Globe2;
  return <Icon size={22} strokeWidth={1.65} aria-hidden="true" {...props} />;
}

export const NAV_GROUPS = [
  { title: "Identité & progression", ids: ["passport", "member", "loyalty"] },
  { title: "Univers & jeux", ids: ["world3b", "games", "manga", "secret"] },
  { title: "Religions & spiritualité", ids: ["religion"] },
  { title: "Services & avantages", ids: ["shop", "sport", "control"] },
  { title: "En préparation", ids: ["community", "ia"] },
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
  { id: "games", label: "Jeux" },
];

export default function AppNavigation({ page, title, menuItems, goTo, secret }) {
  const dialog = useRef(null), searchInput = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const activePage = page.startsWith("ia-") ? "ia" : page;
  const allItems = menuItems;

  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const matching = allItems.filter(item => normalize(`${item.label} ${item.description}`).includes(normalize(query.trim())));

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
      <div className="header-actions"><SecretClock secret={secret} goTo={goTo} compact /><span className={'network-status '+(online?'is-online':'is-offline')} aria-live="polite">{online?'En ligne':'Hors ligne'}</span><button className="menu-trigger" type="button" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen} aria-keyshortcuts="/"><Menu size={20} aria-hidden="true" /><span>Menu</span></button></div>
    </header>
    {page !== "home" && <div className="page-breadcrumb"><RouteLink page="home" goTo={goTo}><ArrowLeft size={16} aria-hidden="true" /> Accueil</RouteLink><span aria-hidden="true">/</span><span>{title}</span></div>}
    <nav className="mobile-navigation" aria-label="Navigation mobile">
      {QUICK_LINKS.map(item => <RouteLink key={item.id} page={item.id} goTo={goTo} aria-current={page === item.id ? "page" : undefined}><SectionIcon page={item.id} /><span>{item.label}</span></RouteLink>)}
      <button type="button" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen} className={!QUICK_LINKS.some(item => item.id === page) ? "section-active" : undefined}><Menu size={22} strokeWidth={1.65} aria-hidden="true" /><span>Menu</span></button>
    </nav>
    <dialog id="universe-menu" ref={dialog} className="universe-dialog" aria-labelledby="menu-title" onClose={() => setIsOpen(false)} onKeyDown={event => {
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
      <div className="dialog-heading"><div><p className="eyebrow">Tout commence ici</p><h2 id="menu-title">L’univers 3B</h2></div><button className="icon-button" type="button" autoFocus aria-label="Fermer le menu" onClick={() => dialog.current.close()}><X size={23} aria-hidden="true" /></button></div>
      <div className="menu-search"><Search size={19} aria-hidden="true" /><input ref={searchInput} type="search" aria-label="Rechercher une rubrique" placeholder="Rechercher une rubrique…  /" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="menu-secret-clock"><SecretClock secret={secret} goTo={navigate} /></div>
      <div className="dialog-scroll">
        {NAV_GROUPS.map(group => {
          const items = group.ids.map(id => matching.find(item => item.id === id)).filter(Boolean);
          return items.length > 0 && <section key={group.title} className="menu-group" aria-label={group.title}><h3>{group.title}</h3>{items.map(item => item.status === "soon"
            ? <CompactCard as="article" key={item.id} className="dialog-route is-soon" eyebrow="Bientôt" action="Bientôt" title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>}/>
            : <CompactCard as={RouteLink} key={item.id} page={item.id} goTo={navigate} className="dialog-route" aria-current={activePage === item.id ? "page" : undefined} eyebrow={item.status === "preview" ? "Aperçu" : undefined} action={item.status === "preview" ? "Bientôt" : "Ouvrir"} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>}/>)}</section>;
        })}
        {matching.length === 0 && <p className="menu-empty" role="status">Aucune rubrique trouvée. Essaie « passeport », « manga » ou « boutique ».</p>}
      </div>
      <div className="dialog-footer"><RouteLink page="intro" goTo={navigate}>Revoir l’introduction <ArrowUpRight size={16} aria-hidden="true" /></RouteLink><span>De zéro à l’international.</span></div>
    </dialog>
  </>;
}
