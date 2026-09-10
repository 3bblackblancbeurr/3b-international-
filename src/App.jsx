import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, KeyRound } from "lucide-react";
import ShopPage from "./shop/ShopPage.jsx";
import AiPage from "./ai/AiPage.jsx";
import { readLocation, navigateTo } from "./lib/navigation.js";
import { STORAGE_MEMBER_KEY, STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS, OPTION_LABELS,
  createTestMember, normalizeMember, normalizeOptions, validateMember, createRegisteredMember,
  loadJsonStorage, saveJsonStorage } from "./lib/member.js";
import AppNavigation from "./components/AppNavigation.jsx";
import HomePage from "./components/HomePage.jsx";
import PassportVisual from "./components/PassportVisual.jsx";
import "./App.css";
import "./styles/mobile-navigation.css";
import "./styles/passport-effects.css";
import "./styles/games.css";

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
    description: "La course des clés et les futurs défis 3B.",
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
    title: "Tome 0 — Le Cercle Brisé",
    subtitle: "Kaïs, huit portes et les fragments du Cercle Brisé.",
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
    subtitle: "Découvre La course des clés et les prochains jeux de l’univers 3B.",
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

export default function App() {
  const [route, setRoute] = useState(readLocation);
  const { page } = route;
  const hasStarted = page !== "intro";
  const [registrationError, setRegistrationError] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [secretError, setSecretError] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);

  const [member, setMember] = useState(() =>
    normalizeMember(loadJsonStorage(STORAGE_MEMBER_KEY, createTestMember()))
  );

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
    document.title = page === "intro" ? "3B International — De zéro à l’international" : `${currentPageTitle} — 3B`;
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

  function resetMember() {
    const cleanMember = createTestMember();
    setMember(cleanMember);
    persist(STORAGE_MEMBER_KEY, cleanMember);
    goTo("home");
  }

  function updateMemberField(key, value) {
    const nextMember = {
      ...member,
      [key]: value,
    };

    setMember(nextMember);
    setRegistrationError("");
  }

  function registerMember() {
    const error = validateMember(member);
    setRegistrationError(error);
    if (error) return;
    const registeredMember = createRegisteredMember(member);
    setMember(registeredMember);
    persist(STORAGE_MEMBER_KEY, registeredMember);
    goTo("member");
  }

  function toggleOption(key) {
    const nextOptions = {
      ...options,
      [key]: !options[key],
    };

    setOptions(nextOptions);
    persist(STORAGE_OPTIONS_KEY, nextOptions);
  }

  function openSecret() {
    const normalized = secretCode.trim().toLowerCase();

    const valid = normalized === "italie" || normalized === "italia";
    setSecretOpen(valid);
    setSecretError(valid ? "" : "Ce code ne correspond pas. Réessaie avec un pays 3B.");
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
        </section>
      </main>
    );
  }

  return (
    <div className="app3b" data-page={page} data-glow={options.premiumGlow} data-matrix={options.matrix}>
      <div className="app3b-background" aria-hidden="true" />
      <div className={options.matrix ? "matrix-layer active" : "matrix-layer"} aria-hidden="true" />

      <AppNavigation page={page} title={currentPageTitle} menuItems={menuItems} goTo={goTo} />
      <main id="main-content" tabIndex={-1}>
      {storageNotice && <p className="storage-notice" role="status">{storageNotice}</p>}

      {page === "home" && (
        <HomePage goTo={goTo} menuItems={menuItems} member={member} />
      )}

      {page === "passport" && (
        <PassportPage
          member={member}
          options={options}
          goTo={goTo}
        />
      )}

      {page === "loyalty" && <LoyaltyPage goTo={goTo} member={member} />}
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
          secretError={secretError}
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
          registrationError={registrationError}
        />
      )}

      {page === "sport" && <SafePage type="sport" goTo={goTo} />}
      {["ia", "ia-textile", "ia-trio"].includes(page) && <AiPage page={page} goTo={goTo} />}
      {page === "shop" && <ShopPage key={route.search} goTo={goTo} reducedMotion={options.reducedMotion || !options.animations} />}
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
            Le passeport 3B devient actif après la création de ton profil sur cet appareil.
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

function LoyaltyPage({ goTo, member }) {
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
            <small>{member.isRegistered ? card.status : "À découvrir"}</small>
            <em>{card.rarity}</em>

            <div className="progress-bar">
              <i style={{ width: `${member.isRegistered ? card.progress : 0}%` }} />
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
        subtitle="3B ORIGINS — Le Cercle Brisé. Huit pays, un héritage à rassembler."
        goTo={goTo}
      />

      <article className="manga-feature premium-panel">
        <p className="eyebrow">Tome 0 · En cours de création</p>
        <h2>Le Cercle Brisé</h2>
        <p>Kaïs. Le loup. Huit portes, huit gardiens et les fragments d’un cercle à réunir face au Monstre de l’Oubli.</p>
        <div className="manga-countries" aria-label="Les huit pays 3B">
          {COUNTRY_LIST.map(country => <span key={country.code}>{country.flag} {country.name}</span>)}
        </div>
        <details className="manga-details">
          <summary>Découvrir l’univers du Tome 0</summary>
          <p>BLACK • BLANC • BEUR : l’unité au cœur de l’aventure. Kaïs porte huit clés ; chaque porte mène à l’un des huit pays et à son gardien.</p>
          <p>Noir et blanc, bleu Matrix et or 3B accompagnent cette quête contre l’oubli. Les planches seront disponibles ici après leur publication.</p>
        </details>
      </article>
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
  registrationError,
}) {
  const [confirmReset, setConfirmReset] = useState(false);
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
            <h2>Créer mon profil 3B</h2>
            <p className="local-profile-note">Ton profil est enregistré sur cet appareil. La connexion à un compte en ligne sera proposée ultérieurement.</p>
            <form onSubmit={event => { event.preventDefault(); registerMember(); }}>
            <label className="form-line">
              Nom affiché
              <input
                name="displayName" autoComplete="nickname" required minLength={2} maxLength={80}
                value={member.name}
                onChange={(event) => updateMemberField("name", event.target.value)}
                placeholder="Exemple : Zakaria"
              />
            </label>

            <label className="form-line">
              E-mail
              <input
                type="email" name="email" autoComplete="email" required maxLength={254}
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

            {registrationError && <p role="alert" className="form-error">{registrationError}</p>}
            <button type="submit" className="primary-button">Créer mon passeport 3B</button>
            </form>
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
                aria-pressed={value}
              >
                {OPTION_LABELS[key]} : {value ? "activé" : "désactivé"}
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
          <p className="local-profile-note">Profil conservé sur cet appareil. La connexion à un compte en ligne sera proposée ultérieurement.</p>

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

          {confirmReset ? <div className="reset-confirmation" role="group" aria-label="Confirmation de suppression">
            <p>Effacer le profil et le passeport de cet appareil ?</p>
            <button type="button" className="ghost-button" onClick={() => setConfirmReset(false)}>Annuler</button>
            <button type="button" className="danger-button" onClick={resetMember}>Effacer le profil local</button>
          </div> : <button type="button" className="danger-button" onClick={() => setConfirmReset(true)}>Réinitialiser mon profil local</button>}
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
              aria-pressed={value}
            >
              {OPTION_LABELS[key]} : {value ? "activé" : "désactivé"}
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
  secretError,
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

          <label className="secret-label" htmlFor="secret-code">Code secret</label>
          <form className="secret-form" onSubmit={event => { event.preventDefault(); openSecret(); }}>
            <input id="secret-code" maxLength={80} required autoComplete="off"
              value={secretCode}
              onChange={(event) => setSecretCode(event.target.value)}
              placeholder="Entre le code secret"
            />

            <button type="submit" className="primary-button">
              Déverrouiller
            </button>
          </form>
          {secretError && <p role="alert" className="form-error">{secretError}</p>}

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

      {type === "games" && (
        <>
          <article className="games-feature" aria-labelledby="key-race-title">
            <div className="games-feature-art" aria-hidden="true">
              <span className="games-feature-monogram">3B</span>
              <KeyRound size={100} strokeWidth={1.25} />
              <span className="games-feature-art-label">LA COURSE DES CLÉS</span>
            </div>
            <div className="games-feature-copy">
              <span className="games-feature-badge">Démo</span>
              <h2 id="key-race-title">La course des clés</h2>
              <p>Une nouvelle aventure 3B t’attend. Découvre le jeu et lance ta partie.</p>
              <a
                className="games-play-link"
                href="https://troisb-course-des-cles-demo.stetienne86pp.chatgpt.site/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Jouer à La course des clés (nouvel onglet)"
                aria-describedby="key-race-access"
              >
                Jouer <ArrowUpRight size={20} aria-hidden="true" />
              </a>
              <p id="key-race-access" className="games-access-note">Accès libre, sans compte. S’ouvre dans un nouvel onglet.</p>
            </div>
          </article>
          <h2 className="games-upcoming-title">Prochainement dans Jeux 3B</h2>
        </>
      )}

      <div className="content-grid">
        {selected.blocks.map((block) => (
          <article key={block} className="premium-panel">
            <h2>{block}</h2>
            <p>Cet espace est en préparation. Son ouverture sera annoncée ici.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
