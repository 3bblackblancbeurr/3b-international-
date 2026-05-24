import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Jeu3B from "./Jeu3B";

const STORAGE_MEMBER_KEY = "3b_member_progress_v1";

const countries3B = [
  "France",
  "Italie",
  "Estonie",
  "Turquie",
  "Algérie",
  "Tunisie",
  "Maroc",
  "Espagne",
];

const allCountries = [
  "France",
  "Italie",
  "Estonie",
  "Turquie",
  "Algérie",
  "Tunisie",
  "Maroc",
  "Espagne",
  "Allemagne",
  "Belgique",
  "Suisse",
  "Portugal",
  "Pays-Bas",
  "Royaume-Uni",
  "États-Unis",
  "Canada",
  "Brésil",
  "Argentine",
  "Sénégal",
  "Côte d’Ivoire",
  "Mali",
  "Égypte",
  "Qatar",
  "Arabie Saoudite",
  "Émirats Arabes Unis",
  "Japon",
  "Chine",
  "Corée du Sud",
  "Australie",
];

const memberCards = [
  { name: "Découverte 3B", status: "automatique", type: "inscription", icon: "💠" },
  { name: "Héritier 3B", status: "bloqué", type: "points futurs", icon: "♛" },
  { name: "Gardien 3B", status: "bloqué", type: "points futurs", icon: "🛡️" },
  { name: "Élite 3B", status: "bloqué", type: "mission future", icon: "✦" },
  { name: "Légende 3B", status: "sur demande", type: "commande premium", icon: "★" },
  { name: "Secret 3B", status: "sur demande", type: "accès spécial", icon: "🔐" },
  { name: "Musique 3B", status: "sur demande", type: "univers musical", icon: "♪" },
  { name: "Jeux 3B", status: "sur demande", type: "XP jeux", icon: "🎮" },
  { name: "International 3B", status: "sur demande", type: "monde 3B", icon: "🌍" },
  { name: "Drop 3B", status: "sur demande", type: "drop privé", icon: "🔥" },
  { name: "Prototype 3B", status: "sur demande", type: "prototype", icon: "🎁" },
  { name: "Legacy 3B", status: "sur demande", type: "patrimoine", icon: "◆" },
];

function getSavedMember() {
  try {
    const saved = localStorage.getItem(STORAGE_MEMBER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveMember(member) {
  localStorage.setItem(STORAGE_MEMBER_KEY, JSON.stringify(member));
  localStorage.setItem("3b_passport_profile", JSON.stringify(member));
  localStorage.setItem("3b_member_profile", JSON.stringify(member));
}

function getLevel(points = 0) {
  if (points >= 5000) return { name: "Legacy", next: 10000 };
  if (points >= 2500) return { name: "Légende", next: 5000 };
  if (points >= 1200) return { name: "Élite", next: 2500 };
  if (points >= 500) return { name: "Gardien", next: 1200 };
  if (points >= 150) return { name: "Héritier", next: 500 };
  return { name: "Découverte", next: 150 };
}

function BackButton({ onClick }) {
  return (
    <button className="back-button" onClick={onClick}>
      ← Retour
    </button>
  );
}

function LogoHeader({ small = false }) {
  return (
    <header className={small ? "logo-header small" : "logo-header"}>
      <div className="logo-3b">3B</div>
      <div className="logo-word">INTERNATIONAL</div>
      <div className="logo-sub">VÊTEMENTS HAUT DE GAMME</div>
    </header>
  );
}

function MenuCard({ icon, title, onClick }) {
  return (
    <button className="menu-card" onClick={onClick}>
      <span className="menu-icon">{icon}</span>
      <span className="menu-title">{title}</span>
      <span className="menu-arrow">›</span>
    </button>
  );
}

function InfoCard({ title, children, visual }) {
  return (
    <article className="info-card">
      <div className="info-text">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
      {visual && <div className="info-visual">{visual}</div>}
    </article>
  );
}

function LevelLogo({ level }) {
  return (
    <div className="level-logo">
      <div className="level-logo-inner">3B</div>
      <span>{level?.name || "Découverte"}</span>
    </div>
  );
}

function ProgressCircle({ percent = 0, label = "3B" }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="progress-circle"
      style={{
        background: `conic-gradient(#f2c85b ${safePercent}%, rgba(242,200,91,.15) ${safePercent}%)`,
      }}
    >
      <div>
        <strong>{label}</strong>
        <span>{safePercent}%</span>
      </div>
    </div>
  );
}

function DigitalPassportVisual({ member }) {
  return (
    <div className="digital-passport-visual">
      <div className="passport-big">3B</div>
      <div className="passport-name">PASSEPORT NUMÉRIQUE</div>
      <div className="passport-user">{member?.name || "Membre 3B"}</div>
      <div className="passport-qr">QR</div>
      <div className="matrix-lines">
        010101 3B INTERNATIONAL 001101 PASSPORT 010101 LEGACY
      </div>
    </div>
  );
}

function FlagVisual({ country }) {
  const c = country || "France";

  return (
    <div className="flag-card">
      <div className={`flag flag-${c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="flag-3b">3B</div>
      <p>{c === "Aucun" ? "Aucun pays activé" : `🇫🇷 ${c} activée`}</p>
    </div>
  );
}

function WorldMapVisual({ unlocked }) {
  return (
    <div className="world-map-card">
      <div className="map-world">
        <span className="continent c1"></span>
        <span className="continent c2"></span>
        <span className="continent c3"></span>
        <span className="continent c4"></span>
        <span className="continent c5"></span>
        <span className="continent c6"></span>
        <span className="matrix-bg">010101 3B WORLD MAP 001101 INTERNATIONAL 010101</span>
      </div>

      <div className="map-zoom">
        {countries3B.map((country, index) => (
          <span
            key={country}
            className={`country-dot dot-${index + 1} ${
              unlocked === country ? "unlocked" : "locked"
            }`}
          >
            {country}
          </span>
        ))}
      </div>
    </div>
  );
}

function Home({ go, member }) {
  return (
    <main className="app home-page">
      <LogoHeader />

      <section className="home-menu">
        <MenuCard icon="🛍️" title="Boutique" onClick={() => go("boutique")} />
        <MenuCard icon="♪" title="Musique" onClick={() => go("musique")} />
        <MenuCard icon="👥" title="Communauté" onClick={() => go("communaute")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go(member ? "passport" : "passport-access")} />
        <MenuCard icon="🎮" title="Jeux" onClick={() => go("jeux")} />
        <MenuCard icon="🔐" title="Coffre secret 3B" onClick={() => go("secret")} />
        {member && <MenuCard icon="💎" title="Espace membre 3B" onClick={() => go("membre")} />}
        <MenuCard icon="☆" title="Plus encore" onClick={() => go("plus")} />
      </section>

      <div className="gold-diamond">◆</div>
    </main>
  );
}

function PassportAccess({ go, setMember }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [origin, setOrigin] = useState("");
  const [residence, setResidence] = useState("");
  const [city, setCity] = useState("");

  function createPassport() {
    const safeOrigin = countries3B.includes(origin) ? origin : "Aucun";

    const newMember = {
      name: name || "Membre 3B",
      email: email || "courriel non renseigné",
      courriel: email || "courriel non renseigné",
      originCountry: safeOrigin,
      paysOrigine: safeOrigin,
      residenceCountry: residence || "Non renseigné",
      paysResidence: residence || "Non renseigné",
      city: city || "Non renseignée",
      ville: city || "Non renseignée",
      unlockedCountry: safeOrigin,
      pays3B: safeOrigin,
      points: safeOrigin !== "Aucun" ? 170 : 100,
      points3B: safeOrigin !== "Aucun" ? 170 : 100,
      globalXp: safeOrigin !== "Aucun" ? 170 : 100,
      gamePoints: 0,
      gameXp: 0,
      xpJeu: 0,
      passportNumber: "3B-PASS-0001",
      numeroPasseport: "3B-PASS-0001",
      createdAt: "24/05/2026",
    };

    saveMember(newMember);
    setMember(newMember);
    go("passport");
  }

  return (
    <main className="app page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <section className="auth-box">
        <h1>Inscription 3B</h1>
        <div className="gold-line">◆</div>
        <p>Créez votre Passeport digital 3B pour débloquer votre accès membre.</p>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom ou pseudo" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" />

        <label className="select-label">
          Pays d’origine 3B
          <small>Choisis seulement parmi les 8 pays officiels 3B. Ce choix déverrouille ton pays 3B.</small>
          <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Choisir un pays 3B</option>
            {countries3B.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>

        <label className="select-label">
          Pays de résidence actuelle
          <small>Ici, c’est le pays où tu vis actuellement. Tu peux choisir n’importe quel pays.</small>
          <select value={residence} onChange={(e) => setResidence(e.target.value)}>
            <option value="">Choisir un pays de résidence</option>
            {allCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>

        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville actuelle" />

        <button className="gold-button" onClick={createPassport}>
          Créer mon Passeport 3B ›
        </button>

        <p className="mini-note">
          Maquette locale : plus tard, cette inscription sera connectée à Supabase.
        </p>
      </section>
    </main>
  );
}

function Passport({ go, member }) {
  const profile = member || getSavedMember();
  const unlocked = profile?.unlockedCountry || profile?.originCountry || profile?.paysOrigine || "Aucun";

  return (
    <main className="app page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <section className="passport-main">
        <h1>Passeport 3B</h1>
        <p>
          Vue monde + zoom sur les 8 pays 3B. Seul le pays d’origine 3B choisi
          pendant l’inscription se déverrouille.
        </p>

        <WorldMapVisual unlocked={unlocked} />

        <div className="passport-grid">
          <InfoCard title="Carte membre digitale" visual={<DigitalPassportVisual member={profile} />}>
            <p>Nom : {profile?.name || "Membre 3B"}</p>
            <p>Courriel : {profile?.email || profile?.courriel || "courriel non renseigné"}</p>
            <p>Numéro passeport : {profile?.passportNumber || "3B-PASS-0001"}</p>
            <p>Date de création : {profile?.createdAt || "24/05/2026"}</p>
          </InfoCard>

          <InfoCard title="Origine et résidence" visual={<FlagVisual country={unlocked === "Aucun" ? "France" : unlocked} />}>
            <p>Pays d’origine 3B activé : {profile?.originCountry || profile?.paysOrigine || "Non renseigné"}</p>
            <p>Pays de résidence actuelle : {profile?.residenceCountry || profile?.paysResidence || "Non renseigné"}</p>
            <p>Ville : {profile?.city || profile?.ville || "Non renseignée"}</p>
            <p>Pays 3B déverrouillé : {unlocked}</p>
          </InfoCard>
        </div>

        <button className="gold-button" onClick={() => go("membre")}>
          Voir mon espace membre 3B ›
        </button>
      </section>
    </main>
  );
}

function EspaceMembre({ go, member, game }) {
  const profile = member || getSavedMember() || {};
  const points = Number(profile.points3B || profile.globalXp || profile.points || 0);
  const gamePoints = Number(profile.gameXp || profile.xpJeu || profile.gamePoints || game?.xp || 0);
  const level = getLevel(points);
  const percent = Math.min(100, Math.round((points / level.next) * 100));
  const gamePercent = Math.min(100, Math.round(((game?.door || 1) - 1) * 10));

  const unlocked = profile.unlockedCountry || profile.originCountry || profile.paysOrigine || "Aucun";

  return (
    <main className="app page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <section className="member-space">
        <h1>Espace membre 3B</h1>
        <p>Résumé global du Passeport, des points, des cartes, des pays et du jeu.</p>

        <div className="page-grid compact-grid">
          <InfoCard title="Résumé actuel" visual={<LevelLogo level={level} />}>
            <p>Points 3B : {points}</p>
            <p>Points jeux : {gamePoints}</p>
            <p>Niveau actuel : {level.name}</p>
            <p>Prochain palier : {level.next} points</p>
          </InfoCard>

          <InfoCard title="Progression Jeux 3B" visual={<ProgressCircle percent={gamePercent} label="🎮" />}>
            <p>Niveau jeu : {game?.level || profile.gameLevel || 1} / 1000</p>
            <p>Porte : {game?.door || profile.gameDoor || 1} / 10</p>
            <p>XP jeux : {gamePoints}</p>
            <p>Le logo Jeux deviendra évolutif.</p>
          </InfoCard>

          <InfoCard title="Pays verrouillé" visual={<FlagVisual country={unlocked === "Aucun" ? "France" : unlocked} />}>
            {countries3B.map((country) => (
              <p key={country}>
                {country === unlocked ? "✅ Déverrouillé" : "🔒 Verrouillé"} : {country}
              </p>
            ))}
          </InfoCard>

          <InfoCard title="Avantages à débloquer" visual={<ProgressCircle percent={percent} label="3B" />}>
            <p>Accès au Passeport 3B</p>
            <p>Indices supplémentaires selon niveau</p>
            <p>Suivi des cartes de fidélité</p>
            <p>Accès futur aux gouttes privées</p>
          </InfoCard>

          <InfoCard title="Missions 3B" visual={<div className="xp-cube">XP</div>}>
            <p>Inviter un membre : +150 points</p>
            <p>Découvrir le secret 3B : +250 points + indice futur</p>
            <p>Prototype gratuit lors de sa sortie : récompense spéciale</p>
            <p>Clip TikTok avec une musique du compte 3D BlackBlanBeur + identification : points supplémentaires</p>
            <p>Jeux 3B : points gagnés en jouant, gagnant et passant des niveaux</p>
          </InfoCard>

          <InfoCard title="Mes 12 cartes 3B" visual={<div className="cards-mini">12</div>}>
            <div className="cards-grid">
              {memberCards.map((card) => (
                <div className="mini-card-3b" key={card.name}>
                  <span>{card.icon}</span>
                  <strong>{card.name}</strong>
                  <small>{card.status}</small>
                  <small>{card.type}</small>
                  <b>3B</b>
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Code QR et certificat futur" visual={<div className="qr-visual">QR</div>}>
            <p>Code QR personnel du membre.</p>
            <p>Relié au compte, aux produits, aux achats, aux cartes et aux certificats 3B.</p>
          </InfoCard>
        </div>
      </section>
    </main>
  );
}

function Secret({ go }) {
  const [code, setCode] = useState("");
  const unlocked = code.trim().toLowerCase() === "blackblancbeurr";

  return (
    <main className="app page secret-page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <section className="secret-box">
        <h1>Coffre secret 3B</h1>
        <p>Entrez le code secret pour débloquer l’indice.</p>

        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="🔐 Code secret" />

        {unlocked && (
          <div className="secret-unlocked">
            <h2>Indice débloqué</h2>
            <p>L’Italie s’y comprend — 8 juillet — 20h.</p>
            <p>TikTok en direct 3B International.</p>
            <h3>SALON ITALIE — HAUTE COUTURE 3B</h3>
            <p>
              Quand j’arriverai dans votre monde, vous comprendrez que 3B
              International entre dans une étape sérieuse : salon, Italie,
              présentation premium, univers luxe et ambition internationale.
            </p>
            <p>
              Récompense future : indice du prochain secret + prototype gratuit
              lors de sa sortie.
            </p>
            <div className="secret-icon">🔐🗝️</div>
          </div>
        )}
      </section>
    </main>
  );
}

function PlusEncore({ go }) {
  return (
    <main className="app page">
      <BackButton onClick={() => go("home")} />
      <h1>Plus encore</h1>
      <div className="gold-line">◆</div>

      <section className="home-menu">
        <MenuCard icon="💳" title="Cartes de fidélité 3B" onClick={() => go("cartes")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go("passport-access")} />
        <MenuCard icon="🎮" title="Jeux 3B" onClick={() => go("jeux")} />
        <MenuCard icon="📖" title="Manga 3B International" onClick={() => go("manga")} />
        <MenuCard icon="🌍" title="8 logos internationaux" onClick={() => go("logos")} />
        <MenuCard icon="♪" title="Album musique 20 titres" onClick={() => go("musique")} />
        <MenuCard icon="💻" title="Créateurs / commandes" onClick={() => go("createurs")} />
        <MenuCard icon="▣" title="Certificat produit avec QR" onClick={() => go("certificat")} />
      </section>
    </main>
  );
}

function SimplePage({ go, title, lines }) {
  return (
    <main className="app page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <section className="simple-box">
        <h1>{title}</h1>
        <div className="gold-line">◆</div>
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(() => getSavedMember());
  const [game, setGame] = useState(() => {
    try {
      const saved = localStorage.getItem("3b_game_progression_v4_premium_visual_games_reset");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const refreshGame = () => {
      try {
        const saved = localStorage.getItem("3b_game_progression_v4_premium_visual_games_reset");
        setGame(saved ? JSON.parse(saved) : null);
      } catch {
        setGame(null);
      }
    };

    refreshGame();
    window.addEventListener("storage", refreshGame);
    return () => window.removeEventListener("storage", refreshGame);
  }, [page]);

  return (
    <>
      {page === "home" && <Home go={setPage} member={member} />}
      {page === "passport-access" && <PassportAccess go={setPage} setMember={setMember} />}
      {page === "passport" && <Passport go={setPage} member={member} />}
      {page === "membre" && <EspaceMembre go={setPage} member={member} game={game} />}
      {page === "secret" && <Secret go={setPage} />}
      {page === "plus" && <PlusEncore go={setPage} />}
      {page === "jeux" && <Jeu3B go={setPage} />}

      {page === "boutique" && (
        <SimplePage
          go={setPage}
          title="Boutique 3B"
          lines={[
            "Espace boutique premium à connecter plus tard.",
            "Produits futurs : maillots, polos, hoodies, cartes, drops et prototypes.",
          ]}
        />
      )}

      {page === "musique" && (
        <SimplePage
          go={setPage}
          title="Musique 3B"
          lines={[
            "Album 3B International — 20 titres.",
            "Ici viendront les musiques, clips, sons TikTok et campagnes officielles.",
          ]}
        />
      )}

      {page === "communaute" && (
        <SimplePage
          go={setPage}
          title="Communauté 3B"
          lines={[
            "Espace communauté et tchat temps réel à connecter avec Supabase.",
            "Les membres pourront discuter, partager et suivre les annonces 3B.",
          ]}
        />
      )}

      {page === "cartes" && (
        <SimplePage
          go={setPage}
          title="Cartes de fidélité 3B"
          lines={[
            "Les cartes de fidélité seront principalement sur demande.",
            "Certaines cartes pourront être débloquées par points ou missions dans le futur.",
          ]}
        />
      )}

      {page === "manga" && (
        <SimplePage
          go={setPage}
          title="Manga 3B International"
          lines={[
            "Univers manga 3B à développer plus tard.",
            "Personnages, histoire, rivalités, héritage et monde international.",
          ]}
        />
      )}

      {page === "logos" && (
        <SimplePage
          go={setPage}
          title="8 logos internationaux"
          lines={[
            "France, Italie, Estonie, Turquie, Algérie, Tunisie, Maroc, Espagne.",
            "Chaque pays aura son logo, son histoire, sa carte, sa mission et son indice.",
          ]}
        />
      )}

      {page === "createurs" && (
        <SimplePage
          go={setPage}
          title="Créateurs / commandes"
          lines={[
            "Programme créateurs 3B à développer.",
            "UGC, commissions, contenu, codes créateurs et campagnes ADS.",
          ]}
        />
      )}

      {page === "certificat" && (
        <SimplePage
          go={setPage}
          title="Certificat produit avec QR"
          lines={[
            "Chaque produit pourra avoir un QR code et un certificat digital.",
            "Authenticité, rareté, numéro de série et historique produit.",
          ]}
        />
      )}
    </>
  );
}