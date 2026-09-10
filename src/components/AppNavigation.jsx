import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, CreditCard, Gamepad2, Globe2, Home, Menu, Compass, Search, ShoppingBag, Sparkles, Trophy, UserRound, Users, LockKeyhole, X, Fingerprint } from "lucide-react";
import { PAGE_HASHES } from "../lib/navigation.js";
import CompactCard from './CompactCard.jsx';

const ICONS = { home: Home, passport: Fingerprint, loyalty: CreditCard, manga: BookOpen, world3b: Globe2, games: Gamepad2, religion: BookOpen, guide: Compass, community: Users, secret: LockKeyhole, sport: Trophy, ia: Sparkles, shop: ShoppingBag, member: UserRound };
export function SectionIcon({ page, ...props }) {
  const Icon = ICONS[page] || Globe2;
  return <Icon size={22} strokeWidth={1.65} aria-hidden="true" {...props} />;
}

export const NAV_GROUPS = [
  { title: "Identité & progression", ids: ["passport", "loyalty"] },
  { title: "Explorer 3B", ids: ["world3b", "games", "manga", "secret", "religion"] },
  { title: "Créer & partager", ids: ["ia", "community", "sport", "shop"] },
  { title: "Comprendre & progresser", ids: ["guide"] },
];

export function RouteLink({ page, goTo, children, ...props }) {
  return <a href={`#${PAGE_HASHES[page]}`} onClick={(event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(page);
  }} {...props}>{children}</a>;
}

const QUICK_LINKS = [
  { id: "home", label: "Accueil" },
  { id: "passport", label: "Passeport" },
  { id: "shop", label: "Boutique" },
  { id: "member", label: "Mon espace" },
];

export default function AppNavigation({ page, title, menuItems, goTo }) {
  const dialog = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const activePage = page.startsWith("ia-") ? "ia" : page;
  const allItems = menuItems.filter(item => item.id !== "member");

  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const matching = allItems.filter(item => normalize(`${item.label} ${item.description}`).includes(normalize(query.trim())));

  useEffect(() => { dialog.current?.close(); }, [page]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  function openMenu() {
    setQuery("");
    dialog.current.showModal();
    setIsOpen(true);
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
      <button className="menu-trigger" type="button" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen}><Menu size={20} aria-hidden="true" /><span>Menu</span></button>
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
      <div className="menu-search"><Search size={19} aria-hidden="true" /><input type="search" aria-label="Rechercher une rubrique" placeholder="Rechercher une rubrique…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="dialog-scroll">
        {NAV_GROUPS.map(group => {
          const items = group.ids.map(id => matching.find(item => item.id === id)).filter(Boolean);
          return items.length > 0 && <section key={group.title} className="menu-group" aria-label={group.title}><h3>{group.title}</h3>{items.map(item => <CompactCard as={RouteLink} key={item.id} page={item.id} goTo={navigate} className="dialog-route" aria-current={activePage === item.id ? "page" : undefined} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>}/>)}</section>;
        })}
        {matching.length === 0 && <p className="menu-empty" role="status">Aucune rubrique trouvée. Essaie « passeport », « manga » ou « boutique ».</p>}
      </div>
      <div className="dialog-footer"><RouteLink page="intro" goTo={navigate}>Revoir l’introduction <ArrowUpRight size={16} aria-hidden="true" /></RouteLink><span>De zéro à l’international.</span></div>
    </dialog>
  </>;
}

