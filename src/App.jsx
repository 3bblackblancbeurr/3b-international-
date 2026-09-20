import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";

const ShopPage = lazy(() => import("./shop/ShopPage.jsx"));
const AiPage = lazy(() => import("./ai/AiPage.jsx"));
import { readLocation, navigateTo } from "./lib/navigation.js";
import { STORAGE_MEMBER_KEY, STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS,
  createTestMember, normalizeMember, normalizeOptions,
  loadJsonStorage, saveJsonStorage } from "./lib/member.js";
import AppNavigation from "./components/AppNavigation.jsx";
import HomePage from "./components/HomePage.jsx";
import InstallApp from "./install/InstallApp.jsx";
import { isNativeApp } from "./native/runtime.js";
import NativeShopPage from "./native/NativeShopPage.jsx";
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
    description: "Kaïs, la Tour, le Labyrinthe et La course des clés. Accès libre.",
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

const MEMBER_MENU_ITEM = {
  id: "member",
  label: "Espace membre 3B",
  icon: "💎",
  description: "Profil, passeport, progression et paramètres.",
};

export default function App() {
  const installation = useAppInstallation();
  const [route, setRoute] = useState(readLocation);
  const { page } = route;
  const hasStarted = page !== "intro";
  const [storageNotice, setStorageNotice] = useState("");


  const loyalty = useLoyalty();
  const [localMember] = useState(() =>
    normalizeMember(loadJsonStorage(STORAGE_MEMBER_KEY, createTestMember()))
  );

  const member = loyalty.profile ? remoteMember(loyalty.profile) : localMember;
  const [options, setOptions] = useState(() =>
    normalizeOptions(loadJsonStorage(STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS))
  );

  const menuItems = useMemo(() => {
    if (member.isRegistered) {
      return [
        ...BASE_MENU_ITEMS.slice(0, 2),
        MEMBER_MENU_ITEM,
        ...BASE_MENU_ITEMS.slice(2),
      ];
    }

    return BASE_MENU_ITEMS;
  }, [member.isRegistered]);

  const currentPageTitle = useMemo(() => {
    if (page === "member") {
      return member.isRegistered ? "Espace membre 3B" : "Connexion / Inscription";
    }

    if (page === "ia-textile") return "IA textile";
    if (page === "ia-trio") return "Mode 3 IA";
    if (page === "home") return "Accueil";
    return menuItems.find((item) => item.id === page)?.label || "3B International";
  }, [page, menuItems, member.isRegistered]);

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
    const heading = document.querySelector("main h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, currentPageTitle]);

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

      {!['world3b','arena'].includes(page) && <AppNavigation page={page} title={currentPageTitle} menuItems={menuItems} goTo={goTo} />}
      <main id="main-content" tabIndex={-1}>
      <Suspense fallback={<div className="page-section" role="status">Ouverture de la rubrique…</div>}>
      <ExplorationRewards page={page}/>
      {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}

      {page === "home" && (
        <HomePage goTo={goTo} menuItems={menuItems} member={member} installation={installation} />
      )}

      {page === "passport" && (
        <PassportPage
          member={member}
          options={options}
          goTo={goTo}
        />
      )}

      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}
      {page === "games" && <GamesHub key={loyalty.user?.id || "guest"} goTo={goTo} />}
      {page === "religion" && <ReligionPage />}
      {page === "guide" && <GuidePage goTo={goTo} menuItems={[...BASE_MENU_ITEMS, MEMBER_MENU_ITEM]} />}
      {page === "manga" && <ComingSoon />}
      {page === "community" && <CommunityPage goTo={goTo} key={loyalty.user?.id || "guest"} />}
      {page === "secret" && <ComingSoon secret />}
      {page === "world3b" && <Suspense fallback={<div className="page-section">Ouverture du Monde 3B…</div>}><WorldExperience goTo={goTo}/></Suspense>}
      {page === "arena" && <div className="arena-standalone"><Suspense fallback={<p>Ouverture de l’arène…</p>}><ArenaExperience key={loyalty.user?.id||'guest'} onExit={()=>goTo('world3b')} onAccount={()=>goTo('member')}/></Suspense></div>}

      {page === "member" && (
        <AccountPage
          legacy={localMember}
          options={options}
          goTo={goTo}
          toggleOption={toggleOption}
        />
      )}

      {page === "sport" && <SportPage goTo={goTo} />}
      {["ia", "ia-textile", "ia-trio"].includes(page) && <AiPage key={loyalty.user?.id || "guest"} page={page} goTo={goTo} />}
      {page === "shop" && (isNativeApp() ? <NativeShopPage /> : <ShopPage key={route.search} goTo={goTo} reducedMotion={options.reducedMotion || !options.animations} />)}
      </Suspense>
      </main>
    </div>
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

function PassportPage({ member, goTo, options }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Passeport 3B"
        subtitle={
          member.isRegistered
            ? "Ton identité digitale dans l’univers 3B."
            : "Crée ton passeport 3B pour débloquer ton espace membre."
        }
        goTo={goTo}
      />

      <PassportVisual options={options} />

      <div className="info-grid">
        <article className="premium-panel">
          <p className="eyebrow">Identité digitale</p>
          <h2>{member.isRegistered ? member.passportId : "Non activé"}</h2>
          <p>
            Ton passeport est lié à ton compte 3B connecté. Un ancien profil local reste disponible sur cet appareil.
          </p>
        </article>

        <article className="premium-panel">
          <p className="eyebrow">Origine active</p>
          <h2>{member.originCountry || "France"}</h2>
          <p>
            Ton pays d’origine sera lié à ton passeport, à tes cartes et à tes
            futurs personnages 3B.
          </p>

          {!member.isRegistered && (
            <button type="button" className="primary-button" onClick={() => goTo("member")}>
              Activer mon passeport 3B
            </button>
          )}
        </article>
      </div>
    </section>
  );
}
