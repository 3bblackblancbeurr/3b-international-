import { LuxuryBoot, useLuxuryRuntime } from "./design-system/LuxuryExperience.jsx";
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const ShopPage = lazy(() => import("./shop/ShopPage.jsx"));
const AiPage = lazy(() => import("./ai/AiPage.jsx"));
const PremierSecretPage = lazy(() => import("./secret/PremierSecretPage.jsx"));
const ControlCenterPage = lazy(() => import("./control/ControlCenterPage.jsx"));
import { controlCenterRequest } from "./control/client.js";
import { readLocation, navigateTo, navigateToGame } from "./lib/navigation.js";
import { ecosystemPublic } from "./lib/ecosystem.js";
import useViewportProfile from "./lib/useViewportProfile.js";
import { useTraffic } from "./lib/useTraffic.js";
import { captureRouteView } from "./lib/analytics.js";
import { useDailySecret } from "./secret/dailySecret.js";
import SecretDirectorPanel from "./secret/SecretDirectorPanel.jsx";
import { STORAGE_MEMBER_KEY, STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS,
  createTestMember, normalizeMember, normalizeOptions,
  loadJsonStorage, saveJsonStorage } from "./lib/member.js";
import AppNavigation from "./components/AppNavigation.jsx";
import HomePage from "./components/HomePage.jsx";
import AppLoadingState from "./components/AppLoadingState.jsx";
import { useAppInstallation } from "./install/useAppInstallation.js";
import PassportVisual from "./components/PassportVisual.jsx";
import PassportAppearanceSettings from "./passport/PassportAppearance.jsx";
import PassportVerification from "./passport/PassportVerification.jsx";
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
import SportPage from "./sport/SportPage.jsx";
const WorldExperience=lazy(()=>import('./world/WorldEntry.jsx'));
const ArenaExperience=lazy(()=>import('./arena/ArenaPage.jsx'));
const NosblocPage=lazy(()=>import('./nosbloc/NosblocPremiumPage.jsx'));

const BASE_MENU_ITEMS = [
  { id: "guide", label: "Guide & XP", description: "Les repères pour commencer." },
  {
    id: "passport",
    label: "Passeport 3B",
    icon: "▣",
    description: "Ton identité 3B.",
  },
  {
    id: "loyalty",
    label: "Cartes de fidélité",
    icon: "💳",
    description: "Points, avantages et récompenses.",
  },
  {
    id: "manga",
    label: "Manga 3B",
    icon: "📖",
    status: "soon",
    description: "Le manga de l’univers 3B.",
  },
  {
    id: "world3b",
    label: "Le Monde du 3B",
    icon: "🌍",
    description: "Explore les huit Portes.",
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
    status: "soon",
    description: "Les jeux de l’univers 3B.",
  },
  {
    id: "religion",
    label: "Religion",
    icon: "✧",
    status: "soon",
    description: "Croyances, cultures et traditions.",
  },
  {
    id: "community",
    label: "Communauté",
    icon: "👥",
    status: "soon",
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
    status: "soon",
    description: "Actualités multisports, défis et collaborations.",
  },
  {
    id: "ia",
    label: "Espace textile & IA",
    icon: "⚙️",
    status: "soon",
    description: "Création textile avec l’IA.",
  },
  {
    id: "shop",
    label: "Boutique",
    icon: "🛍️",
    description: "Drops, produits premium et certificats.",
  },
];

const PREPARATION_ROUTE_IDS = new Set(["nosbloc", "games", "religion", "manga", "sport"]);

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

  const isPreparationRoute = PREPARATION_ROUTE_IDS.has(page) || page === "game";

  if (isPreparationRoute) {
    const preparationTitle = page === "game" ? "Jeux 3B" : currentPageTitle;
    return (
      <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
        <div className="app3b-background" aria-hidden="true" />
        <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} aria-hidden="true" />
        <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />
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

  const passportAllowed = new Set(["home", "passport", "member", "religion", "control"]);
  const needsPassport = !loyalty.loading && !hasPassport && !passportAllowed.has(page);

  if (needsPassport) {
    return (
      <>
        <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />
        <PassportAccessGate goTo={goTo} options={options} />
      </>
    );
  }

  return (
    <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
      <div className="app3b-background" aria-hidden="true" />
      <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} aria-hidden="true" />

      <CompanionLayer goTo={goTo} page={page} secretPhase={secret.phase} memberRegistered={member.isRegistered} />

      {!['world3b','arena','game','control'].includes(page) && <AppNavigation page={page} title={currentPageTitle} menuItems={menuItems} goTo={goTo} secret={secret} options={options} toggleOption={toggleOption} installation={installation} />}
      <main id="main-content" tabIndex={-1}>
      <div className="route-announcer" aria-live="polite" aria-atomic="true">{currentPageTitle}</div>
      <Suspense fallback={<AppLoadingState label={`Ouverture · ${currentPageTitle}`} />}>
      <ExplorationRewards page={page}/>
      {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}

      {page === "home" && (
        <HomePage goTo={goTo} menuItems={menuItems} member={member} secret={secret} installation={installation} />
      )}

      {page === "passport" && (
        <PassportPage
          identity={loyalty.passport}
          syncing={loyalty.loading || (!!loyalty.user && !loyalty.profile)}
          options={options}
          hasPassport={hasPassport}
          goTo={goTo}
        />
      )}

      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}
      {page === "nosbloc" && <NosblocPage goTo={goTo} />}
      {page === "games" && <GamesHub key={loyalty.user?.id || "guest"} goTo={goTo} goToGame={goToGame} />}
      {page === "game" && (gameSlug === "penalty-rush"
        ? <PenaltyRush onClose={() => goTo("games")} onAccount={() => goTo("member")} />
        : <RemoteGamePage slug={gameSlug} onBack={() => goTo("games")} />)}
      {page === "religion" && <ReligionPage />}
      {page === "guide" && <GuidePage goTo={goTo} menuItems={[...BASE_MENU_ITEMS, MEMBER_MENU_ITEM]} />}
      {page === "manga" && <ComingSoon goTo={goTo} />}
      {page === "community" && <ComingSoon goTo={goTo} eyebrow="COMMUNAUTÉ · 3B" title="Communauté 3B" description="Profils, échanges, défis et modération sont en cours de finalisation pour ouvrir la communauté dans une version plus solide et plus claire." />}
      {page === "secret" && <PremierSecretPage goTo={goTo} dailySecret={secret} />}
      {page === "world3b" && <Suspense fallback={<AppLoadingState label="Ouverture du Monde 3B…" />}><WorldExperience goTo={goTo}/></Suspense>}
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
      {page === "control" && <ControlCenterPage goTo={goTo} />}
      {["ia", "ia-textile", "ia-trio"].includes(page) && <ComingSoon goTo={goTo} eyebrow="CRÉATION · 3B" title="Espace textile & IA" description="L’atelier textile, la maroquinerie et les outils IA 3B sont en cours de finition pour une expérience mobile plus lisible et plus fiable." />}
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


function PassportAccessGate({ goTo, options }) {
  return (
    <main className="intro3b" data-glow={options.premiumGlow} data-matrix={options.matrix}>
      <div className="intro3b-background" aria-hidden="true" />
      <div className={options.matrix ? "intro3b-matrix active" : "intro3b-matrix"} aria-hidden="true" />
      <section className="intro3b-card" aria-labelledby="passport-access-title">
        <p className="eyebrow">ACCÈS 3B</p>
        <h1 id="passport-access-title">Passeport 3B requis</h1>
        <p>Un seul Passeport 3B donne accès à l’écosystème 3B, y compris au Monde du 3B.</p>
        <Button variant="champagne" className="primary-button" onClick={() => goTo("passport")}>Ouvrir mon Passeport 3B</Button>
        <Button variant="ghost" className="ghost-button" onClick={() => goTo("member")}>Compte / activation</Button>
        <Button variant="ghost" className="ghost-button" onClick={() => goTo("home")}>Retour à l’accueil</Button>
      </section>
    </main>
  );
}

function PageHeader({ title, subtitle, goTo }) {
  return (
    <section className="page-header">
      <Button variant="ghost" className="ghost-button" onClick={() => goTo("home")}>
        ← Retour
      </Button>

      <div>
        <p className="eyebrow">3B International</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}

function PassportPage({ identity, syncing, goTo, options }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Passeport 3B"
        subtitle={syncing ? "Synchronisation…" : undefined}
        goTo={goTo}
      />

      <PassportVisual options={options} identity={identity} syncing={syncing} goTo={goTo} />
      <PassportVerification key={identity?.userId || 'visitor'} identity={identity} syncing={syncing} goTo={goTo} />
      {identity?.public_verified && identity?.public_badge_key === 'director_founder' && <SecretDirectorPanel />}

      {identity && <PassportAppearanceSettings identity={identity} />}

    </section>
  );
}
