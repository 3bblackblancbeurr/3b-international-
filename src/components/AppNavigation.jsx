import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, Boxes, CreditCard, Gamepad2, Globe2, Home, Menu, Compass, Search, ShoppingBag, Sparkles, Trophy, UserRound, Users, LockKeyhole, X, Fingerprint, ScanLine, SlidersHorizontal } from "lucide-react";
import { getPageHref } from "../lib/navigation.js";
import { ExperienceControls } from "../design-system/LuxuryExperience.jsx";
import { Button } from "../design-system/index.jsx";
import InstallApp from "../install/InstallApp.jsx";
import SecretClock from "../secret/SecretClock.jsx";
import CompanionPresenceControl from '../companion/CompanionPresenceControl.jsx';
import { PRINCIPAL_DESTINATIONS, availableCategories, categoryForPage, itemsForCategory, searchNavigation } from './navigation-menu.js';
import '../styles/simple-navigation.css';

const ICONS = { invisible: ScanLine, home: Home, passport: Fingerprint, loyalty: CreditCard, manga: BookOpen, world3b: Globe2, nosbloc: Boxes, games: Gamepad2, religion: BookOpen, guide: Compass, community: Users, secret: LockKeyhole, sport: Trophy, ia: Sparkles, shop: ShoppingBag, member: UserRound };
export function SectionIcon({ page, ...props }) {
  const Icon = ICONS[page] || Globe2;
  return <Icon size={22} strokeWidth={1.65} aria-hidden="true" {...props} />;
}

export { NAV_GROUPS } from './navigation-menu.js';

export function RouteLink({ page, goTo, children, ...props }) {
  return <a href={getPageHref(page)} onClick={(event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(page);
  }} {...props}>{children}</a>;
}

const QUICK_LINKS = PRINCIPAL_DESTINATIONS;

export default function AppNavigation({ page, title, menuItems, goTo, secret, options, toggleOption, installation, immersive = false }) {
  const dialog = useRef(null), searchInput = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("principal");
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const activePage = page.startsWith("ia-") ? "ia" : page;
  const categories = availableCategories(menuItems);
  const currentCategory = categories.find(item => item.id === category) || categories[0];
  const searching = query.trim().length > 0;
  const matching = searching ? searchNavigation(menuItems, query) : itemsForCategory(menuItems, currentCategory.id);


  useEffect(() => { dialog.current?.close(); }, [page]);
  useEffect(() => {
    const request = event => openMenu({ category: event.detail?.category });
    window.addEventListener('threeb:open-app-menu', request);
    return () => window.removeEventListener('threeb:open-app-menu', request);
  }, [page, menuItems]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('threeb:app-menu-state', { detail: { open: isOpen } }));
    return () => window.dispatchEvent(new CustomEvent('threeb:app-menu-state', { detail: { open: false } }));
  }, [isOpen]);
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
      if (document.querySelector('.gm-modal[role="dialog"][aria-modal="true"]')) return;
      // An installation-help dialog owns its own keyboard interaction.
      const topDialog = [...document.querySelectorAll('dialog[open]')].at(-1);
      if (topDialog && topDialog !== dialog.current) return;
      event.preventDefault();
      if (!dialog.current?.open) openMenu({ search: true });
      else searchInput.current?.focus();
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [page, menuItems]);
  // The native modal makes the background inert; no persistent body scroll lock.

  function openMenu({ search = false, category: requestedCategory } = {}) {
    setQuery("");
    setCategory(requestedCategory || categoryForPage(page, menuItems));
    if (!dialog.current?.open) dialog.current?.showModal();
    setIsOpen(true);
    if (search || !window.matchMedia("(max-width: 720px)").matches) {
      requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
    }
  }
  function navigate(nextPage) {
    dialog.current?.close();
    goTo(nextPage);
  }
  function changeCategory(id, focus = false) {
    setQuery("");
    setCategory(id);
    if (focus) requestAnimationFrame(() => document.getElementById('menu-category-' + id)?.focus());
  }
  function categoryKey(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % categories.length;
    if (event.key === 'ArrowLeft') next = (index + categories.length - 1) % categories.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = categories.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    changeCategory(categories[next].id, true);
  }
  return <>
    <a className="skip-link" href="#main-content" onClick={event => {
      event.preventDefault();
      document.getElementById("main-content")?.focus();
    }}>Aller au contenu</a>
    {!immersive && <header className="site-header">
      <RouteLink page="home" goTo={goTo} className="brand-link" aria-label="3B International — Accueil">
        <span className="brand-wordmark" aria-hidden="true">3B</span>
        <span className="brand-name">INTERNATIONAL</span>
      </RouteLink>
      <nav className="desktop-navigation" aria-label="Navigation principale">
        {QUICK_LINKS.map(item => <RouteLink key={item.id} page={item.id === "invisible" ? "scanner" : item.id} goTo={goTo} aria-current={page === item.id ? "page" : undefined}>{item.label}</RouteLink>)}
      </nav>
      <div className="header-actions">{options && <Button variant="ghost" className="header-settings" aria-label="Paramètres de l’application" data-companion-settings-trigger onClick={() => openMenu({ category: "settings" })}><SlidersHorizontal size={20} aria-hidden="true"/><span>Réglages</span></Button>}<span className="network-status is-offline" role="status" hidden={online}>Hors ligne</span><Button variant="ghost" className="menu-trigger" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen} aria-keyshortcuts="/"><Menu size={20} aria-hidden="true" /><span>Menu</span></Button></div>
    </header>}
    {!immersive && page !== "home" && <div className="page-breadcrumb"><RouteLink page="home" goTo={goTo}><ArrowLeft size={16} aria-hidden="true" /> Accueil</RouteLink><span aria-hidden="true">/</span><span>{title}</span></div>}
    {!immersive && <nav className="mobile-navigation" aria-label="Navigation mobile">
      {QUICK_LINKS.map(item => <RouteLink key={item.id} page={item.id === "invisible" ? "scanner" : item.id} goTo={goTo} aria-current={page === item.id ? "page" : undefined}><SectionIcon page={item.id} /><span>{item.label}</span></RouteLink>)}
      <Button variant="ghost" type="button" onClick={openMenu} aria-label="Ouvrir le menu" aria-haspopup="dialog" aria-controls="universe-menu" aria-expanded={isOpen} className={!QUICK_LINKS.some(item => item.id === page) ? "section-active" : undefined}><Menu size={22} strokeWidth={1.65} aria-hidden="true" /><span>Menu</span></Button>
    </nav>}
    <dialog id="universe-menu" ref={dialog} className="app-menu-dialog" aria-labelledby="menu-title" onClose={event => { if (event.target === dialog.current) setIsOpen(Boolean(dialog.current.open)); }} onCancel={event => { if (event.target !== dialog.current) return; event.preventDefault(); dialog.current?.close(); }} onKeyDown={event => {
      if (event.target.closest('dialog') !== dialog.current) return;
      if (event.key === "Escape") { event.preventDefault(); dialog.current.close(); }
      if (event.key === "Tab") {
        const targets = [...dialog.current.querySelectorAll('button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), summary')].filter(element => element.getClientRects().length);
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }} onClick={event => {
      if (event.target !== dialog.current) return;
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
    }}>
      <div className="app-menu-heading">
        <div><span className="app-menu-eyebrow">3B INTERNATIONAL</span><h2 id="menu-title">À toi de choisir.</h2><p>Tu es dans <strong>{title || "Accueil"}</strong></p></div>
        <Button variant="ghost" className="app-menu-close" type="button" autoFocus aria-label="Fermer le menu" onClick={() => dialog.current.close()}><X size={22} aria-hidden="true" /></Button>
      </div>
      <div className="app-menu-search">
        <Search size={19} aria-hidden="true" />
        <input ref={searchInput} type="search" aria-label="Rechercher une rubrique" placeholder="Rechercher dans 3B" value={query} onChange={event => setQuery(event.target.value)} />
        {query && <Button variant="ghost" type="button" aria-label="Effacer la recherche" onClick={() => { setQuery(""); searchInput.current?.focus(); }}><X size={17} aria-hidden="true" /></Button>}
      </div>
      <div className="app-menu-categories" role="tablist" aria-label="Catégories du menu">
        {categories.map((item, index) => <Button variant="ghost" key={item.id} type="button" role="tab" id={'menu-category-' + item.id} aria-controls="menu-category-content" aria-selected={!searching && item.id === currentCategory.id} tabIndex={item.id === currentCategory.id ? 0 : -1} onClick={() => changeCategory(item.id)} onKeyDown={event => categoryKey(event, index)}>{item.label}</Button>)}
      </div>
      <section id="menu-category-content" className="app-menu-content" role={searching ? 'region' : 'tabpanel'} aria-label={searching ? 'Résultats de recherche' : undefined} aria-labelledby={searching ? undefined : 'menu-category-' + currentCategory.id} tabIndex={0}>
        {searching && <p className="app-menu-results" role="status">{matching.length} {matching.length === 1 ? 'rubrique trouvée' : 'rubriques trouvées'}</p>}
        {!searching && currentCategory.id === 'settings' ? <div className="app-menu-settings">
          {options ? <ExperienceControls inline options={options} toggleOption={toggleOption} page={page}/> : <CompanionPresenceControl/>}
          {installation && <InstallApp installation={installation}/>}
        </div> : <div className="app-menu-list">
          {!searching && currentCategory.id === 'world' && secret && <div className="app-menu-secret"><SecretClock secret={secret} goTo={navigate} compact /></div>}
          {matching.map(item => <RouteLink key={item.id} page={item.id} goTo={navigate} className="app-menu-route" data-menu-id={item.id} aria-current={activePage === item.id ? "page" : undefined}>
            <SectionIcon page={item.id}/><span className="app-menu-route-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
            <span className="app-menu-route-status">{activePage === item.id ? 'Page actuelle' : item.status === 'preview' ? 'Aperçu' : undefined}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </RouteLink>)}

          {matching.length === 0 && <p className="app-menu-empty" role="status">Aucune rubrique trouvée. Essaie « monde », « passeport » ou « boutique ».</p>}
        </div>}
      </section>
      <footer className="app-menu-footer"><RouteLink page="intro" goTo={navigate}>Revoir l’introduction</RouteLink><span>{online ? '3B International' : 'Hors ligne'}</span></footer>
    </dialog>
  </>;
}
