import React, { useMemo, useState } from "react";
import Jeu3B from "./Jeu3B.jsx";
import ExplorerAvatar3B from "./components/ExplorerAvatar3B.jsx";
import "./App.css";
import "./styles/passport-live.css";

const STORAGE_MEMBER_KEY = "3b_member_passport_v3_final";
const STORAGE_OPTIONS_KEY = "3b_options_v3_final";

const COUNTRIES = [
  { name: "France", flag: "🇫🇷", status: "Déverrouillé", code: "FR", active: true },
  { name: "Italie", flag: "🇮🇹", status: "Verrouillé", code: "IT", active: false },
  { name: "Estonie", flag: "🇪🇪", status: "Verrouillé", code: "EE", active: false },
  { name: "Turquie", flag: "🇹🇷", status: "Verrouillé", code: "TR", active: false },
  { name: "Algérie", flag: "🇩🇿", status: "Verrouillé", code: "DZ", active: false },
  { name: "Tunisie", flag: "🇹🇳", status: "Verrouillé", code: "TN", active: false },
  { name: "Maroc", flag: "🇲🇦", status: "Verrouillé", code: "MA", active: false },
  { name: "Espagne", flag: "🇪🇸", status: "Verrouillé", code: "ES", active: false },
];

const MENU_ITEMS = [
  {
    id: "boutique",
    label: "Boutique",
    icon: "🛍️",
    description: "Produits premium, drops et collections.",
  },
  {
    id: "musique",
    label: "Musique",
    icon: "♪",
    description: "20 cases prêtes pour vos fichiers audio.",
  },
  {
    id: "communaute",
    label: "Communauté",
    icon: "👥",
    description: "Échange, réseau et espace de discussion 3B.",
  },
  {
    id: "passport",
    label: "Passeport 3B",
    icon: "▣",
    description: "Ton passeport numérique premium.",
  },
  {
    id: "manga",
    label: "Manga",
    icon: "📖",
    description: "Histoire, chapitres, personnages et univers narratif 3B.",
  },
  {
    id: "monde3b",
    label: "Le Monde du 3B",
    icon: "🌍",
    description: "Carte mondiale, pays, origines et univers 3B.",
  },
  {
    id: "jeux",
    label: "Jeux",
    icon: "🎮",
    description: "Jeu 3B, XP, progression et classement.",
  },
  {
    id: "secret",
    label: "Coffre secret 3B",
    icon: "🔐",
    description: "Saisir le code secret pour débloquer l’indice.",
  },
  {
    id: "membre",
    label: "Espace membre 3B",
    icon: "💎",
    description: "Profil, suivi, progression et avantages.",
  },
  {
    id: "bis",
    label: "Encore / Bis",
    icon: "★",
    description: "Créateurs, extras, certificats et futures extensions.",
  },
  {
    id: "sport",
    label: "Espace sport 3B",
    icon: "🏆",
    description: "Clubs, maillots, défis et classements.",
  },
  {
    id: "ia",
    label: "Espace / IA",
    icon: "⚙️",
    description: "Studio futur, assistant IA et automatisations.",
  },
];

const LOYALTY_CARDS = [
  { name: "Découverte", status: "Active", variant: "blue", progress: 100 },
  { name: "Héritier", status: "Active", variant: "black", progress: 83 },
  { name: "Gardien", status: "Verrouillée", variant: "dark", progress: 0 },
  { name: "Légende", status: "Verrouillée", variant: "gold", progress: 0 },
  { name: "Explorateur", status: "Verrouillée", variant: "blue", progress: 0 },
  { name: "Stratège", status: "Verrouillée", variant: "black", progress: 0 },
  { name: "Visionnaire", status: "Verrouillée", variant: "gold", progress: 0 },
  { name: "Élite", status: "Verrouillée", variant: "silver", progress: 0 },
  { name: "Alliance", status: "Verrouillée", variant: "silver", progress: 0 },
  { name: "Maître", status: "Verrouillée", variant: "black", progress: 0 },
  { name: "Prime", status: "Verrouillée", variant: "gold", progress: 0 },
  { name: "Éternel", status: "Verrouillée", variant: "dark", progress: 0 },
];

const PASSPORT_WORLD_POINTS = {
  France: { left: "22.8%", top: "27.4%" },
  Espagne: { left: "11.4%", top: "33.4%" },
  Maroc: { left: "14.8%", top: "36.7%" },
  Algérie: { left: "25.2%", top: "37.3%" },
  Tunisie: { left: "31.4%", top: "37.8%" },
  Italie: { left: "27.5%", top: "30.1%" },
  Estonie: { left: "35.9%", top: "22.6%" },
  Turquie: { left: "37.9%", top: "34.6%" },
};

const PASSPORT_ZOOM_POINTS = {
  France: { left: "18.4%", top: "49.9%" },
  Espagne: { left: "10.6%", top: "54.1%" },
  Maroc: { left: "14.3%", top: "55.2%" },
  Algérie: { left: "21.0%", top: "56.8%" },
  Tunisie: { left: "28.9%", top: "56.8%" },
  Italie: { left: "23.5%", top: "51.8%" },
  Estonie: { left: "32.8%", top: "47.7%" },
  Turquie: { left: "38.2%", top: "53.1%" },
};

const PASSPORT_MATRIX_STREAMS = [
  "01010110100101100101011010010110",
  "3B01013B01013B01013B01013B01013B",
  "11001100110011001100110011001100",
  "AES256AES256AES256AES256AES256AE",
  "00110011001100110011001100110011",
  "FRITEETRDZTNMAES3BGLOBAL010101",
  "10100101101001011010010110100101",
  "MEMBRE3BMEMBRE3BMEMBRE3B00001111",
  "01013B884213B7360202601010101010",
  "IDENTITESECURISEE3BIDENTITE0001",
  "01101101011011010110110101101101",
  "DATASAFE3BDATASAFE3BDATASAFE3B0",
  "11100011100011100011100011100011",
  "3BPASS21773BPASS21773BPASS21770",
  "00011100011100011100011100011100",
  "SECURE3B010101SECURE3B01010101",
];

const PASSPORT_BOTTOM_ROWS = [
  "BIOMETRIE VERIFIEE • AES-256 • DONNEES CHIFFREES • SYSTEME SECURISE",
  "3B IDENTITE NUMERIQUE • ACCES GLOBAL • MEMBRE HERITAGE • FRANCE",
  "0101 3B GLOBAL 0011 ACCESS 24/7 FR DZ MA TN TR ES IT EE",
];

function createMember() {
  return {
    name: "Zakaria",
    email: "3bblackblancbeurr@gmail.com",
    memberId: "3B-MEM-88421",
    passportId: "3B-PASS-2177",
    status: "Membre 3B",
    level: "Héritier",
    points: 250,
    country: "France",
    originCountry: "France",
    city: "Paris",
    createdAt: "24/05/2026",
    avatar: "Héritier",
  };
}

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [page, setPage] = useState("home");
  const [secretCode, setSecretCode] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);

  const [member] = useState(() => {
    const saved = localStorage.getItem(STORAGE_MEMBER_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...createMember(),
          ...parsed,
          originCountry: parsed.originCountry || parsed.country || "France",
        };
      } catch {
        return createMember();
      }
    }

    const newMember = createMember();
    localStorage.setItem(STORAGE_MEMBER_KEY, JSON.stringify(newMember));
    return newMember;
  });

  const [options, setOptions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_OPTIONS_KEY);

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { animation: true, matrix: true, sound: false };
      }
    }

    return { animation: true, matrix: true, sound: false };
  });

  const currentPageTitle = useMemo(() => {
    const item = MENU_ITEMS.find((entry) => entry.id === page);
    return item?.label || "3B International";
  }, [page]);

  function updateOption(key) {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    localStorage.setItem(STORAGE_OPTIONS_KEY, JSON.stringify(next));
  }

  function goTo(nextPage) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToIntro() {
    setHasStarted(false);
    setPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSecret() {
    const normalized = secretCode.trim().toLowerCase();
    if (normalized === "italie") {
      setSecretOpen(true);
    }
  }

  if (!hasStarted) {
    return (
      <main className="intro-screen-3b">
        <div className="intro-overlay-3b" />

        <section className="intro-brand-3b">
          <p className="intro-kicker">3B International</p>
          <h1 className="intro-title-3b">De zéro à l’international</h1>
          <p className="intro-subtitle-3b">
            Votre passeport, vos jeux, vos cartes, votre monde 3B. Un centre
            premium pour construire l’héritage.
          </p>

          <button
            className="intro-button-3b"
            onClick={() => setHasStarted(true)}
            type="button"
          >
            COMMENCER
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-backdrop" />
      <div className="matrix-layer" />

      <header className="top-bar-3b">
        <button
          className="back-button-3b"
          onClick={() => goTo("home")}
          type="button"
        >
          Accueil
        </button>

        <div>
          <p>3B International</p>
          <strong>{currentPageTitle}</strong>
        </div>

        <button className="back-button-3b" onClick={goToIntro} type="button">
          Entrée
        </button>
      </header>

      {page === "home" && <HomePage member={member} goTo={goTo} />}

      {page === "passport" && (
        <PassportPage member={member} goTo={goTo} goToIntro={goToIntro} />
      )}

      {page === "membre" && <MemberPage member={member} goTo={goTo} />}

      {page === "jeux" && (
        <section className="page-section game-page">
          <PageHeader
            title="Jeux 3B"
            subtitle="QCM, mot mélangé, mémoire, code secret, intrus, suite logique, compléter, mot croisé et mot fléché."
            goTo={goTo}
          />
          <Jeu3B />
        </section>
      )}

      {page === "secret" && (
        <SecretPage
          secretCode={secretCode}
          setSecretCode={setSecretCode}
          secretOpen={secretOpen}
          openSecret={openSecret}
          goTo={goTo}
        />
      )}

      {page === "sport" && <SportPage goTo={goTo} />}
      {page === "musique" && <SimplePremiumPage type="musique" goTo={goTo} />}
      {page === "communaute" && (
        <SimplePremiumPage type="communaute" goTo={goTo} />
      )}
      {page === "boutique" && <SimplePremiumPage type="boutique" goTo={goTo} />}
      {page === "manga" && <SimplePremiumPage type="manga" goTo={goTo} />}
      {page === "monde3b" && (
        <SimplePremiumPage type="monde3b" goTo={goTo} />
      )}
      {page === "bis" && <SimplePremiumPage type="bis" goTo={goTo} />}
      {page === "ia" && <SimplePremiumPage type="ia" goTo={goTo} />}

      {page === "options" && (
        <OptionsPage
          options={options}
          updateOption={updateOption}
          goTo={goTo}
        />
      )}
    </main>
  );
}

function PageHeader({ title, subtitle, goTo }) {
  return (
    <div className="page-header-3b">
      <button
        className="back-button-3b"
        onClick={() => goTo("home")}
        type="button"
      >
        ← Retour
      </button>

      <div>
        <p className="eyebrow">3B International</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function HomePage({ member, goTo }) {
  return (
    <section className="home-5050-layout">
      <div className="home-left-panel">
        <p className="eyebrow">3B International</p>
        <h1>Vêtements haut de gamme</h1>
        <p className="brand-sentence">
          BLACK • BLANC • BEUR — ce n’est pas une marque, c’est un héritage.
        </p>

        <div className="welcome-card-3b">
          <span>Membre 3B</span>
          <h2>Bienvenue {member.name} dans l’écosystème 3B</h2>
          <p>
            Votre passeport est actif. Continuez vos missions, vos jeux et votre
            progression.
          </p>
        </div>
      </div>

      <div className="home-right-panel">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            className="menu-card-3b"
            onClick={() => goTo(item.id)}
            type="button"
          >
            <span className="menu-card-icon">{item.icon}</span>
            <span className="menu-card-content">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <span className="menu-arrow">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PassportPage({ member, goTo, goToIntro }) {
  const selectedCountryName = member?.originCountry || member?.country || "France";

  const countryOrder = [
    "France",
    "Italie",
    "Estonie",
    "Turquie",
    "Algérie",
    "Tunisie",
    "Maroc",
    "Espagne",
  ];

  const worldPoints = {
    France: { left: "22.8%", top: "18.8%" },
    Italie: { left: "26.8%", top: "23.4%" },
    Estonie: { left: "33.8%", top: "16.5%" },
    Turquie: { left: "37.9%", top: "24.8%" },
    Algérie: { left: "25.8%", top: "31.6%" },
    Tunisie: { left: "31.8%", top: "31.8%" },
    Maroc: { left: "17.8%", top: "28.8%" },
    Espagne: { left: "12.8%", top: "24.2%" },
  };

  const zoomPoints = {
    France: { left: "18.8%", top: "48.6%" },
    Italie: { left: "24.2%", top: "49.9%" },
    Estonie: { left: "32.8%", top: "43.6%" },
    Turquie: { left: "39.2%", top: "51.1%" },
    Algérie: { left: "21.4%", top: "56.0%" },
    Tunisie: { left: "28.6%", top: "56.1%" },
    Maroc: { left: "14.4%", top: "54.4%" },
    Espagne: { left: "10.4%", top: "51.8%" },
  };

  const safeSelectedCountry = worldPoints[selectedCountryName]
    ? selectedCountryName
    : "France";

  const selectedZoomPoint = zoomPoints[safeSelectedCountry] || zoomPoints.France;
  const selectedWorldPoint = worldPoints[safeSelectedCountry] || worldPoints.France;

  const worldLabelOffsets = {
    France: { left: "1.1%", top: "-3.8%" },
    Italie: { left: "1.0%", top: "-3.6%" },
    Estonie: { left: "1.0%", top: "-3.5%" },
    Turquie: { left: "1.1%", top: "-3.8%" },
    Algérie: { left: "1.0%", top: "-3.5%" },
    Tunisie: { left: "1.0%", top: "-3.5%" },
    Maroc: { left: "1.0%", top: "-3.5%" },
    Espagne: { left: "1.0%", top: "-3.5%" },
  };

  const selectedWorldLabelOffset =
    worldLabelOffsets[safeSelectedCountry] || worldLabelOffsets.France;

  const matrixStreams = [
    "01010110100101100101011010010110",
    "3B01013B01013B01013B01013B01013B",
    "11001100110011001100110011001100",
    "AES256AES256AES256AES256AES256AE",
    "00110011001100110011001100110011",
    "FRITEETRDZTNMAES3BGLOBAL010101",
    "10100101101001011010010110100101",
    "MEMBRE3BMEMBRE3BMEMBRE3B00001111",
    "01013B884213B7360202601010101010",
    "IDENTITESECURISEE3BIDENTITE0001",
    "01101101011011010110110101101101",
    "DATASAFE3BDATASAFE3BDATASAFE3B0",
    "11100011100011100011100011100011",
    "3BPASS21773BPASS21773BPASS21770",
    "00011100011100011100011100011100",
    "SECURE3B010101SECURE3B01010101",
  ];

  const bottomRows = [
    "BIOMETRIE VERIFIEE • AES-256 • DONNEES CHIFFREES • SYSTEME SECURISE",
    "3B IDENTITE NUMERIQUE • ACCES GLOBAL • MEMBRE HERITAGE • FRANCE",
    "0101 3B GLOBAL 0011 ACCESS 24/7 FR DZ MA TN TR ES IT EE",
  ];

  return (
    <main className="passport-final-page">
      <style>{`
        .passport-premium-v6-stage {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          transform: none !important;
          perspective: 1400px;
          will-change: auto;
        }

        .passport-premium-v6-stage:hover {
          transform: none !important;
        }

        .passport-premium-v6-base {
          display: block;
          width: 100%;
          height: auto;
          position: relative;
          z-index: 1;
          transform: none !important;
          filter: saturate(1.03) contrast(1.03);
        }

        .passport-v6-hotspot {
          position: absolute;
          z-index: 40;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .passport-v6-home {
          left: 1.2%;
          top: 1.9%;
          width: 10.5%;
          height: 6.8%;
          border-radius: 999px;
        }

        .passport-v6-entry {
          right: 1.6%;
          top: 2%;
          width: 10.2%;
          height: 6.8%;
          border-radius: 999px;
        }

        .passport-v6-world-points,
        .passport-v6-matrix-zone,
        .passport-v6-bottom-matrix,
        .passport-v6-zoom-origin,
        .passport-v6-head-window,
        .passport-v6-soft-3b,
        .passport-v6-circuit {
          position: absolute;
          pointer-events: none;
        }

        .passport-v6-world-points {
          inset: 0;
          z-index: 14;
        }

        .passport-v6-world-point {
          position: absolute;
          width: 0.88%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .passport-v6-world-point::after {
          content: "";
          position: absolute;
          inset: -70%;
          border-radius: 999px;
          animation: passportV6PointRing 2.5s ease-out infinite;
        }

        .passport-v6-world-point.is-yellow {
          background: #ffe45c;
          box-shadow:
            0 0 6px rgba(255, 231, 100, 1),
            0 0 14px rgba(255, 231, 100, 0.78),
            0 0 22px rgba(255, 210, 54, 0.45);
        }

        .passport-v6-world-point.is-yellow::after {
          border: 1px solid rgba(255, 229, 92, 0.42);
        }

        .passport-v6-world-point.is-red {
          background: #ff3131;
          box-shadow:
            0 0 7px rgba(255, 70, 70, 1),
            0 0 16px rgba(255, 70, 70, 0.9),
            0 0 26px rgba(255, 20, 20, 0.55);
        }

        .passport-v6-world-point.is-red::after {
          border: 1px solid rgba(255, 76, 76, 0.55);
        }

        .passport-v6-world-label {
          position: absolute;
          z-index: 17;
          transform: translate(-50%, -50%);
          padding: 0.24% 0.6%;
          border-radius: 999px;
          border: 1px solid rgba(255, 214, 92, 0.88);
          background: rgba(6, 12, 30, 0.92);
          color: #fff0a8;
          font-size: clamp(7px, 0.7vw, 12px);
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow:
            0 0 8px rgba(255, 217, 84, 0.35),
            inset 0 0 8px rgba(255, 226, 126, 0.08);
          pointer-events: none;
          white-space: nowrap;
        }

        .passport-v6-zoom-origin {
          z-index: 15;
          width: 1.12%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: #ff3636;
          box-shadow:
            0 0 8px rgba(255, 74, 74, 1),
            0 0 18px rgba(255, 74, 74, 0.92),
            0 0 30px rgba(255, 40, 40, 0.64);
          animation: passportV6MiniOrigin 2.2s ease-in-out infinite;
        }

        .passport-v6-zoom-origin::after {
          content: "";
          position: absolute;
          inset: -115%;
          border-radius: 999px;
          border: 1px solid rgba(255, 80, 80, 0.5);
          animation: passportV6MiniRing 2.2s ease-out infinite;
        }

        .passport-v6-matrix-zone {
          z-index: 12;
          left: 41.2%;
          top: 12.1%;
          width: 33.5%;
          height: 43.8%;
          overflow: hidden;
          opacity: 0.95;
          mix-blend-mode: screen;
        }

        .passport-v6-matrix-stream {
          position: absolute;
          top: -145%;
          white-space: pre;
          font-family: "Courier New", monospace;
          font-size: clamp(5px, 0.45vw, 9px);
          line-height: 1;
          letter-spacing: 0.38px;
          color: rgba(96, 244, 255, 0.9);
          text-shadow:
            0 0 5px rgba(58, 215, 255, 0.9),
            0 0 12px rgba(58, 215, 255, 0.5);
          writing-mode: vertical-rl;
          text-orientation: upright;
          animation-name: passportV6MatrixDrop;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .passport-v6-bottom-matrix {
          z-index: 12;
          left: 35.6%;
          top: 52.4%;
          width: 38.5%;
          height: 8.4%;
          overflow: hidden;
          mix-blend-mode: screen;
        }

        .passport-v6-bottom-strip {
          position: absolute;
          left: 0;
          white-space: nowrap;
          font-family: "Courier New", monospace;
          font-size: clamp(6px, 0.54vw, 10px);
          letter-spacing: 0.8px;
          color: rgba(98, 245, 255, 0.88);
          text-shadow: 0 0 9px rgba(50, 210, 255, 0.65);
          opacity: 0.9;
          animation: passportV6DataFlow 13s linear infinite;
        }

        .passport-v6-bottom-strip:nth-child(1) { top: 6%; }
        .passport-v6-bottom-strip:nth-child(2) { top: 38%; animation-duration: 15s; }
        .passport-v6-bottom-strip:nth-child(3) { top: 70%; animation-duration: 17s; }

        .passport-v6-head-window {
          z-index: 16;
          left: 58.3%;
          top: 17.9%;
          width: 13.6%;
          height: 27.9%;
          overflow: hidden;
          transform-origin: 50% 75%;
          animation: passportV6HeadNeckTurn 6.4s ease-in-out infinite;
          filter: brightness(1.08) saturate(1.06);
          mix-blend-mode: screen;
        }

        .passport-v6-head-window img {
          position: absolute;
          left: -429%;
          top: -64.2%;
          width: 735%;
          height: auto;
          max-width: none;
          transform-origin: 66.1% 34.5%;
        }

        .passport-v6-soft-3b {
          z-index: 8;
          inset: 0;
          background-image: url("/passport-digital-3bv2.png");
          background-size: 100% 100%;
          background-repeat: no-repeat;
          clip-path: inset(22% 48.2% 35.5% 31.2% round 10px);
          opacity: 0.22;
          mix-blend-mode: screen;
          animation: passportV6Soft3B 4.2s ease-in-out infinite;
        }

        .passport-v6-circuit {
          z-index: 9;
          inset: 0;
          background-image: url("/passport-digital-3bv2.png");
          background-size: 100% 100%;
          background-repeat: no-repeat;
          clip-path: inset(39.5% 41.5% 32.4% 33.5% round 10px);
          opacity: 0.38;
          mix-blend-mode: screen;
          animation: passportV6Circuit 3.6s ease-in-out infinite;
        }

        @keyframes passportV6PointRing {
          0% { transform: scale(0.72); opacity: 0.82; }
          100% { transform: scale(2.15); opacity: 0; }
        }

        @keyframes passportV6MiniOrigin {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.16); }
        }

        @keyframes passportV6MiniRing {
          0% { transform: scale(0.72); opacity: 0.86; }
          100% { transform: scale(2.05); opacity: 0; }
        }

        @keyframes passportV6MatrixDrop {
          0% { transform: translateY(-6%); opacity: 0.16; }
          8% { opacity: 0.82; }
          85% { opacity: 0.96; }
          100% { transform: translateY(155%); opacity: 0.08; }
        }

        @keyframes passportV6DataFlow {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-22%); }
        }

        @keyframes passportV6HeadNeckTurn {
          0%, 100% { transform: perspective(1200px) rotateY(0deg) translateX(0); }
          25% { transform: perspective(1200px) rotateY(-10deg) translateX(-1.6%); }
          50% { transform: perspective(1200px) rotateY(0deg) translateX(0); }
          75% { transform: perspective(1200px) rotateY(10deg) translateX(1.6%); }
        }

        @keyframes passportV6Soft3B {
          0%, 100% { opacity: 0.18; filter: brightness(1); }
          50% { opacity: 0.34; filter: brightness(1.16); }
        }

        @keyframes passportV6Circuit {
          0%, 100% { opacity: 0.24; filter: brightness(1); }
          50% { opacity: 0.48; filter: brightness(1.2); }
        }

        @media (max-width: 768px) {
          .passport-v6-matrix-stream {
            font-size: clamp(4px, 0.8vw, 7px);
          }

          .passport-v6-bottom-strip {
            font-size: clamp(4px, 0.72vw, 7px);
          }

          .passport-v6-zoom-origin {
            width: 1.75%;
          }

          .passport-v6-world-point {
            width: 1.35%;
          }
        }
      `}</style>

      <section className="passport-live-stage passport-premium-v6-stage">
        <img
          src="/passport-digital-3bv2.png"
          alt="Passeport Digital 3B"
          className="passport-live-image passport-premium-v6-base"
        />

        <button
          type="button"
          className="passport-v6-hotspot passport-v6-home"
          onClick={() => goTo("home")}
          aria-label="Retour accueil"
        />

        <button
          type="button"
          className="passport-v6-hotspot passport-v6-entry"
          onClick={() => (goToIntro ? goToIntro() : goTo("home"))}
          aria-label="Retour entrée"
        />

        <div className="passport-v6-world-points" aria-hidden="true">
          {countryOrder.map((countryName) => {
            const point = worldPoints[countryName];
            const isSelected = countryName === safeSelectedCountry;

            return (
              <span
                key={countryName}
                className={`passport-v6-world-point ${
                  isSelected ? "is-red" : "is-yellow"
                }`}
                style={{ left: point.left, top: point.top }}
              />
            );
          })}
        </div>

        <span
          className="passport-v6-world-label"
          aria-hidden="true"
          style={{
            left: `calc(${selectedWorldPoint.left} + ${selectedWorldLabelOffset.left})`,
            top: `calc(${selectedWorldPoint.top} + ${selectedWorldLabelOffset.top})`,
          }}
        >
          {safeSelectedCountry}
        </span>

        <span
          className="passport-v6-zoom-origin"
          aria-hidden="true"
          style={{ left: selectedZoomPoint.left, top: selectedZoomPoint.top }}
        />

        <div className="passport-v6-matrix-zone" aria-hidden="true">
          {matrixStreams.map((stream, index) => (
            <span
              key={`${stream}-${index}`}
              className="passport-v6-matrix-stream"
              style={{
                left: `${2 + index * 6.1}%`,
                animationDelay: `${index * -0.42}s`,
                animationDuration: `${5.3 + (index % 6) * 0.55}s`,
              }}
            >
              {stream}
            </span>
          ))}
        </div>

        <div className="passport-v6-bottom-matrix" aria-hidden="true">
          {bottomRows.map((row) => (
            <span key={row} className="passport-v6-bottom-strip">
              {row}
            </span>
          ))}
        </div>

        <div className="passport-v6-head-window" aria-hidden="true">
          <img src="/passport-digital-3bv2.png" alt="" />
        </div>

        <div className="passport-v6-soft-3b" aria-hidden="true" />
        <div className="passport-v6-circuit" aria-hidden="true" />
      </section>
    </main>
  );
}

function WorldMapPanel() {
  return (
    <section className="world-map-card">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Accès mondial 3B</p>
          <h2>Carte du monde 3B</h2>
        </div>
        <span className="status-pill active">24/7</span>
      </div>

      <div className="world-map-visual">
        <div className="map-line one" />
        <div className="map-line two" />
        <div className="map-line three" />

        <span className="map-point france">France</span>
        <span className="map-point italy">Italie</span>
        <span className="map-point estonia">Estonie</span>
        <span className="map-point turkey">Turquie</span>
        <span className="map-point algeria">Algérie</span>
        <span className="map-point tunisia">Tunisie</span>
        <span className="map-point morocco">Maroc</span>
        <span className="map-point spain">Espagne</span>
      </div>

      <div className="mini-stats-grid">
        <div>
          <strong>196</strong>
          <span>Pays connectés</span>
        </div>

        <div>
          <strong>24/7</strong>
          <span>Accès global</span>
        </div>
      </div>
    </section>
  );
}

function ZoomMapPanel() {
  return (
    <section className="digital-world-zoom">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Focus régional</p>
          <h2>Zoom 8 pays officiels</h2>
        </div>
        <span className="status-pill">Europe / Méditerranée</span>
      </div>

      <div className="zoom-map-visual">
        {COUNTRIES.map((country) => (
          <span
            key={country.name}
            className={`zoom-country ${
              country.active ? "active" : "locked-country"
            }`}
          >
            <span className="living-flag">{country.flag}</span>
            {country.name}
          </span>
        ))}
      </div>
    </section>
  );
}

function CountryStatusPanel() {
  return (
    <section className="country-status-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Pays 3B</p>
          <h2>Pays actifs et verrouillés</h2>
        </div>
      </div>

      <div className="countries-list">
        {COUNTRIES.map((country) => (
          <div
            key={country.name}
            className={`country-row ${
              country.active ? "unlocked-country" : "locked-country"
            }`}
          >
            <span>{country.active ? "✓" : "🔒"}</span>
            <span className="living-flag">{country.flag}</span>
            <strong>
              {country.active ? "Déverrouillé" : "Verrouillé"} : {country.name}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemberPage({ member, goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Espace membre 3B"
        subtitle="Tableau de bord, statut, points, cartes, avantages, progression et avatar."
        goTo={goTo}
      />

      <div className="member-grid">
        <section className="member-summary-card">
          <div>
            <p className="eyebrow">Résumé actuel</p>
            <h2>{member.level}</h2>
            <p>Points actuels : {member.points}</p>
            <p>Carte actuelle : Carte Découverte 3B</p>
          </div>

          <div className="member-hero-card">
            <div className="shield-3b">3B</div>
            <div className="mini-digital-card">
              <span>3B International</span>
              <strong>Membre {member.level}</strong>
              <small>{member.points} pts</small>
            </div>
          </div>
        </section>

        <section className="progression-card">
          <div>
            <p className="eyebrow">Progression vers Gardien</p>
            <h2>83% remplis</h2>
            <p>Objectif : 300 points</p>
            <p>Récompense : accès renforcé aux missions, indices et cartes.</p>
          </div>

          <div className="progress-ring big">
            <span>83%</span>
          </div>
        </section>

        <section className="progression-card">
          <div>
            <p className="eyebrow">Progression vers Légende</p>
            <h2>25% remplis</h2>
            <p>Objectif : 1000 points</p>
            <p>Récompense : accès VIP, drops privés, cartes rares.</p>
          </div>

          <div className="progress-ring small">
            <span>25%</span>
          </div>
        </section>

        <ExplorerAvatar3B />
      </div>

      <LoyaltyCardsPanel />

      <section className="quick-access-panel">
        <h2>Accès rapides</h2>

        <div className="quick-grid">
          <button onClick={() => goTo("passport")} type="button">
            Passeport 3B
          </button>
          <button onClick={() => goTo("jeux")} type="button">
            Jeux & XP
          </button>
          <button onClick={() => goTo("secret")} type="button">
            Coffre secret
          </button>
          <button onClick={() => goTo("options")} type="button">
            Options
          </button>
        </div>
      </section>
    </section>
  );
}

function LoyaltyCardsPanel() {
  return (
    <section className="loyalty-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Cartes 3B</p>
          <h2>Mes cartes possédées</h2>
          <p>Collection complète : 12 cartes 3B prévues.</p>
        </div>
      </div>

      <div className="loyalty-grid">
        {LOYALTY_CARDS.map((card) => (
          <div
            key={card.name}
            className={`loyalty-card-premium loyalty-${card.variant}`}
          >
            <div className="card-shine" />
            <span>3B</span>
            <strong>{card.name}</strong>
            <small className={card.status === "Active" ? "active" : "locked"}>
              {card.status}
            </small>

            <div className="card-progress">
              <i style={{ width: `${card.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SecretPage({
  secretCode,
  setSecretCode,
  secretOpen,
  openSecret,
  goTo,
}) {
  return (
    <section className="page-section">
      <PageHeader
        title="Coffre secret 3B"
        subtitle="Indice, mystère, première porte de l’univers caché."
        goTo={goTo}
      />

      <div className="secret-5050-layout">
        <section className="secret-left">
          <h2>Entrer dans l’univers caché</h2>
          <p>
            Le coffre secret ne remplace pas les missions. Il ouvre des indices
            supplémentaires quand le bon code est trouvé.
          </p>

          <div className="secret-code-box">
            <input
              value={secretCode}
              onChange={(event) => setSecretCode(event.target.value)}
              placeholder="Entre le code secret"
            />

            <button onClick={openSecret} type="button">
              Déverrouiller
            </button>
          </div>

          {secretOpen ? (
            <div className="secret-result open">
              <strong>Indice débloqué</strong>
              <p>7 Italie — les 8 logos — 20h — tout va commencer.</p>
            </div>
          ) : (
            <div className="secret-result">
              <strong>Coffre verrouillé</strong>
              <p>Le premier code est lié à un pays 3B.</p>
            </div>
          )}
        </section>

        <section className="secret-right">
          <div className="bouncing-3b">
            <span>3B</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function SportPage({ goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Espace sport 3B"
        subtitle="Clubs, maillots, défis, classements, collaborations et univers sportif."
        goTo={goTo}
      />

      <div className="content-5050">
        <section className="premium-panel">
          <h2>Clubs & maillots</h2>
          <p>
            Préparation des collaborations sportives, maillots premium, défis
            communautaires et suivi des équipes.
          </p>
        </section>

        <section className="premium-panel">
          <h2>Défis & classements</h2>
          <p>
            Missions sport, points, niveaux, leaderboard et objectifs par pays.
          </p>
        </section>
      </div>
    </section>
  );
}

function OptionsPage({ options, updateOption, goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Options 3B"
        subtitle="Animations, performance mobile, effets matrix et confort d’utilisation."
        goTo={goTo}
      />

      <div className="options-grid">
        {Object.entries(options).map(([key, value]) => (
          <button
            key={key}
            className={`option-toggle ${value ? "active" : ""}`}
            onClick={() => updateOption(key)}
            type="button"
          >
            <strong>{key}</strong>
            <span>{value ? "Activé" : "Désactivé"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SimplePremiumPage({ type, goTo }) {
  const content = {
    boutique: {
      title: "Boutique",
      subtitle: "Produits premium, drops et collections.",
      blocks: ["Drops futurs", "Produits premium", "Certificats digitaux"],
    },
    musique: {
      title: "Musique 3B",
      subtitle: "Sons officiels, hymne, campagnes, playlist et ambiance.",
      blocks: ["Hymne 3B", "Sons TikTok", "Ambiance défilé"],
    },
    communaute: {
      title: "Communauté",
      subtitle: "Futur tchat, membres, créateurs, échanges et réseau 3B.",
      blocks: ["Tchat", "Créateurs", "Classement communautaire"],
    },
    manga: {
      title: "Manga 3B",
      subtitle:
        "Histoire officielle, chapitres, personnages, pays et univers narratif 3B.",
      blocks: ["Chapitres 3B", "Personnages", "Secrets de l’histoire"],
    },
    monde3b: {
      title: "Le Monde du 3B",
      subtitle:
        "Carte mondiale, pays, origines, logos, missions et univers international.",
      blocks: ["Carte mondiale", "Pays 3B", "Missions internationales"],
    },
    bis: {
      title: "Encore / Bis",
      subtitle: "Créateurs, extras, certificats et futures extensions.",
      blocks: ["Certificats", "Extensions", "Drops secrets"],
    },
    ia: {
      title: "Espace / IA",
      subtitle: "Studio futur, assistant IA, automatisations et création.",
      blocks: ["Assistant créatif", "Prompts", "Studio futur"],
    },
  };

  const selected = content[type] || content.bis;

  return (
    <section className="page-section">
      <PageHeader
        title={selected.title}
        subtitle={selected.subtitle}
        goTo={goTo}
      />

      <div className="content-5050">
        {selected.blocks.map((block) => (
          <section className="premium-panel" key={block}>
            <h2>{block}</h2>
            <p>
              Bloc préparé pour la suite de l’écosystème 3B International, sans
              supprimer l’existant.
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

export default App;