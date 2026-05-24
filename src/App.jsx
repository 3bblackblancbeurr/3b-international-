import React, { useMemo, useState } from "react";
import Jeu3B from "./Jeu3B.jsx";
import ExplorerAvatar3B from "./components/ExplorerAvatar3B.jsx";
import "./App.css";

const STORAGE_MEMBER_KEY = "3b_member_passport_v3_final";
const STORAGE_OPTIONS_KEY = "3b_options_v3_final";

const COUNTRIES = [
  {
    name: "France",
    flag: "🇫🇷",
    status: "Déverrouillé",
    code: "FR",
    active: true,
  },
  {
    name: "Italie",
    flag: "🇮🇹",
    status: "Verrouillé",
    code: "IT",
    active: false,
  },
  {
    name: "Estonie",
    flag: "🇪🇪",
    status: "Verrouillé",
    code: "EE",
    active: false,
  },
  {
    name: "Turquie",
    flag: "🇹🇷",
    status: "Verrouillé",
    code: "TR",
    active: false,
  },
  {
    name: "Algérie",
    flag: "🇩🇿",
    status: "Verrouillé",
    code: "DZ",
    active: false,
  },
  {
    name: "Tunisie",
    flag: "🇹🇳",
    status: "Verrouillé",
    code: "TN",
    active: false,
  },
  {
    name: "Maroc",
    flag: "🇲🇦",
    status: "Verrouillé",
    code: "MA",
    active: false,
  },
  {
    name: "Espagne",
    flag: "🇪🇸",
    status: "Verrouillé",
    code: "ES",
    active: false,
  },
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
  {
    name: "Découverte",
    status: "Active",
    variant: "blue",
    progress: 100,
  },
  {
    name: "Héritier",
    status: "Active",
    variant: "black",
    progress: 83,
  },
  {
    name: "Gardien",
    status: "Verrouillée",
    variant: "dark",
    progress: 0,
  },
  {
    name: "Légende",
    status: "Verrouillée",
    variant: "gold",
    progress: 0,
  },
  {
    name: "Explorateur",
    status: "Verrouillée",
    variant: "blue",
    progress: 0,
  },
  {
    name: "Stratège",
    status: "Verrouillée",
    variant: "black",
    progress: 0,
  },
  {
    name: "Visionnaire",
    status: "Verrouillée",
    variant: "gold",
    progress: 0,
  },
  {
    name: "Élite",
    status: "Verrouillée",
    variant: "silver",
    progress: 0,
  },
  {
    name: "Alliance",
    status: "Verrouillée",
    variant: "silver",
    progress: 0,
  },
  {
    name: "Maître",
    status: "Verrouillée",
    variant: "black",
    progress: 0,
  },
  {
    name: "Prime",
    status: "Verrouillée",
    variant: "gold",
    progress: 0,
  },
  {
    name: "Éternel",
    status: "Verrouillée",
    variant: "dark",
    progress: 0,
  },
];

function createMember() {
  return {
    name: "Zakaria",
    email: "3bblackblancbeurr@gmail.com",
    memberId: "3B-MEM-88421",
    passportId: "3B-PASS-7360",
    status: "Membre 3B",
    level: "Héritier",
    points: 250,
    country: "France",
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
        return JSON.parse(saved);
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
        return {
          animation: true,
          matrix: true,
          sound: false,
        };
      }
    }

    return {
      animation: true,
      matrix: true,
      sound: false,
    };
  });

  const currentPageTitle = useMemo(() => {
    const item = MENU_ITEMS.find((entry) => entry.id === page);
    return item?.label || "3B International";
  }, [page]);

  function updateOption(key) {
    const next = {
      ...options,
      [key]: !options[key],
    };

    setOptions(next);
    localStorage.setItem(STORAGE_OPTIONS_KEY, JSON.stringify(next));
  }

  function goTo(nextPage) {
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

          <button className="intro-button-3b" onClick={() => setHasStarted(true)}>
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
        <button className="back-button-3b" onClick={() => goTo("home")}>
          Accueil
        </button>

        <div>
          <p>3B International</p>
          <strong>{currentPageTitle}</strong>
        </div>

        <button className="back-button-3b" onClick={() => setHasStarted(false)}>
          Entrée
        </button>
      </header>

      {page === "home" && (
        <HomePage
          member={member}
          goTo={goTo}
        />
      )}

      {page === "passport" && (
        <PassportPage
          member={member}
          goTo={goTo}
        />
      )}

      {page === "membre" && (
        <MemberPage
          member={member}
          goTo={goTo}
        />
      )}

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
      {page === "communaute" && <SimplePremiumPage type="communaute" goTo={goTo} />}
      {page === "boutique" && <SimplePremiumPage type="boutique" goTo={goTo} />}
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
      <button className="back-button-3b" onClick={() => goTo("home")}>
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

function PassportPage({ member, goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Passeport Digital 3B"
        subtitle="Identité numérique, accès mondial, avantages exclusifs et carte membre vivante."
        goTo={goTo}
      />

      <div className="passport-grid-legendary">
        <div className="passport-left-stack">
          <WorldMapPanel />
          <ZoomMapPanel />
        </div>

        <div className="passport-main-card">
          <div className="passport-scan-line" />

          <div className="matrix-numbers">
            0101 3B 88421 7360 2099 5110 3B PASS 2026 77 3301 9182 24/7
          </div>

          <div className="passport-chip">▣</div>

          <div className="passport-content">
            <p>3B accès numérique</p>
            <h2>3B Passeport Numérique</h2>

            <div className="passport-data-grid">
              <div>
                <span>Titulaire</span>
                <strong>{member.name}</strong>
              </div>

              <div>
                <span>Statut</span>
                <strong>{member.status}</strong>
              </div>

              <div>
                <span>N°</span>
                <strong>{member.passportId}</strong>
              </div>

              <div>
                <span>Pays 3B</span>
                <strong>{member.country}</strong>
              </div>

              <div>
                <span>Résidence</span>
                <strong>{member.city}</strong>
              </div>

              <div>
                <span>Émission</span>
                <strong>{member.createdAt}</strong>
              </div>
            </div>
          </div>

          <div className="biometric-card">
            <div className="biometric-head" />
            <span>NFC</span>
          </div>

          <div className="passport-country-badge">
            France <span>🇫🇷</span>
          </div>
        </div>

        <aside className="passport-security-panel">
          <h3>Sécurité & authentification</h3>

          {[
            ["Passeport numérique", "Vérifié"],
            ["Clé publique", "Vérifié"],
            ["Niveau de sécurité", "Ultra"],
            ["Biométrie", "Activée"],
            ["Chiffrement", "AES-256"],
            ["Intégrité données", "100%"],
          ].map(([label, value]) => (
            <div className="security-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}

          <div className="seal-3b">3B</div>
        </aside>
      </div>

      <CountryStatusPanel />

      <div className="passport-actions-row">
        <button className="premium-action-button" onClick={() => goTo("membre")}>
          Voir mes avantages
        </button>

        <button className="premium-action-button cyan" onClick={() => goTo("options")}>
          Monde 3B / options
        </button>

        <button className="premium-action-button" onClick={() => goTo("jeux")}>
          Continuer les missions
        </button>
      </div>
    </section>
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
            className={`zoom-country ${country.active ? "active" : "locked-country"}`}
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
            className={`country-row ${country.active ? "unlocked-country" : "locked-country"}`}
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
          <button onClick={() => goTo("passport")}>Passeport 3B</button>
          <button onClick={() => goTo("jeux")}>Jeux & XP</button>
          <button onClick={() => goTo("secret")}>Coffre secret</button>
          <button onClick={() => goTo("options")}>Options</button>
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

            <button onClick={openSecret}>Déverrouiller</button>
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