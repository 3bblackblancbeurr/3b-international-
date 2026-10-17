import { LuxuryBoot, useLuxuryRuntime } from "./design-system/LuxuryExperience.jsx";
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const HealthPage = lazy(() => import("./health/HealthPage.jsx"));
const MemberExperiences = lazy(() => import("./member/MemberExperiences.jsx"));
const DealsPage = lazy(() => import("./deals/DealsPage.jsx"));
const ShopPage = lazy(() => import("./shop/ShopPage.jsx"));
const AiPage = lazy(() => import("./ai/AiPage.jsx"));
const AlbertPublicPreview = lazy(() => import("./components/AlbertPublicPreview.jsx"));
const PremierSecretPage = lazy(() => import("./secret/PremierSecretPage.jsx"));
const ControlCenterPage = lazy(() => import("./control/ControlCenterPage.jsx"));
import { controlCenterRequest } from "./control/client.js";
import { readLocation, navigateTo, navigateToGame } from "./lib/navigation.js";
import { ecosystemPublic } from "./lib/ecosystem.js";
import useViewportProfile from "./lib/useViewportProfile.js";
import { useTraffic } from "./lib/useTraffic.js";
import { captureRouteView } from "./lib/analytics.js";
import { useDailySecret } from "./secret/dailySecret.js";
import { STORAGE_MEMBER_KEY, STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS,
  createTestMember, normalizeMember, normalizeOptions,
  loadJsonStorage, saveJsonStorage } from "./lib/member.js";
import AppNavigation from "./components/AppNavigation.jsx";
import HomePage from "./components/HomePage.jsx";
import AppLoadingState from "./components/AppLoadingState.jsx";
import { useAppInstallation } from "./install/useAppInstallation.js";
import PassportExperience from "./passport/PassportExperience.jsx";
import { hasPassportAccess } from "./passport/access.js";
import { Button } from "./design-system/index.jsx";
const GamesHub = lazy(() => import("./games/GamesHub.jsx"));
const PenaltyRush = lazy(() => import("./games/PenaltyRush.jsx"));
import LoyaltyPage from "./loyalty/LoyaltyPage.jsx";
import AccountPage from "./loyalty/AccountPage.jsx";
import {useLoyalty,remoteMember,ExplorationRewards} from "./loyalty/LoyaltyContext.jsx";
import "./App.css";
import "./styles/mobile-navigation.css";
import "./styles/passport-effects.css";
import "./styles/games.css";
import "./styles/refinement.css";
import "./styles/compact.css";
import "./styles/dimension.css";
import "./styles/home-premium.css";
import "./styles/responsive-premium.css";
import "./styles/companion.css";
import CompanionLayer from "./companion/CompanionLayer.jsx";
import { sanitizeLivingPrefs } from './companion/companion-personality.js';
import { selectCompanionVoice, companionVoiceProsody } from './companion/useCompanionVoice.js';
import GuidePage from "./components/GuidePage.jsx";
import ComingSoon from "./components/ComingSoon.jsx";
import ReligionPage from "./components/ReligionPage.jsx";
const CommunityPage = lazy(() => import("./community/CommunityPage.jsx"));
const MangaPage = lazy(() => import("./manga/MangaPage.jsx"));
const EsportsPage = lazy(() => import("./esports/EsportsPage.jsx"));
const MaintenantPage = lazy(() => import("./maintenant/MaintenantPage.jsx"));
import SportPage from "./sport/SportPage.jsx";
const WorldExperience=lazy(()=>import('./world/WorldEntry.jsx'));
const InvisibleExperience=lazy(()=>import('./world/invisible/InvisiblePage.jsx'));
const ArenaExperience=lazy(()=>import('./arena/ArenaPage.jsx'));
const NosblocPage=lazy(()=>import('./nosbloc/NosblocPremiumPage.jsx'));

// Public destinations reuse the same carefully sourced experiences available in the member space.
const MEMBER_SPACE_ROUTES = Object.freeze({
  news: 'news', association: 'association', partners: 'partners', finance: 'finance',
  travel: 'travel', join: 'join', tv: 'tv', admin: 'admin', cinema: 'cinema',
});

const BASE_MENU_ITEMS = [
  { id: "maintenant", label: "3B Maintenant", icon: "✦", description: "La Boussole, le Cercle Vivant et six expériences pour agir." },
  { id: "health", label: "Santé", description: "Manger, bouger et prendre soin de soi." },
  { id: "deals", label: "3 bons plans", description: "Des offres datées et sourcées pour le quotidien." },
  { id: "news", label: "Informations actuelles", description: "Actualités et événements datés, avec leurs sources." },
  { id: "association", label: "Association 3B", description: "Projet associatif 3B, entraide et actions culturelles." },
  { id: "partners", label: "Partenariats & collaborations", description: "Préparer un brief, suivre une proposition et construire un projet." },
  { id: "finance", label: "Banque & crypto", description: "Atelier projet, trésorerie, financements et prototype du token. Démo séparée." },
  { id: "travel", label: "Voyage 3B", description: "Carnets de voyage, itinéraires, préparatifs et budget prévisionnel." },
  { id: "join", label: "Nous recherchons", description: "Talents, artistes, développeurs, associations et testeurs." },
  { id: "tv", label: "3B Origins TV", description: "Neuf récits audio du Monde 3B, textes et progression de lecture." },
  { id: "admin", label: "Administration", description: "Suivre ses démarches, échéances et étapes avec les sources officielles." },
  { id: "cinema", label: "Cinéma", description: "Créer sa liste de films et séries, garder ses notes et trouver les offres légales." },
  { id: "foodscan", label: "Scanner alimentaire", description: "Scanner un code-barres et consulter les ingrédients et allergènes." },
  { id: "albert", label: "Albert APEX · 3B", description: "Concierge 3B et orientation locale, connexion au moteur Albert personnel non activée." },
  { id: "guide", label: "Guide & XP", description: "Les repères pour commencer." },
  {
    id: "passport",
    label: "Passeport 3B",
    icon: "▣",
    description: "Ton identité 3B.",
  },
  {
    id: "manga",
    label: "Manga 3B",
    icon: "📖",
    description: "Le manga de l’univers 3B.",
  },
  {
    id: "world3b",
    label: "Le Monde du 3B",
    icon: "🌍",
    description: "Explore les huit Portes.",
  },
  {
    id: "invisible",
    label: "Le Monde caché",
    icon: "⌁",
    description: "Les huit héritages, le scanner et tes futures découvertes.",
  },
  {
    id: "nosbloc",
    label: "Nosbloc du 3B",
    icon: "▦",
    status: "soon",
    description: "Crée et développe ton Bloc.",
  },
  {
    id: "games",
    label: "Jeux 3B",
    icon: "🎮",
    description: "Tous les jeux 3B, dont Créer ma Ville et le football.",
  },
  {
    id: "religion",
    label: "3B Religion",
    icon: "✧",
    description: "Croyances, cultures et traditions.",
  },
  {
    id: "community",
    label: "Communauté",
    icon: "👥",
    description: "Réseau, membres, créateurs et échanges.",
  },
  {
    id: "secret",
    label: "L’Heure du Premier Secret",
    icon: "◷",
    description: "Un secret à découvrir chaque jour.",
  },
  {
    id: "sport",
    label: "Espace sport 3B",
    icon: "🏆",
    description: "Actualités multisports, défis et collaborations.",
  },
  {
    id: "esports",
    label: "16-18 e-sport",
    icon: "🎯",
    description: "L’équipe 16-18 de 3B ESPORTS · Warzone.",
  },
  {
    id: "ia",
    label: "Espace textile & IA",
    icon: "⚙️",
    description: "Création textile avec l’IA.",
  },
  {
    id: "shop",
    label: "Boutique",
    icon: "🛍️",
    description: "Drops, produits premium et certificats.",
  },
];

const PREPARATION_ROUTE_IDS = new Set(["nosbloc"]);

const CONTROL_MENU_ITEM = {
  id: "control",
  label: "3B Command OS",
  icon: "⌁",
  description: "Ton centre de commande privé.",
};

const WELCOME_MESSAGE = "Bienvenue dans l'univers 3B. L'héritage commence maintenant. Reste attentif tout le temps partout.";

function speakWelcome() {
  if (typeof window === 'undefined' || document.hidden || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  let prefs;
  try {
    if (JSON.parse(localStorage.getItem('threeb_companion_prefs_v1') || '{}')?.enabled === false) return;
    prefs = sanitizeLivingPrefs(JSON.parse(localStorage.getItem('threeb_companion_living_v1') || '{}'));
  } catch { return; }
  // Entry speech follows the chosen companion voice; interface effects have their own mute.
  if (!prefs.voiceEnabled || window.speechSynthesis.speaking || window.speechSynthesis.pending) return;
  const utterance = new window.SpeechSynthesisUtterance(WELCOME_MESSAGE);
  utterance.lang = 'fr-FR';
  Object.assign(utterance, companionVoiceProsody(prefs.personality, prefs.voiceStyle));
  utterance.voice = selectCompanionVoice(window.speechSynthesis.getVoices(), prefs.voiceId);
  let settled = false;
  const announce = speaking => window.dispatchEvent(new CustomEvent('threeb:companion-speaking', { detail: { speaking } }));
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(expiry);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('threeb:companion-voice-stop', stopWelcome);
    utterance.onstart = utterance.onend = utterance.onerror = null;
    announce(false);
  };
  const stopWelcome = () => {
    if (settled) return;
    finish();
    try { window.speechSynthesis.cancel(); } catch { /* This welcome has already ended. */ }
  };
  const onVisibility = () => { if (document.hidden) stopWelcome(); };
  const expiry = setTimeout(stopWelcome, 20000);
  utterance.onstart = () => { if (!settled) announce(true); };
  utterance.onend = finish;
  utterance.onerror = finish;
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('threeb:companion-voice-stop', stopWelcome);
  try { window.speechSynthesis.speak(utterance); } catch { finish(); }
}

const MEMBER_MENU_ITEM = {
  id: "member",
  label: "Espace membre 3B",
  icon: "💎",
  description: "Ton compte et tes avantages.",
};

export default function App() {
  useViewportProfile();
  const installation = useAppInstallation();
  const secret = useDailySecret();
  const [route, setRoute] = useState(readLocation);
  const { page, gameSlug } = route;
  useTraffic(page);
  useEffect(() => {
    captureRouteView({ page, gameSlug });
  }, [page, gameSlug]);
  const hasStarted = page !== "intro";
  const [storageNotice, setStorageNotice] = useState("");
  const [controlAvailable, setControlAvailable] = useState(false);


  const loyalty = useLoyalty();
  const [localMember] = useState(() =>
    normalizeMember(loadJsonStorage(STORAGE_MEMBER_KEY, createTestMember()))
  );

  const member = loyalty.profile ? remoteMember(loyalty.profile) : createTestMember();
  const hasPassport = hasPassportAccess(loyalty.passport);
  const [options, setOptions] = useState(() =>
    normalizeOptions(loadJsonStorage(STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS))
  );

  useLuxuryRuntime(options, page);
  useEffect(() => {
    let active = true;
    const nativePhone = Boolean(window.Capacitor?.isNativePlatform?.());
    const mobilePhone = navigator.userAgentData?.mobile === true || /android|iphone|ipod|mobile/i.test(navigator.userAgent || "");
    const touchPhone = window.matchMedia("(max-width: 820px) and (pointer: coarse)").matches;
    if (!loyalty.user?.id || !(nativePhone || mobilePhone || touchPhone)) {
      setControlAvailable(false);
      return () => { active = false; };
    }
    controlCenterRequest("status")
      .then(() => { if (active) setControlAvailable(true); })
      .catch(() => { if (active) setControlAvailable(false); });
    return () => { active = false; };
  }, [loyalty.user?.id]);

  const menuItems = useMemo(() => {
    const accountItem = member.isRegistered ? MEMBER_MENU_ITEM : {
      ...MEMBER_MENU_ITEM,
      label: "Connexion / Inscription",
      description: "Retrouver son compte ou activer son Passeport 3B.",
    };
    const liveBaseItems = BASE_MENU_ITEMS.map((item) => {
      if (item.id !== "secret") return item;
      const description = secret.phase === "open"
        ? `Le signal est actif maintenant · ${secret.countdown} pour entrer.`
        : secret.phase === "attempt"
          ? `Ta tentative est en cours · ${secret.countdown} restantes.`
          : secret.phase === "missed" || secret.phase === "expired"
            ? "Le signal est passé. Une nouvelle chance viendra demain à une autre heure."
            : secret.phase === "completed"
              ? "Secret accompli aujourd’hui. Le Nexus changera demain."
              : "Observe l’horloge 3B. Le signal peut apparaître à une heure différente chaque jour.";
      return {
        ...item,
        description,
        secretPhase: secret.phase,
        secretLabel: secret.label,
        secretCountdown: secret.countdown,
      };
    });
    return [
      ...liveBaseItems.slice(0, 2),
      accountItem,
      ...(member.isRegistered && controlAvailable ? [CONTROL_MENU_ITEM] : []),
      ...liveBaseItems.slice(2),
    ];
  }, [member.isRegistered, controlAvailable, secret.phase, secret.label, secret.countdown]);

  const currentPageTitle = useMemo(() => {
    if (page === "member") {
      return member.isRegistered ? "Espace membre 3B" : "Connexion / Inscription";
    }

    if (page === "ia-textile") return "IA textile";
    if (page === "ia-trio") return "Mode 3 IA";
    if (page === "control") return "Centre de commande 3B";
    if (page === "game") return gameSlug === "penalty-rush" ? "Penalty Rush" : "Jeux 3B";
    if (page === "home") return "Accueil";
    return menuItems.find((item) => item.id === page)?.label || "3B International";
  }, [page, gameSlug, menuItems, member.isRegistered]);

  useEffect(() => {
    const syncLocation = () => setRoute(readLocation());
    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hashchange", syncLocation);
    return () => {
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  useEffect(() => {
    document.title = page === "intro" ? "3B International — Application Black Blanc Beur" : `${currentPageTitle} — 3B`;
    const routeDescription = page === "intro"
      ? "Application officielle 3B International — Black Blanc Beur."
      : page === "home"
        ? "Passeport, Monde du 3B, boutique, jeux, communauté et expériences 3B réunis dans un même univers."
        : menuItems.find(item => item.id === (page.startsWith("ia-") ? "ia" : page))?.description;
    const description = document.querySelector('meta[name="description"]');
    if (description && routeDescription) description.setAttribute("content", `3B International — ${routeDescription}`);
  }, [page, currentPageTitle, menuItems]);

  useEffect(() => {
    // The main landmark is available even while a lazy route is loading.
    // Profile synchronization must not steal focus from a form or an open menu.
    const heading = document.querySelector("main h1");
    const target = heading?.getClientRects().length ? heading : document.querySelector("main");
    if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, gameSlug]);

  useEffect(() => {
    document.documentElement.dataset.motion = options.reducedMotion || !options.animations ? "reduced" : "full";
    return () => { delete document.documentElement.dataset.motion; };
  }, [options.reducedMotion, options.animations]);

  function persist(key, value) {
    setStorageNotice(saveJsonStorage(key, value) ? "" : "La sauvegarde sur cet appareil est indisponible. Tes changements risquent d’être perdus à la fermeture.");
  }

  function goTo(nextPage) {
    navigateTo(nextPage);
    setRoute(readLocation());
  }

  function goToGame(slug) {
    navigateToGame(slug);
    setRoute(readLocation());
  }

  function toggleOption(key) {
    const nextOptions = {
      ...options,
      [key]: !options[key],
    };

    setOptions(nextOptions);
    persist(STORAGE_OPTIONS_KEY, nextOptions);
  }

  if (!hasStarted) {
    return <main className="intro3b" data-glow={options.premiumGlow} data-matrix={options.matrix}>
      <div className="intro3b-background" aria-hidden="true" />
      <div className={options.matrix ? "intro3b-matrix active" : "intro3b-matrix"} aria-hidden="true" />
      <LuxuryBoot installation={installation} onDone={() => { speakWelcome(); goTo("home"); }} />
    </main>;
  }

  const isPreparationRoute = PREPARATION_ROUTE_IDS.has(page);

  if (isPreparationRoute) {
    const preparationTitle = page === "game" ? "Jeux 3B" : currentPageTitle;
    return (
      <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
        <div className="app3b-background" aria-hidden="true" />
        <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} aria-hidden="true" />
        {!MEMBER_SPACE_ROUTES[page] && !["finance","health","foodscan","home","albert"].includes(page) && <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />}
        <AppNavigation page={page} title={preparationTitle} menuItems={menuItems} goTo={goTo} secret={secret} options={options} toggleOption={toggleOption} installation={installation} />
        <main id="main-content" tabIndex={-1}>
          <ComingSoon
            goTo={goTo}
            eyebrow="EN PRÉPARATION · 3B"
            title={preparationTitle}
            description="Cet espace est conservé et continue d’être préparé en interne. Il rouvrira quand sa version publique sera suffisamment solide et cohérente avec l’expérience 3B."
          />
        </main>
      </div>
    );
  }

  const passportAllowed = new Set([...Object.keys(MEMBER_SPACE_ROUTES), "foodscan", "home", "passport", "member", "religion", "control", "shop", "guide", "invisible", "deals", "health", "maintenant", "albert", "games", "game", "manga", "sport", "esports", "community", "ia", "ia-textile", "ia-trio"]);
  const needsPassport = !loyalty.loading && !hasPassport && !passportAllowed.has(page);

  if (needsPassport) {
    return (
      <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
        <AppNavigation page={page} title={currentPageTitle} menuItems={menuItems} goTo={goTo} secret={secret} options={options} toggleOption={toggleOption} installation={installation}/>
        <main id="main-content" tabIndex={-1}><PassportAccessGate goTo={goTo} options={options} page={page} title={currentPageTitle}/></main>
      </div>
    );
  }

  return (
    <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
      <div className="app3b-background" aria-hidden="true" />
      <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} aria-hidden="true" />

      {!MEMBER_SPACE_ROUTES[page] && !["finance","health","foodscan","home","albert"].includes(page) && <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />}

      <AppNavigation immersive={['world3b','arena','game','control','invisible'].includes(page)} page={page} title={currentPageTitle} menuItems={menuItems} goTo={goTo} secret={secret} options={options} toggleOption={toggleOption} installation={installation} />
      <main id="main-content" tabIndex={-1}>
      <div className="route-announcer" aria-live="polite" aria-atomic="true">{currentPageTitle}</div>
      <Suspense fallback={<AppLoadingState label={`Ouverture · ${currentPageTitle}`} />}>
      {!["health","foodscan"].includes(page) && <ExplorationRewards page={page}/>}
      {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}

      {page === "home" && (
        <HomePage goTo={goTo} menuItems={menuItems} member={member} secret={secret} installation={installation} />
      )}

      {page === "passport" && (
        <PassportExperience
          key={loyalty.passport?.userId || 'visitor'}
          identity={loyalty.passport}
          syncing={loyalty.loading || (!!loyalty.user && !loyalty.profile)}
          options={options}
          hasPassport={hasPassport}
          goTo={goTo}
        />
      )}

      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}
      {page === "nosbloc" && <NosblocPage goTo={goTo} />}
      {page === "maintenant" && <MaintenantPage goTo={goTo} />}
      {page === "games" && <GamesHub key={loyalty.user?.id || "guest"} goTo={goTo} goToGame={goToGame} />}
      {page === "game" && (gameSlug === "penalty-rush"
        ? <PenaltyRush onClose={() => goTo("games")} onAccount={() => goTo("member")} />
        : <RemoteGamePage slug={gameSlug} onBack={() => goTo("games")} />)}
      {page === "religion" && <ReligionPage />}
      {page === "guide" && <GuidePage goTo={goTo} menuItems={[...BASE_MENU_ITEMS, MEMBER_MENU_ITEM]} />}
      {page === "manga" && <MangaPage goTo={goTo} />}
       {page === "esports" && <EsportsPage goTo={goTo} />}
      {page === "community" && <CommunityPage goTo={goTo} />}
      {page === "secret" && <PremierSecretPage goTo={goTo} dailySecret={secret} />}
      {page === "world3b" && <Suspense fallback={<AppLoadingState label="Ouverture du Monde 3B…" />}><WorldExperience goTo={goTo}/></Suspense>}
      {page === "invisible" && <InvisibleExperience key={loyalty.user?.id||'guest'} goTo={goTo}/>}
      {page === "arena" && <div className="arena-standalone"><Suspense fallback={<AppLoadingState label="Ouverture de l’arène 3B…" compact />}><ArenaExperience key={loyalty.user?.id||'guest'} onExit={()=>goTo('world3b')} onAccount={()=>goTo('member')}/></Suspense></div>}

      {page === "member" && (
        <AccountPage
          legacy={localMember}
          options={options}
          goTo={goTo}
          toggleOption={toggleOption}
        />
      )}

      {page === "sport" && <SportPage goTo={goTo} />}
      {page === "health" && <HealthPage />}
      {page === "foodscan" && <HealthPage initialTab="scanner" />}
      {MEMBER_SPACE_ROUTES[page] && <MemberExperiences key={page} goTo={goTo} profile={loyalty.profile || null} initialSpace={MEMBER_SPACE_ROUTES[page]} standalone />}
      {page === "deals" && <DealsPage />}
      {page === "control" && <ControlCenterPage goTo={goTo} />}
       {page === "albert" && <AlbertPublicPreview goTo={goTo} />}
      {["ia", "ia-textile", "ia-trio"].includes(page) && <AiPage page={page} goTo={goTo} />}
      {page === "shop" && <ShopPage key={route.search} goTo={goTo} reducedMotion={options.reducedMotion || !options.animations} />}
      </Suspense>
      </main>
    </div>
  );
}


function RemoteGamePage({ slug, onBack }) {
  const mountRef = useRef(null);
  const onBackRef = useRef(onBack);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    let live = true;
    let node = null;
    let backEvent = "threeb-game-back";
    let backHandler = null;
    const controller = new AbortController();

    async function boot() {
      try {
        setStatus("loading");
        setError("");

        const payload = await ecosystemPublic("games", { signal: controller.signal });
        const game = Array.isArray(payload?.games)
          ? payload.games.find((entry) => entry?.slug === slug)
          : null;

        if (!game || !game.playable || game.moduleType !== "remote-module") {
          throw new Error("Ce jeu 3B n’est pas disponible.");
        }

        const loaderUrl = new URL(String(payload.loaderUrl || ""), window.location.origin);
        const moduleUrl = new URL(String(game.moduleUrl || ""), window.location.origin);
        if (loaderUrl.protocol !== "https:" || loaderUrl.origin !== moduleUrl.origin) {
          throw new Error("Module Jeux 3B non autorisé.");
        }

        await import(/* @vite-ignore */ loaderUrl.href);
        if (!live) return;

        const elementTag = String(payload.loaderElement || "threeb-remote-game");
        if (!customElements.get(elementTag)) {
          throw new Error("Le chargeur Jeux 3B ne s’est pas initialisé.");
        }

        const mount = mountRef.current;
        if (!mount) return;

        node = document.createElement(elementTag);
        node.setAttribute("slug", game.slug);
        backEvent = String(payload.backEvent || "threeb-game-back");
        backHandler = () => onBackRef.current?.();
        node.addEventListener(backEvent, backHandler);
        mount.replaceChildren(node);
        setStatus("ready");
      } catch (bootError) {
        if (!live || bootError?.name === "AbortError") return;
        setError(bootError instanceof Error ? bootError.message : "Jeu momentanément indisponible.");
        setStatus("error");
      }
    }

    boot();

    return () => {
      live = false;
      controller.abort();
      if (node && backHandler) node.removeEventListener(backEvent, backHandler);
      node?.remove();
    };
  }, [slug]);

  return (
    <section
      aria-label="Jeu 3B"
      style={{
        minHeight: "100dvh",
        background: "#050608",
        color: "#f6f8fb",
        position: "relative",
      }}
    >
      <div ref={mountRef} style={{ minHeight: "100dvh" }} />

      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#050608",
            zIndex: 2,
          }}
        >
          <div style={{ width: "min(100%, 520px)", textAlign: "center" }}>
            <p className="eyebrow">JEUX 3B</p>
            <h1>{status === "error" ? "Jeu 3B indisponible" : "Ouverture du jeu 3B…"}</h1>
            <p>{status === "error" ? error : "Connexion au terrain 3B et à ton compte."}</p>
            <button type="button" className="primary-button" onClick={() => onBackRef.current?.()}>
              ← Retour Jeux 3B
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


function PassportAccessGate({ goTo, page, title }) {
  const descriptions = {
    world3b: 'Explore la Cité des Huit Héritages, rencontre ses Gardiens et fais évoluer ton aventure avec Kaïs.',
    loyalty: 'Retrouve tes cartes, tes points et les avantages liés à ton compte 3B.',
    secret: 'Retrouve les ouvertures du Secret 3B et les règles de chaque découverte.',
    arena: 'Entraîne ton personnage et découvre les activités du Monde 3B.',
  };
  return <section className="route-preview" aria-labelledby="passport-access-title">
    <p className="eyebrow">DÉCOUVRIR 3B</p>
    <h1 id="passport-access-title">{title || 'Ton univers 3B'}</h1>
    <p className="route-preview-lead">{descriptions[page] || 'Cet espace rassemble les activités et les avantages de ton compte 3B.'}</p>
    {page==='world3b'&&<img className="route-preview-art" src="/invisible/eight-kingdoms-v3.jpg" alt="L’univers des huit héritages de Kaïs" width="1672" height="941"/>}
    <div className="route-preview-access"><h2>Continue avec ton Passeport</h2><p>Un seul Passeport 3B relie ton identité, ta progression et tes récompenses. Passeport 3B requis pour participer à cet espace.</p></div>
    <div className="route-preview-actions"><Button variant="champagne" className="primary-button" onClick={()=>goTo('member')}>Me connecter ou créer mon compte</Button><Button variant="ghost" className="ghost-button" onClick={()=>goTo('passport')}>Découvrir le Passeport</Button><Button variant="ghost" onClick={()=>goTo('home')}>Retour à l’accueil</Button></div>
  </section>;
}
