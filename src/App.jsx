import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const ShopPage = lazy(() => import("./shop/ShopPage.jsx"));
const AiPage = lazy(() => import("./ai/AiPage.jsx"));
const ControlCenterPage = lazy(() => import("./control/ControlCenterPage.jsx"));
import { controlCenterRequest } from "./control/client.js";
import { readLocation, navigateTo, navigateToGame } from "./lib/navigation.js";
import { ecosystemPublic } from "./lib/ecosystem.js";
import { STORAGE_MEMBER_KEY, STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS,
  createTestMember, normalizeMember, normalizeOptions,
  loadJsonStorage, saveJsonStorage } from "./lib/member.js";
import AppNavigation from "./components/AppNavigation.jsx";
import HomePage from "./components/HomePage.jsx";
import AppLoadingState from "./components/AppLoadingState.jsx";
import InstallApp from "./install/InstallApp.jsx";
import { useAppInstallation } from "./install/useAppInstallation.js";
import PassportVisual from "./components/PassportVisual.jsx";
const GamesHub = lazy(() => import("./games/GamesHub.jsx"));
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
import GuidePage from "./components/GuidePage.jsx";
import ComingSoon from "./components/ComingSoon.jsx";
import ReligionPage from "./components/ReligionPage.jsx";
const CommunityPage = lazy(() => import("./community/CommunityPage.jsx"));
import SportPage from "./sport/SportPage.jsx";
const WorldExperience=lazy(()=>import('./world/WorldEntry.jsx'));
const ArenaExperience=lazy(()=>import('./arena/ArenaPage.jsx'));

const BASE_MENU_ITEMS = [
  { id: "guide", label: "Guide & XP", description: "Tous les menus, les gains et les niveaux expliqués." },
  {
    id: "passport",
    label: "Passeport 3B",
    icon: "▣",
    description: "Créer son identité digitale 3B.",
  },
  {
    id: "loyalty",
    label: "Cartes de fidélité",
    icon: "💳",
    description: "Fidélité vêtements et accessoires, remises et collection XP.",
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
    description: "Huit pays vivants, des personnages et créatures à rencontrer, des lieux à reconstruire.",
  },
  {
    id: "games",
    label: "Jeux 3B",
    icon: "🎮",
    description: "Kaïs, les Portes, le Labyrinthe, la course des clés et DADA 3B réunis dans l’univers 3B.",
  },
  {
    id: "religion",
    label: "Religion",
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
    label: "Secret 3B",
    icon: "🔐",
    description: "Le prochain chapitre se prépare.",
  },
  {
    id: "sport",
    label: "Espace sport 3B",
    icon: "🏆",
    description: "Actualités multisports, défis et collaborations.",
  },
  {
    id: "ia",
    label: "Espace IA",
    icon: "⚙️",
    description: "Atelier textile et maroquinerie, GPT, Claude et Gemini.",
  },
  {
    id: "shop",
    label: "Boutique",
    icon: "🛍️",
    description: "Drops, produits premium et certificats.",
  },
];

const CONTROL_MENU_ITEM = {
  id: "control",
  label: "Centre de commande 3B",
  icon: "⌁",
  description: "Piloter ton PC, Unreal et les outils 3B depuis tes appareils.",
};

const MEMBER_MENU_ITEM = {
  id: "member",
  label: "Espace membre 3B",
  icon: "💎",
  description: "Profil, passeport, progression et paramètres.",
};

export default function App() {
  const installation = useAppInstallation();
  const [route, setRoute] = useState(readLocation);
  const { page, gameSlug } = route;
  const hasStarted = page !== "intro";
  const [storageNotice, setStorageNotice] = useState("");
  const [controlAvailable, setControlAvailable] = useState(false);


  const loyalty = useLoyalty();
  const [localMember] = useState(() =>
    normalizeMember(loadJsonStorage(STORAGE_MEMBER_KEY, createTestMember()))
  );

  const member = loyalty.profile ? remoteMember(loyalty.profile) : createTestMember();
  const [options, setOptions] = useState(() =>
    normalizeOptions(loadJsonStorage(STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS))
  );

  useEffect(() => {
    let active = true;
    if (!loyalty.user?.id) {
      setControlAvailable(false);
      return () => { active = false; };
    }
    controlCenterRequest("status")
      .then(() => { if (active) setControlAvailable(true); })
      .catch(() => { if (active) setControlAvailable(false); });
    return () => { active = false; };
  }, [loyalty.user?.id]);

  const menuItems = useMemo(() => {
    if (member.isRegistered) {
      return [
        ...BASE_MENU_ITEMS.slice(0, 2),
        MEMBER_MENU_ITEM,
        ...(controlAvailable ? [CONTROL_MENU_ITEM] : []),
        ...BASE_MENU_ITEMS.slice(2),
      ];
    }

    return BASE_MENU_ITEMS;
  }, [member.isRegistered, controlAvailable]);

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
    const heading = document.querySelector("main h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page, currentPageTitle, menuItems]);

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
    return (
      <main className="intro3b" data-glow={options.premiumGlow} data-matrix={options.matrix}>
        <div className="intro3b-background" aria-hidden="true" />
        <div className={options.matrix ? "intro3b-matrix active" : "intro3b-matrix"} aria-hidden="true" />

        <section className="intro3b-card">
          <p className="eyebrow">3B International</p>
          <p className="eyebrow brand-glow-badge">BLACK • BLANC • BEUR</p>
          <h1>De zéro à l’international</h1>
          <p>
            Un écosystème premium pour ton passeport, tes cartes, tes jeux, ton
            manga, ton monde 3B et ton héritage.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => goTo("home")}
          >
            COMMENCER
          </button>
          <InstallApp installation={installation} />
        </section>
      </main>
    );
  }

  return (
    <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
      <div className="app3b-background" aria-hidden="true" />
      <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} aria-hidden="true" />

      {!['world3b','arena','game'].includes(page) && <AppNavigation page={page} title={currentPageTitle} menuItems={menuItems} goTo={goTo} />}
      <main id="main-content" tabIndex={-1}>
      <div className="route-announcer" aria-live="polite" aria-atomic="true">{currentPageTitle}</div>
      <Suspense fallback={<AppLoadingState label={`Ouverture · ${currentPageTitle}`} />}>
      <ExplorationRewards page={page}/>
      {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}

      {page === "home" && (
        <HomePage goTo={goTo} menuItems={menuItems} member={member} installation={installation} />
      )}

      {page === "passport" && (
        <PassportPage
          identity={loyalty.passport}
          syncing={loyalty.loading || (!!loyalty.user && !loyalty.profile)}
          options={options}
          goTo={goTo}
        />
      )}

      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}
      {page === "games" && <GamesHub key={loyalty.user?.id || "guest"} goTo={goTo} goToGame={goToGame} />}
      {page === "game" && <RemoteGamePage slug={gameSlug} onBack={() => goTo("games")} />}
      {page === "religion" && <ReligionPage />}
      {page === "guide" && <GuidePage goTo={goTo} menuItems={[...BASE_MENU_ITEMS, MEMBER_MENU_ITEM]} />}
      {page === "manga" && <ComingSoon goTo={goTo} />}
      {page === "community" && <CommunityPage goTo={goTo} key={loyalty.user?.id || "guest"} />}
      {page === "secret" && <ComingSoon secret goTo={goTo} />}
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
      {["ia", "ia-textile", "ia-trio"].includes(page) && <AiPage key={loyalty.user?.id || "guest"} page={page} goTo={goTo} />}
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
            <h1>{status === "error" ? "Penalty Rush indisponible" : "Ouverture de Penalty Rush…"}</h1>
            <p>{status === "error" ? error : "Connexion au terrain 3B et à ton compte."}</p>
            {status === "error" && (
              <button type="button" className="primary-button" onClick={() => onBackRef.current?.()}>
                ← Retour Jeux 3B
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PageHeader({ title, subtitle, goTo }) {
  return (
    <section className="page-header">
      <button type="button" className="ghost-button" onClick={() => goTo("home")}>
        ← Retour
      </button>

      <div>
        <p className="eyebrow">3B International</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}

function PassportPage({ identity, syncing, goTo, options }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Passeport 3B"
        subtitle={
          syncing
            ? "Synchronisation sécurisée de ton identité 3B."
            : identity
              ? `Passeport personnel de ${identity.name} · ${identity.country}.`
              : "Crée ton compte pour générer ton passeport 3B personnel."
        }
        goTo={goTo}
      />

      <PassportVisual options={options} identity={identity} syncing={syncing} goTo={goTo} />

      <div className="info-grid">
        <article className="premium-panel">
          <p className="eyebrow">Identité unique 3B</p>
          <h2>{syncing ? "Synchronisation…" : identity ? identity.passportId : "Non activé"}</h2>
          <p>
            Le passeport lit uniquement le profil du compte connecté. Jeux, Monde 3B, Ville 3B, fidélité et boutique utilisent le même identifiant utilisateur.
          </p>
        </article>

        <article className="premium-panel">
          <p className="eyebrow">Origine du titulaire</p>
          <h2>{identity ? `${identity.flag} ${identity.country}` : "À définir à l’inscription"}</h2>
          <p>
            Le pays enregistré dans ton compte devient l’origine de référence de ton passeport et des expériences 3B qui utilisent cette identité.
          </p>

          {!identity && !syncing && (
            <button type="button" className="primary-button" onClick={() => goTo("member")}>
              Activer mon passeport 3B
            </button>
          )}
        </article>
      </div>
    </section>
  );
}
