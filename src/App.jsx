import { useState } from "react";
import "./App.css";

const countries = [
  "France",
  "Maroc",
  "Algérie",
  "Tunisie",
  "Italie",
  "Espagne",
  "Turquie",
  "Estonie",
  "Portugal",
  "Belgique",
  "Suisse",
  "Allemagne",
  "Sénégal",
  "Mali",
  "Côte d’Ivoire",
  "Comores",
  "Autre pays",
];

const active3BCountries = [
  { name: "France", x: 49, y: 39 },
  { name: "Italie", x: 53, y: 43 },
  { name: "Estonie", x: 55, y: 30 },
  { name: "Turquie", x: 61, y: 45 },
  { name: "Algérie", x: 49, y: 51 },
  { name: "Tunisie", x: 52, y: 49 },
  { name: "Maroc", x: 46, y: 51 },
  { name: "Espagne", x: 47, y: 43 },
];

function normalizeCountry(country) {
  return country
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUnlockedCountry(originCountry) {
  const cleanOrigin = normalizeCountry(originCountry || "");
  return active3BCountries.find(
    (country) => normalizeCountry(country.name) === cleanOrigin
  );
}

function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      ← Retour
    </button>
  );
}

function LogoHeader({ small = false }) {
  return (
    <div className={small ? "logo-header small" : "logo-header"}>
      <div className="big-logo">3B</div>
      <div className="brand-text">INTERNATIONAL</div>
      {!small && <div className="sub-text">VÊTEMENTS HAUT DE GAMME</div>}
    </div>
  );
}

function MenuCard({ icon, title, onClick }) {
  return (
    <button className="menu-card" onClick={onClick}>
      <div className="icon-circle">{icon}</div>
      <span>{title}</span>
      <b>›</b>
    </button>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="indice">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Field({ icon, children }) {
  return (
    <div className="secret-input">
      <span>{icon}</span>
      {children}
    </div>
  );
}

function WorldMap3B({ originCountry }) {
  const unlocked = getUnlockedCountry(originCountry);

  return (
    <div
      style={{
        border: "1px solid rgba(215,168,79,0.85)",
        borderRadius: "22px",
        padding: "14px",
        marginTop: "18px",
        background:
          "radial-gradient(circle at center, rgba(215,168,79,0.10), rgba(0,0,0,0.86) 65%)",
        boxShadow:
          "0 0 22px rgba(215,168,79,0.18), inset 0 0 30px rgba(255,255,255,0.04)",
      }}
    >
      <h3
        style={{
          color: "#f2c979",
          textAlign: "center",
          fontFamily: "Cinzel, serif",
          margin: "0 0 8px",
          fontSize: "22px",
        }}
      >
        Carte du monde 3B
      </h3>

      <p
        style={{
          color: "#d8d8d8",
          textAlign: "center",
          fontSize: "13px",
          lineHeight: "1.4",
          margin: "0 0 12px",
        }}
      >
        Les pays du monde sont visibles sans nom. Seuls les 8 pays officiels 3B
        sont affichés. Votre pays d’origine déverrouille son accès.
      </p>

      <div
        style={{
          width: "100%",
          height: "270px",
          position: "relative",
          overflow: "hidden",
          borderRadius: "18px",
          border: "1px solid rgba(215,168,79,0.35)",
          background:
            "linear-gradient(180deg, rgba(3,12,18,0.95), rgba(0,0,0,0.98))",
        }}
      >
        <svg viewBox="0 0 100 60" width="100%" height="100%">
          <defs>
            <filter id="goldGlow">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="100" height="60" fill="#020506" />

          <path
            d="M8 19 C14 12, 25 12, 29 20 C33 27, 24 32, 17 31 C9 30, 4 25, 8 19 Z"
            fill="rgba(80,80,80,0.38)"
          />
          <path
            d="M21 35 C28 35, 35 40, 34 50 C31 58, 22 57, 19 48 C17 43, 16 38, 21 35 Z"
            fill="rgba(80,80,80,0.34)"
          />
          <path
            d="M41 18 C50 10, 65 12, 72 20 C80 29, 70 38, 57 35 C47 33, 35 28, 41 18 Z"
            fill="rgba(80,80,80,0.42)"
          />
          <path
            d="M47 33 C55 31, 62 36, 61 46 C60 56, 50 58, 45 49 C41 42, 41 36, 47 33 Z"
            fill="rgba(80,80,80,0.36)"
          />
          <path
            d="M72 32 C80 28, 91 34, 93 42 C94 49, 86 52, 78 48 C70 44, 66 36, 72 32 Z"
            fill="rgba(80,80,80,0.40)"
          />
          <path
            d="M76 15 C84 11, 95 14, 97 23 C90 24, 82 24, 76 20 Z"
            fill="rgba(80,80,80,0.28)"
          />

          <path
            d="M41 36 C47 34, 58 34, 64 39"
            stroke="rgba(215,168,79,0.16)"
            strokeWidth="0.4"
            fill="none"
          />
          <path
            d="M10 32 C25 28, 44 30, 59 35"
            stroke="rgba(215,168,79,0.12)"
            strokeWidth="0.35"
            fill="none"
          />

          {active3BCountries.map((country) => {
            const isUnlocked =
              unlocked && normalizeCountry(unlocked.name) === normalizeCountry(country.name);

            return (
              <g key={country.name}>
                <circle
                  cx={country.x}
                  cy={country.y}
                  r={isUnlocked ? "2.1" : "1.7"}
                  fill={isUnlocked ? "#f7d47f" : "#171717"}
                  stroke={isUnlocked ? "#f7d47f" : "#7a5a22"}
                  strokeWidth="0.7"
                  filter={isUnlocked ? "url(#goldGlow)" : "none"}
                />

                <text
                  x={country.x + 2.3}
                  y={country.y + 0.6}
                  fill={isUnlocked ? "#f7d47f" : "#b38b3d"}
                  fontSize="2.4"
                  fontFamily="serif"
                  fontWeight="700"
                >
                  {country.name}
                </text>

                <text
                  x={country.x - 1}
                  y={country.y + 0.8}
                  fill={isUnlocked ? "#111" : "#b38b3d"}
                  fontSize="2.1"
                  fontWeight="700"
                >
                  {isUnlocked ? "✓" : "🔒"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginTop: "12px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(215,168,79,0.45)",
            borderRadius: "12px",
            padding: "10px",
            textAlign: "center",
            color: "#f2c979",
            fontSize: "13px",
          }}
        >
          Pays débloqué
          <br />
          <strong>{unlocked ? unlocked.name : "Aucun pour l’instant"}</strong>
        </div>

        <div
          style={{
            border: "1px solid rgba(215,168,79,0.45)",
            borderRadius: "12px",
            padding: "10px",
            textAlign: "center",
            color: "#f2c979",
            fontSize: "13px",
          }}
        >
          Pays 3B actifs
          <br />
          <strong>8 pays</strong>
        </div>
      </div>
    </div>
  );
}

function Home({ go }) {
  return (
    <div className="page">
      <LogoHeader />

      <div className="menu-list">
        <MenuCard icon="🛍️" title="Boutique" onClick={() => go("boutique")} />
        <MenuCard icon="♪" title="Musique" onClick={() => go("musique")} />
        <MenuCard icon="👥" title="Communauté" onClick={() => go("communaute")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go("passeport-access")} />
        <MenuCard icon="🔒" title="Coffre secret 3B" onClick={() => go("secret")} />
        <MenuCard icon="☆" title="Plus encore" onClick={() => go("plus")} />
      </div>

      <div className="diamond">◆</div>
    </div>
  );
}

function Boutique({ go }) {
  const slots = Array.from({ length: 6 });

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Boutique</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Ajoutez vos créations. Chaque maillot que vous créez apparaîtra ici,
        prêt à être porté.
      </p>

      <div className="shop-grid">
        {slots.map((_, i) => (
          <button className="product-slot" key={i}>
            <div className="shirt">⌁</div>
            <div className="plus">+</div>
            <p>Ajouter un maillot</p>
            <span>◆</span>
          </button>
        ))}
      </div>

      <p className="secure">🛍️ Paiement sécurisé via Stripe</p>
    </div>
  );
}

function Musique({ go }) {
  const tracks = Array.from({ length: 20 });

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />

      <h1>Musique</h1>
      <div className="gold-line">◆</div>

      <div className="music-grid">
        {tracks.map((_, i) => (
          <button className="track-card" key={i}>
            <span className="play">▶</span>
            <div>
              <strong>{String(i + 1).padStart(2, "0")}</strong>
              <p>Piste {String(i + 1).padStart(2, "0")}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Communaute({ go }) {
  const posts = [
    {
      name: "Alexandre M.",
      role: "3B Élite",
      text: "Très belle journée à tous ! Restez focus et continuez d’avancer, le meilleur est à venir. ✨",
      likes: 24,
      time: "09:32",
    },
    {
      name: "Sarah B.",
      role: "Ambassadrice 3B",
      text: "Merci Alexandre ! 🙏 Qui participe à l’atelier de ce soir ?",
      likes: 18,
      time: "09:45",
    },
    {
      name: "Julien T.",
      role: "3B Leader",
      text: "Je partagerai ma stratégie sur les réseaux à 18h. Ne manquez pas ça ! 🔥",
      likes: 31,
      time: "10:02",
    },
    {
      name: "3B International",
      role: "Officiel",
      text: "Rappel : Webinaire exclusif ce jeudi à 20h. Préparez vos questions ! 🚀",
      likes: 42,
      time: "10:15",
    },
  ];

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />

      <h1>Communauté</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Échangez, partagez et grandissez au sein de la communauté 3B International.
      </p>

      <div className="stats-card">
        <div>
          <strong>1 256</strong>
          <span>Membres</span>
        </div>
        <div>
          <strong className="online">● 24</strong>
          <span>En ligne</span>
        </div>
        <div>
          <strong>387</strong>
          <span>Messages aujourd’hui</span>
        </div>
      </div>

      <div className="posts">
        {posts.map((post, i) => (
          <div className="post-card" key={i}>
            <div className="avatar">
              {post.name === "3B International" ? "3B" : "👤"}
            </div>

            <div className="post-content">
              <div className="post-top">
                <div>
                  <strong>{post.name}</strong>
                  <span>{post.role}</span>
                </div>
                <em>{post.time}</em>
              </div>

              <p>{post.text}</p>

              <button className="like">💛 {post.likes}</button>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-box">
        <span>💬</span>
        <input placeholder="Écrivez votre message..." />
        <button>➤</button>
      </div>
    </div>
  );
}

function Secret({ go }) {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  function checkSecret() {
    if (code.trim().toLowerCase() === "italie") {
      setUnlocked(true);
    } else {
      alert("Code incorrect");
    }
  }

  return (
    <div className="page secret-page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Coffre secret 3B</h1>

      <p className="intro">
        Entrez le code secret pour débloquer l’indice caché dans l’univers 3B.
      </p>

      <h2>Code secret</h2>

      <div className="secret-input">
        <span>🔒</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code secret"
        />
        <button onClick={checkSecret}>Ouvrir</button>
      </div>

      <p className="intro small-text">
        Tapez le code exact. Le code actuel est prévu dans votre univers 3B.
      </p>

      {unlocked && (
        <div className="indice">
          <h3>Indice débloqué</h3>
          <p>Italie s’y comprennent — 8 juillet — 20h.</p>
        </div>
      )}

      <h2>Cadre 3B relief 3D tactile</h2>

      <p className="intro small-text">
        Touchez le 3B, gardez le doigt dessus, déplacez-le, puis lancez-le
        contre les bords du cadre.
      </p>

      <div className="relief-box">
        <div className="relief-logo">3B</div>
      </div>
    </div>
  );
}

function PasseportAccess({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Passeport 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Votre Passeport 3B regroupera votre identité, vos origines, votre pays,
        vos points, vos cartes, vos certificats et votre position dans le monde 3B.
      </p>

      <WorldMap3B originCountry="" />

      <InfoCard title="Ce que contient le Passeport 3B">
        <p>Identité membre</p>
        <p>Pays d’origine et pays de résidence</p>
        <p>Points fidélité 3B</p>
        <p>Niveau membre : Découverte, Héritier, Gardien, Légende</p>
        <p>Carte membre digitale</p>
        <p>Certificats produits et QR Code</p>
        <p>Position sur la carte 3B World</p>
      </InfoCard>

      <InfoCard title="Récompense d’entrée">
        <p>Création du compte : +100 points 3B</p>
        <p>Choix du pays d’origine : +50 points 3B</p>
        <p>Premier accès au Passeport : +25 points 3B</p>
      </InfoCard>

      <div className="menu-list">
        <MenuCard
          icon="👤"
          title="Créer mon compte 3B"
          onClick={() => go("passeport-inscription")}
        />

        <MenuCard
          icon="🔐"
          title="Me connecter"
          onClick={() => go("passeport-connexion")}
        />
      </div>
    </div>
  );
}

function PasseportInscription({ go, setMember }) {
  const [form, setForm] = useState({
    pseudo: "",
    email: "",
    password: "",
    originCountry: "",
    residenceCountry: "",
    city: "",
  });

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function createAccount() {
    const pseudo = form.pseudo.trim() || "Membre 3B";
    const originCountry = form.originCountry || "Non renseigné";
    const residenceCountry = form.residenceCountry || "Non renseigné";
    const city = form.city.trim() || "Non renseignée";
    const unlockedCountry = getUnlockedCountry(originCountry);

    const points =
      100 +
      (form.originCountry ? 50 : 0) +
      (form.residenceCountry ? 25 : 0) +
      (form.city.trim() ? 25 : 0) +
      (unlockedCountry ? 75 : 0);

    setMember({
      pseudo,
      email: form.email.trim() || "email non renseigné",
      originCountry,
      residenceCountry,
      city,
      unlockedCountry: unlockedCountry ? unlockedCountry.name : "Aucun pays 3B officiel",
      points,
      level: points >= 250 ? "Héritier" : "Découverte",
      card: "Carte Découverte 3B",
      serial: "3B-PASS-0001",
      createdAt: new Date().toLocaleDateString("fr-FR"),
    });

    go("passeport");
  }

  return (
    <div className="page">
      <BackButton onClick={() => go("passeport-access")} />
      <LogoHeader small />

      <h1>Inscription 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Créez votre compte pour débloquer votre Passeport 3B, vos points et votre
        pays d’origine sur la carte 3B World.
      </p>

      <Field icon="👤">
        <input
          value={form.pseudo}
          onChange={(e) => updateField("pseudo", e.target.value)}
          placeholder="Nom ou pseudo"
        />
      </Field>

      <br />

      <Field icon="✉️">
        <input
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="Adresse e-mail"
        />
      </Field>

      <br />

      <Field icon="🔒">
        <input
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          type="password"
          placeholder="Mot de passe"
        />
      </Field>

      <br />

      <Field icon="🌍">
        <select
          value={form.originCountry}
          onChange={(e) => updateField("originCountry", e.target.value)}
        >
          <option value="">Pays d’origine / provenance</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </Field>

      <br />

      <Field icon="📍">
        <select
          value={form.residenceCountry}
          onChange={(e) => updateField("residenceCountry", e.target.value)}
        >
          <option value="">Pays de résidence</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </Field>

      <br />

      <Field icon="🏙️">
        <input
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
          placeholder="Ville"
        />
      </Field>

      <WorldMap3B originCountry={form.originCountry} />

      <br />

      <button className="menu-card" onClick={createAccount}>
        <div className="icon-circle">◆</div>
        <span>Créer mon compte</span>
        <b>›</b>
      </button>

      <InfoCard title="Points débloqués à l’inscription">
        <p>Compte créé : +100 points</p>
        <p>Pays d’origine renseigné : +50 points</p>
        <p>Pays de résidence renseigné : +25 points</p>
        <p>Ville renseignée : +25 points</p>
        <p>Pays 3B officiel déverrouillé : +75 points</p>
      </InfoCard>

      <p className="intro small-text">
        Pour l’instant, c’est une maquette. Après, cette inscription sera connectée à Supabase.
      </p>
    </div>
  );
}

function PasseportConnexion({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("passeport-access")} />
      <LogoHeader small />

      <h1>Connexion 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Connectez-vous pour accéder à votre Passeport 3B.
      </p>

      <Field icon="✉️">
        <input placeholder="Adresse e-mail" />
      </Field>

      <br />

      <Field icon="🔒">
        <input type="password" placeholder="Mot de passe" />
      </Field>

      <br />

      <button className="menu-card" onClick={() => go("passeport")}>
        <div className="icon-circle">◆</div>
        <span>Entrer dans mon Passeport</span>
        <b>›</b>
      </button>

      <p className="intro small-text">
        Pour l’instant, c’est une maquette. Après, cette connexion sera connectée à Supabase.
      </p>
    </div>
  );
}

function Passeport({ go, member }) {
  const profile = member || {
    pseudo: "Membre 3B",
    email: "email non renseigné",
    originCountry: "Non renseigné",
    residenceCountry: "Non renseigné",
    city: "Non renseignée",
    unlockedCountry: "Aucun pays 3B officiel",
    points: 0,
    level: "Découverte",
    card: "Carte Découverte 3B",
    serial: "3B-PASS-0001",
    createdAt: new Date().toLocaleDateString("fr-FR"),
  };

  const progress = Math.min(profile.points, 300);
  const progressPercent = Math.round((progress / 300) * 100);

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Mon Passeport 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Bienvenue dans votre espace membre 3B International.
      </p>

      <WorldMap3B originCountry={profile.originCountry} />

      <InfoCard title="Carte membre digitale">
        <p>Nom : {profile.pseudo}</p>
        <p>E-mail : {profile.email}</p>
        <p>Numéro passeport : {profile.serial}</p>
        <p>Date de création : {profile.createdAt}</p>
      </InfoCard>

      <InfoCard title="Origine et position 3B World">
        <p>Pays d’origine : {profile.originCountry}</p>
        <p>Pays de résidence : {profile.residenceCountry}</p>
        <p>Ville : {profile.city}</p>
        <p>Pays 3B déverrouillé : {profile.unlockedCountry}</p>
      </InfoCard>

      <InfoCard title="Points et niveau">
        <p>Points 3B : {profile.points}</p>
        <p>Niveau actuel : {profile.level}</p>
        <p>Carte : {profile.card}</p>
        <p>Progression vers Gardien : {progressPercent}%</p>
      </InfoCard>

      <InfoCard title="Pays verrouillés">
        <p>Les 8 pays 3B sont visibles sur la carte.</p>
        <p>Votre pays d’origine est déverrouillé s’il fait partie des 8 pays officiels.</p>
        <p>Les autres pays 3B restent verrouillés.</p>
        <p>Le reste du monde reste visible sans nom, en couleur sombre.</p>
      </InfoCard>

      <InfoCard title="Avantages débloqués">
        <p>Accès au Passeport 3B</p>
        <p>Accès aux indices secrets</p>
        <p>Suivi des cartes de fidélité</p>
        <p>Accès futur aux drops privés</p>
      </InfoCard>

      <InfoCard title="Missions 3B">
        <p>Compléter son profil : +50 points</p>
        <p>Partager une création 3B : +100 points</p>
        <p>Inviter un membre : +150 points</p>
        <p>Participer à un drop : +200 points</p>
      </InfoCard>

      <InfoCard title="QR Code et certificat futur">
        <p>
          Ici viendra le QR Code personnel du membre, relié à son compte, à ses
          produits, à ses achats, à ses cartes et à ses certificats 3B.
        </p>
      </InfoCard>
    </div>
  );
}

function CartesFidelite({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Cartes de fidélité 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Les cartes de fidélité 3B serviront à récompenser les membres, débloquer
        des avantages et créer un lien premium avec la communauté.
      </p>

      <InfoCard title="Carte Découverte">
        <p>Accès aux premiers avantages 3B.</p>
        <p>Suivi des achats et premières récompenses.</p>
      </InfoCard>

      <InfoCard title="Carte Héritier">
        <p>Accès prioritaire à certaines collections.</p>
        <p>Récompenses renforcées et codes privés.</p>
      </InfoCard>

      <InfoCard title="Carte Légende">
        <p>Accès VIP, drops limités et événements exclusifs.</p>
      </InfoCard>
    </div>
  );
}

function Manga({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Manga 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Le Manga 3B International racontera l’univers, les personnages, les pays,
        les secrets et la montée de zéro à l’international.
      </p>

      <InfoCard title="Univers">
        <p>Une histoire entre identité, héritage, ambition et mystère.</p>
      </InfoCard>

      <InfoCard title="Personnages">
        <p>Chaque personnage pourra représenter une force, un pays ou une mission 3B.</p>
      </InfoCard>

      <InfoCard title="Secret 3B">
        <p>Le manga pourra aussi cacher des indices reliés à l’application.</p>
      </InfoCard>
    </div>
  );
}

function LogosInternationaux({ go }) {
  const logos = [
    "France",
    "Italie",
    "Estonie",
    "Turquie",
    "Algérie",
    "Tunisie",
    "Maroc",
    "Espagne",
  ];

  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>8 Logos Internationaux</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Espace officiel des 8 logos premium 3B International.
      </p>

      <div className="shop-grid">
        {logos.map((logo) => (
          <button className="product-slot" key={logo}>
            <div className="plus">◆</div>
            <p>{logo}</p>
            <span>3B</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateursCommandes({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Créateurs</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Ici viendra l’espace pour les créateurs, développeurs, designers et partenaires
        qui veulent participer à l’écosystème 3B.
      </p>

      <InfoCard title="Créateurs de contenu">
        <p>Inscription, missions, vidéos UGC et commissions futures.</p>
      </InfoCard>

      <InfoCard title="Commandes spéciales">
        <p>Demandes de visuels, maillots, concepts, logos et créations premium.</p>
      </InfoCard>

      <InfoCard title="Programme ambassadeur">
        <p>Classement, récompenses et sélection des meilleurs contenus.</p>
      </InfoCard>
    </div>
  );
}

function CertificatProduit({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Certificat Produit</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Chaque produit 3B pourra avoir un certificat digital avec numéro de série,
        QR Code, preuve d’authenticité et rareté.
      </p>

      <InfoCard title="Authenticité">
        <p>Produit officiel 3B International.</p>
        <p>Numéro de série unique.</p>
      </InfoCard>

      <InfoCard title="QR Code">
        <p>Scan du produit pour afficher son certificat digital.</p>
      </InfoCard>

      <InfoCard title="Édition limitée">
        <p>Preuve de rareté, collection et historique du produit.</p>
      </InfoCard>
    </div>
  );
}

function PlusEncore({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />

      <h1>Plus encore</h1>
      <div className="gold-line">◆</div>

      <div className="menu-list">
        <MenuCard
          icon="💳"
          title="Cartes de fidélité 3B"
          onClick={() => go("fidelite")}
        />

        <MenuCard
          icon="🛂"
          title="Passeport 3B"
          onClick={() => go("passeport-access")}
        />

        <MenuCard
          icon="📖"
          title="Manga 3B International"
          onClick={() => go("manga")}
        />

        <MenuCard
          icon="🌍"
          title="8 logos internationaux"
          onClick={() => go("logos")}
        />

        <MenuCard
          icon="♪"
          title="Album musique 20 titres"
          onClick={() => go("musique")}
        />

        <MenuCard
          icon="💻"
          title="Créateurs de programmes / commandes"
          onClick={() => go("createurs")}
        />

        <MenuCard
          icon="▣"
          title="Certificat de produit avec code QR"
          onClick={() => go("certificat")}
        />
      </div>

      <div className="diamond">◆</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(null);

  return (
    <main className="app">
      {page === "home" && <Home go={setPage} />}
      {page === "boutique" && <Boutique go={setPage} />}
      {page === "musique" && <Musique go={setPage} />}
      {page === "communaute" && <Communaute go={setPage} />}
      {page === "secret" && <Secret go={setPage} />}
      {page === "passeport-access" && <PasseportAccess go={setPage} />}
      {page === "passeport-inscription" && (
        <PasseportInscription go={setPage} setMember={setMember} />
      )}
      {page === "passeport-connexion" && <PasseportConnexion go={setPage} />}
      {page === "passeport" && <Passeport go={setPage} member={member} />}
      {page === "plus" && <PlusEncore go={setPage} />}
      {page === "fidelite" && <CartesFidelite go={setPage} />}
      {page === "manga" && <Manga go={setPage} />}
      {page === "logos" && <LogosInternationaux go={setPage} />}
      {page === "createurs" && <CreateursCommandes go={setPage} />}
      {page === "certificat" && <CertificatProduit go={setPage} />}
    </main>
  );
}