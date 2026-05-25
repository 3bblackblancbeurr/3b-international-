import React, { useMemo, useState } from "react";
import "./App.css";

const STORAGE_MEMBER_KEY = "3b_member_master_clean_v2";
const STORAGE_OPTIONS_KEY = "3b_options_master_clean_v1";

const BASE_MENU_ITEMS = [
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
    description: "Cartes digitales, niveaux et avantages.",
  },
  {
    id: "manga",
    label: "Manga 3B",
    icon: "📖",
    description: "Origine 3B, Tome 0, saga Le Monde du 3B.",
  },
  {
    id: "world3b",
    label: "Le Monde du 3B",
    icon: "🌍",
    description: "Personnages interactifs, pouvoirs et raretés.",
  },
  {
    id: "games",
    label: "Jeux 3B",
    icon: "🎮",
    description: "Missions, XP, défis et portes 3B.",
  },
  {
    id: "music",
    label: "Musique",
    icon: "♪",
    description: "Sons officiels, hymne et ambiance 3B.",
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
    description: "Indices, codes, coffre et révélations.",
  },
  {
    id: "sport",
    label: "Espace sport 3B",
    icon: "🏆",
    description: "Clubs, maillots, défis et collaborations.",
  },
  {
    id: "ia",
    label: "Espace IA",
    icon: "⚙️",
    description: "Studio futur, assistant IA et automatisations.",
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

const COUNTRY_LIST = [
  {
    name: "France",
    flag: "🇫🇷",
    code: "FR",
    status: "Actif",
    aura: "Bleu royal",
    fragment: "Fragment Tricolore",
  },
  {
    name: "Italie",
    flag: "🇮🇹",
    code: "IT",
    status: "Verrouillé",
    aura: "Vert blanc rouge",
    fragment: "Fragment Roma",
  },
  {
    name: "Estonie",
    flag: "🇪🇪",
    code: "EE",
    status: "Verrouillé",
    aura: "Bleu acier",
    fragment: "Fragment Nordique",
  },
  {
    name: "Turquie",
    flag: "🇹🇷",
    code: "TR",
    status: "Verrouillé",
    aura: "Rubis céleste",
    fragment: "Fragment Anatolie",
  },
  {
    name: "Algérie",
    flag: "🇩🇿",
    code: "DZ",
    status: "Verrouillé",
    aura: "Vert solaire",
    fragment: "Fragment Sahara",
  },
  {
    name: "Tunisie",
    flag: "🇹🇳",
    code: "TN",
    status: "Verrouillé",
    aura: "Rouge lunaire",
    fragment: "Fragment Carthage",
  },
  {
    name: "Maroc",
    flag: "🇲🇦",
    code: "MA",
    status: "Verrouillé",
    aura: "Or rouge",
    fragment: "Fragment Atlas",
  },
  {
    name: "Espagne",
    flag: "🇪🇸",
    code: "ES",
    status: "Verrouillé",
    aura: "Rouge or",
    fragment: "Fragment Ibérique",
  },
];

const LOYALTY_CARDS = [
  { name: "Découverte", status: "Active", progress: 100, rarity: "Commune" },
  { name: "Héritier", status: "Verrouillée", progress: 0, rarity: "Rare" },
  { name: "Gardien", status: "Verrouillée", progress: 0, rarity: "Épique" },
  { name: "Légende", status: "Verrouillée", progress: 0, rarity: "Légendaire" },
  { name: "Explorateur", status: "Verrouillée", progress: 0, rarity: "Rare" },
  { name: "Stratège", status: "Verrouillée", progress: 0, rarity: "Épique" },
  { name: "Visionnaire", status: "Verrouillée", progress: 0, rarity: "Légendaire" },
  { name: "Élite", status: "Verrouillée", progress: 0, rarity: "Rare" },
  { name: "Alliance", status: "Verrouillée", progress: 0, rarity: "Épique" },
  { name: "Maître", status: "Verrouillée", progress: 0, rarity: "Légendaire" },
  { name: "Prime", status: "Verrouillée", progress: 0, rarity: "Unique" },
  { name: "Éternel", status: "Verrouillée", progress: 0, rarity: "Ultra unique" },
];

const MANGA_BOOKS = [
  {
    title: "Origine 3B",
    subtitle: "La naissance du symbole",
    status: "Préparation",
  },
  {
    title: "Tome 0",
    subtitle: "Avant l’ouverture des portes",
    status: "En cours",
  },
  {
    title: "Tome 1 — Le Monde du 3B",
    subtitle: "La première ouverture",
    status: "À venir",
  },
  {
    title: "Tome 2 — Le Monde du 3B",
    subtitle: "Les gardiens se réveillent",
    status: "À venir",
  },
  {
    title: "Tome 3 — Le Monde du 3B",
    subtitle: "Les fragments internationaux",
    status: "À venir",
  },
  {
    title: "Tome 4 — Le Monde du 3B",
    subtitle: "L’héritage se divise",
    status: "À venir",
  },
];

const WORLD_CHARACTERS = [
  {
    name: "Gardien France",
    country: "France",
    rarity: "Rare",
    power: "Mémoire bleue",
  },
  {
    name: "Lion Atlas 3B",
    country: "Maroc",
    rarity: "Légendaire",
    power: "Force solaire",
  },
  {
    name: "Loup Nordique",
    country: "Estonie",
    rarity: "Épique",
    power: "Vision froide",
  },
  {
    name: "Taureau Ibérique",
    country: "Espagne",
    rarity: "Rare",
    power: "Impact rouge",
  },
  {
    name: "Croissant Anatolie",
    country: "Turquie",
    rarity: "Épique",
    power: "Lune rubis",
  },
  {
    name: "Sahara Vert",
    country: "Algérie",
    rarity: "Rare",
    power: "Fragment désert",
  },
  {
    name: "Carthage Rouge",
    country: "Tunisie",
    rarity: "Rare",
    power: "Mémoire ancienne",
  },
  {
    name: "Roma Verde",
    country: "Italie",
    rarity: "Épique",
    power: "Architecture vivante",
  },
];

const SAFE_PAGES = {
  games: {
    title: "Jeux 3B",
    subtitle: "Missions, XP, portes, énigmes et progression.",
    blocks: [
      "QCM 3B",
      "Mots croisés",
      "Missions XP",
      "Portes 3B",
      "Mémoire 3B",
      "Code secret",
    ],
  },
  music: {
    title: "Musique 3B",
    subtitle: "Sons officiels, hymne, campagnes et playlist.",
    blocks: [
      "Hymne 3B",
      "Sons TikTok",
      "Playlist officielle",
      "Ambiance défilé",
      "Campagnes audio",
      "Collaborations futures",
    ],
  },
  community: {
    title: "Communauté",
    subtitle: "Espace membre, discussion, créateurs et réseau 3B.",
    blocks: [
      "Tchat communautaire",
      "Créateurs",
      "Classement",
      "Parrainage",
      "Défis communauté",
      "Réseau international",
    ],
  },
  sport: {
    title: "Espace sport 3B",
    subtitle: "Clubs, maillots, collaborations et défis.",
    blocks: [
      "Clubs partenaires",
      "Maillots premium",
      "Défis sportifs",
      "Classements",
      "Collaborations locales",
      "Drops sport",
    ],
  },
  ia: {
    title: "Espace IA",
    subtitle: "Studio futur, assistant créatif et automatisations.",
    blocks: [
      "Assistant créatif",
      "Prompts 3B",
      "Studio textile",
      "Assistant marketing",
      "Assistant usine",
      "Automatisation future",
    ],
  },
  shop: {
    title: "Boutique",
    subtitle: "Drops, produits premium, certificats et précommandes.",
    blocks: [
      "Drops futurs",
      "Produits premium",
      "Certificats digitaux",
      "Précommandes",
      "Packaging 3B",
      "QR authenticité",
    ],
  },
};

function createTestMember() {
  return {
    name: "",
    email: "",
    isRegistered: false,
    status: "Non inscrit",
    level: "Découverte",
    points: 0,
    memberId: "",
    passportId: "",
    country: "France",
    originCountry: "France",
    city: "",
    createdAt: "",
  };
}

function createRegisteredMember(currentMember) {
  const cleanName = currentMember.name?.trim() || "Membre 3B";
  const cleanEmail = currentMember.email?.trim() || "";
  const cleanCountry = currentMember.originCountry || "France";
  const now = new Date();

  return {
    ...currentMember,
    name: cleanName,
    email: cleanEmail,
    isRegistered: true,
    status: "Membre 3B",
    level: "Découverte",
    points: currentMember.points || 0,
    memberId: `3B-MEM-${Math.floor(10000 + Math.random() * 89999)}`,
    passportId: `3B-PASS-${Math.floor(1000 + Math.random() * 8999)}`,
    country: cleanCountry,
    originCountry: cleanCountry,
    city: currentMember.city || "Non renseignée",
    createdAt: now.toLocaleDateString("fr-FR"),
  };
}

function loadJsonStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }

    return {
      ...fallback,
      ...JSON.parse(saved),
    };
  } catch {
    return fallback;
  }
}

function saveJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }

  return value;
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [page, setPage] = useState("home");
  const [secretCode, setSecretCode] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);

  const [member, setMember] = useState(() =>
    loadJsonStorage(STORAGE_MEMBER_KEY, createTestMember())
  );

  const [options, setOptions] = useState(() =>
    loadJsonStorage(STORAGE_OPTIONS_KEY, {
      matrix: true,
      animations: true,
      premiumGlow: true,
      reducedMotion: false,
    })
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

    return menuItems.find((item) => item.id === page)?.label || "3B International";
  }, [page, menuItems, member.isRegistered]);

  function goTo(nextPage) {
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goToIntro() {
    setHasStarted(false);
    setPage("home");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetMember() {
    const cleanMember = createTestMember();
    setMember(cleanMember);
    saveJsonStorage(STORAGE_MEMBER_KEY, cleanMember);
    goTo("home");
  }

  function updateMemberField(key, value) {
    const nextMember = {
      ...member,
      [key]: value,
    };

    setMember(nextMember);
    saveJsonStorage(STORAGE_MEMBER_KEY, nextMember);
  }

  function registerMember() {
    const registeredMember = createRegisteredMember(member);
    setMember(registeredMember);
    saveJsonStorage(STORAGE_MEMBER_KEY, registeredMember);
    goTo("member");
  }

  function toggleOption(key) {
    const nextOptions = {
      ...options,
      [key]: !options[key],
    };

    setOptions(nextOptions);
    saveJsonStorage(STORAGE_OPTIONS_KEY, nextOptions);
  }

  function openSecret() {
    const normalized = secretCode.trim().toLowerCase();

    if (normalized === "italie" || normalized === "italia") {
      setSecretOpen(true);
    }
  }

  if (!hasStarted) {
    return (
      <main className="intro3b">
        <div className="intro3b-background" />
        <div className={options.matrix ? "intro3b-matrix active" : "intro3b-matrix"} />

        <section className="intro3b-card">
          <p className="eyebrow">3B International</p>
          <h1>De zéro à l’international</h1>
          <p>
            Un écosystème premium pour ton passeport, tes cartes, tes jeux, ton
            manga, ton monde 3B et ton héritage.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => setHasStarted(true)}
          >
            COMMENCER
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app3b">
      <div className="app3b-background" />
      <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} />

      <header className="topbar3b">
        <button type="button" className="ghost-button" onClick={() => goTo("home")}>
          Accueil
        </button>

        <div className="topbar3b-title">
          <span>3B International</span>
          <strong>{currentPageTitle}</strong>
        </div>

        <button type="button" className="ghost-button" onClick={goToIntro}>
          Entrée
        </button>
      </header>

      {page === "home" && (
        <HomePage goTo={goTo} menuItems={menuItems} member={member} />
      )}

      {page === "passport" && (
        <PassportPage
          member={member}
          goTo={goTo}
          goToIntro={goToIntro}
          registerMember={registerMember}
        />
      )}

      {page === "loyalty" && <LoyaltyPage goTo={goTo} />}
      {page === "games" && <SafePage type="games" goTo={goTo} />}
      {page === "music" && <SafePage type="music" goTo={goTo} />}
      {page === "manga" && <MangaPage goTo={goTo} />}
      {page === "community" && <SafePage type="community" goTo={goTo} />}
      {page === "secret" && (
        <SecretPage
          goTo={goTo}
          secretCode={secretCode}
          setSecretCode={setSecretCode}
          secretOpen={secretOpen}
          openSecret={openSecret}
        />
      )}
      {page === "world3b" && <World3BPage goTo={goTo} />}

      {page === "member" && (
        <MemberPage
          member={member}
          options={options}
          goTo={goTo}
          resetMember={resetMember}
          toggleOption={toggleOption}
          updateMemberField={updateMemberField}
          registerMember={registerMember}
        />
      )}

      {page === "sport" && <SafePage type="sport" goTo={goTo} />}
      {page === "ia" && <SafePage type="ia" goTo={goTo} />}
      {page === "shop" && <SafePage type="shop" goTo={goTo} />}
    </main>
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

function HomePage({ goTo, menuItems, member }) {
  return (
    <section className="home-layout">
      <div className="home-hero">
        <p className="eyebrow">BLACK • BLANC • BEUR</p>

        <h1>Bienvenue dans l’écosystème 3B</h1>

        <p>
          Votre passeport digital, vos missions, vos jeux, votre collection,
          votre musique, votre communauté et les secrets 3B sont réunis dans un
          seul univers.
        </p>

        <div className="home-actions">
          {member?.isRegistered ? (
            <>
              <button
                type="button"
                className="primary-button"
                onClick={() => goTo("member")}
              >
                Mon espace membre
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => goTo("passport")}
              >
                Mon passeport 3B
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => goTo("member")}
            >
              Connexion / Inscription
            </button>
          )}
        </div>

        <div className="home-signature">
          PASSEPORT • CARTES • JEUX • MUSIQUE • COMMUNAUTÉ • SECRET • IA • MONDE 3B
        </div>
      </div>

      <div className="menu-grid">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="menu-card"
            onClick={() => goTo(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>

            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>

            <i>›</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function PassportPage({ member, goTo, goToIntro, registerMember }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Passeport 3B"
        subtitle={
          member.isRegistered
            ? "Passeport numérique officiel, propre et sécurisé."
            : "Crée ton passeport 3B pour débloquer ton espace membre."
        }
        goTo={goTo}
      />

      <div className="passport-frame">
        <img
          src="/passport-digital-3bv2.png"
          alt="Passeport Digital 3B"
          className="passport-image"
        />

        <button
          type="button"
          className="passport-hotspot passport-hotspot-home"
          onClick={() => goTo("home")}
          aria-label="Retour accueil"
        />

        <button
          type="button"
          className="passport-hotspot passport-hotspot-entry"
          onClick={() => (goToIntro ? goToIntro() : goTo("home"))}
          aria-label="Retour entrée"
        />
      </div>

      <div className="info-grid">
        <article className="premium-panel">
          <p className="eyebrow">Identité digitale</p>
          <h2>{member.isRegistered ? member.passportId : "Non activé"}</h2>
          <p>
            Le passeport 3B devient actif après création de ton compte membre.
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
            <button type="button" className="primary-button" onClick={registerMember}>
              Activer mon passeport 3B
            </button>
          )}
        </article>
      </div>
    </section>
  );
}

function LoyaltyPage({ goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Cartes de fidélité 3B"
        subtitle="Cartes digitales, niveaux, avantages et progression."
        goTo={goTo}
      />

      <div className="loyalty-grid">
        {LOYALTY_CARDS.map((card) => (
          <article key={card.name} className="loyalty-card">
            <span>3B</span>
            <strong>{card.name}</strong>
            <small>{card.status}</small>
            <em>{card.rarity}</em>

            <div className="progress-bar">
              <i style={{ width: `${card.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MangaPage({ goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Manga 3B"
        subtitle="Bibliothèque officielle : Origine 3B, Tome 0, puis la saga Le Monde du 3B."
        goTo={goTo}
      />

      <div className="content-grid">
        {MANGA_BOOKS.map((book) => (
          <article key={book.title} className="premium-panel">
            <p className="eyebrow">{book.status}</p>
            <h2>{book.title}</h2>
            <p>{book.subtitle}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function World3BPage({ goTo }) {
  return (
    <section className="page-section">
      <PageHeader
        title="Le Monde du 3B"
        subtitle="Espace dédié uniquement aux personnages interactifs."
        goTo={goTo}
      />

      <div className="content-grid">
        {WORLD_CHARACTERS.map((character) => (
          <article key={character.name} className="premium-panel character-card">
            <p className="eyebrow">{character.rarity}</p>
            <h2>{character.name}</h2>
            <p>
              <strong>Pays :</strong> {character.country}
            </p>
            <p>
              <strong>Pouvoir :</strong> {character.power}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MemberPage({
  member,
  options,
  goTo,
  resetMember,
  toggleOption,
  updateMemberField,
  registerMember,
}) {
  if (!member.isRegistered) {
    return (
      <section className="page-section">
        <PageHeader
          title="Connexion / Inscription"
          subtitle="Crée ton passeport 3B pour débloquer automatiquement ton espace membre."
          goTo={goTo}
        />

        <div className="member-layout">
          <article className="premium-panel">
            <p className="eyebrow">Création passeport 3B</p>
            <h2>Activer mon compte</h2>

            <label className="form-line">
              Nom affiché
              <input
                value={member.name}
                onChange={(event) => updateMemberField("name", event.target.value)}
                placeholder="Exemple : Zakaria"
              />
            </label>

            <label className="form-line">
              E-mail
              <input
                value={member.email}
                onChange={(event) => updateMemberField("email", event.target.value)}
                placeholder="tonadresse@email.com"
              />
            </label>

            <label className="form-line">
              Pays d’origine
              <select
                value={member.originCountry}
                onChange={(event) =>
                  updateMemberField("originCountry", event.target.value)
                }
              >
                {COUNTRY_LIST.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="primary-button" onClick={registerMember}>
              Créer mon passeport 3B
            </button>
          </article>

          <article className="premium-panel">
            <p className="eyebrow">Après inscription</p>
            <h2>Espace membre débloqué</h2>
            <p>
              Une fois le passeport créé, la case “Espace membre 3B” apparaîtra
              automatiquement dans le menu général.
            </p>
            <p>
              Ton espace membre servira ensuite pour le profil, les cartes, les
              points, les avantages, les réglages et la progression.
            </p>
          </article>

          <article className="premium-panel">
            <p className="eyebrow">Options application</p>
            <h2>Réglages</h2>

            {Object.entries(options).map(([key, value]) => (
              <button
                key={key}
                type="button"
                className={value ? "option-button active" : "option-button"}
                onClick={() => toggleOption(key)}
              >
                {key} : {value ? "activé" : "désactivé"}
              </button>
            ))}
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <PageHeader
        title="Espace membre 3B"
        subtitle="Tableau de bord membre : profil, passeport, cartes, progression et paramètres."
        goTo={goTo}
      />

      <div className="member-layout">
        <article className="premium-panel">
          <p className="eyebrow">Profil membre</p>
          <h2>{member.name}</h2>

          <p>
            <strong>Statut :</strong> {member.status}
          </p>
          <p>
            <strong>Niveau :</strong> {member.level}
          </p>
          <p>
            <strong>Points :</strong> {member.points}
          </p>
          <p>
            <strong>Pays d’origine :</strong> {member.originCountry}
          </p>
          <p>
            <strong>ID membre :</strong> {member.memberId}
          </p>
          <p>
            <strong>Passeport :</strong> {member.passportId}
          </p>
          <p>
            <strong>Date d’inscription :</strong> {member.createdAt}
          </p>

          <button type="button" className="danger-button" onClick={resetMember}>
            Supprimer / remettre le compte à zéro
          </button>
        </article>

        <article className="premium-panel">
          <p className="eyebrow">Tableau de bord</p>
          <h2>Progression 3B</h2>
          <p>Carte actuelle : Découverte</p>
          <p>Objectif suivant : Héritier</p>
          <p>Avantages : missions, cartes, indices, accès futur aux drops.</p>

          <button type="button" className="secondary-button" onClick={() => goTo("loyalty")}>
            Voir mes cartes
          </button>

          <button type="button" className="secondary-button" onClick={() => goTo("passport")}>
            Voir mon passeport
          </button>
        </article>

        <article className="premium-panel">
          <p className="eyebrow">Options application</p>
          <h2>Réglages</h2>

          {Object.entries(options).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={value ? "option-button active" : "option-button"}
              onClick={() => toggleOption(key)}
            >
              {key} : {value ? "activé" : "désactivé"}
            </button>
          ))}
        </article>
      </div>
    </section>
  );
}

function SecretPage({
  goTo,
  secretCode,
  setSecretCode,
  secretOpen,
  openSecret,
}) {
  return (
    <section className="page-section">
      <PageHeader
        title="Secret 3B"
        subtitle="Indices, codes, révélations et coffre secret."
        goTo={goTo}
      />

      <div className="secret-layout">
        <article className="premium-panel">
          <p className="eyebrow">Coffre secret 3B</p>
          <h2>Entrer dans l’univers caché</h2>
          <p>Le premier code est lié à un pays officiel 3B.</p>

          <div className="secret-form">
            <input
              value={secretCode}
              onChange={(event) => setSecretCode(event.target.value)}
              placeholder="Entre le code secret"
            />

            <button type="button" className="primary-button" onClick={openSecret}>
              Déverrouiller
            </button>
          </div>

          {secretOpen ? (
            <div className="secret-result open">
              <strong>Indice débloqué</strong>
              <p>Italie — 8 logos — 20h — tout commence.</p>
            </div>
          ) : (
            <div className="secret-result">
              <strong>Coffre verrouillé</strong>
              <p>Indice non déverrouillé.</p>
            </div>
          )}
        </article>

        <article className="secret-3b-card">
          <span>3B</span>
        </article>
      </div>
    </section>
  );
}

function SafePage({ type, goTo }) {
  const selected = SAFE_PAGES[type] || SAFE_PAGES.games;

  return (
    <section className="page-section">
      <PageHeader
        title={selected.title}
        subtitle={selected.subtitle}
        goTo={goTo}
      />

      <div className="content-grid">
        {selected.blocks.map((block) => (
          <article key={block} className="premium-panel">
            <h2>{block}</h2>
            <p>Bloc sécurisé prêt pour la prochaine étape de l’écosystème 3B.</p>
          </article>
        ))}
      </div>
    </section>
  );
}