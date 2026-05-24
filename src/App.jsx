import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Jeu3B from "./Jeu3B.jsx";

const MEMBER_KEY = "3b_member_progress_v2";
const GAME_KEY = "3b_game_progress_v2";

const official3BCountries = [
  { name: "France", flag: "🇫🇷", colors: ["#0055a4", "#ffffff", "#ef4135"] },
  { name: "Italie", flag: "🇮🇹", colors: ["#008c45", "#ffffff", "#cd212a"] },
  { name: "Estonie", flag: "🇪🇪", colors: ["#0072ce", "#000000", "#ffffff"] },
  { name: "Turquie", flag: "🇹🇷", colors: ["#e30a17", "#ffffff", "#e30a17"] },
  { name: "Algérie", flag: "🇩🇿", colors: ["#006233", "#ffffff", "#d21034"] },
  { name: "Tunisie", flag: "🇹🇳", colors: ["#e70013", "#ffffff", "#e70013"] },
  { name: "Maroc", flag: "🇲🇦", colors: ["#c1272d", "#006233", "#c1272d"] },
  { name: "Espagne", flag: "🇪🇸", colors: ["#aa151b", "#f1bf00", "#aa151b"] },
];

const musicSlots = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  title: `Musique 3B ${String(i + 1).padStart(2, "0")}`,
  status: "À ajouter",
}));

const memberCards = [
  { name: "Découverte 3B", status: "automatique", type: "inscription", icon: "💠" },
  { name: "Héritier 3B", status: "bloquée", type: "points futurs", icon: "♜" },
  { name: "Gardien 3B", status: "bloquée", type: "points futurs", icon: "🛡️" },
  { name: "Élite 3B", status: "bloquée", type: "mission future", icon: "✦" },
  { name: "Légende 3B", status: "sur demande", type: "commande premium", icon: "★" },
  { name: "Secret 3B", status: "sur demande", type: "accès spécial", icon: "🔐" },
  { name: "Musique 3B", status: "sur demande", type: "univers musical", icon: "♪" },
  { name: "Jeux 3B", status: "sur demande", type: "XP jeux", icon: "🎮" },
  { name: "International 3B", status: "sur demande", type: "monde 3B", icon: "🌍" },
  { name: "Drop 3B", status: "sur demande", type: "drop privé", icon: "🔥" },
  { name: "Prototype 3B", status: "sur demande", type: "prototype", icon: "🎁" },
  { name: "Legacy 3B", status: "sur demande", type: "patrimoine", icon: "◆" },
];

const defaultMember = null;

function readJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function randomPassportNumber() {
  return `3B-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function todayFr() {
  return new Date().toLocaleDateString("fr-FR");
}

function App() {
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(() => readJson(MEMBER_KEY, defaultMember));
  const [secretCode, setSecretCode] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    origin3B: "",
    residence: "",
    city: "",
  });

  useEffect(() => {
    if (member) saveJson(MEMBER_KEY, member);
  }, [member]);

  function go(next) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPage(next);
  }

  function createPassport(e) {
    e.preventDefault();

    const cleanName = form.name.trim() || "Membre 3B";
    const cleanEmail = form.email.trim() || "courriel non renseigné";
    const cleanOrigin = form.origin3B || "Non renseigné";
    const cleanResidence = form.residence.trim() || "Non renseigné";
    const cleanCity = form.city.trim() || "Non renseignée";

    const newMember = {
      name: cleanName,
      email: cleanEmail,
      origin3B: cleanOrigin,
      residence: cleanResidence,
      city: cleanCity,
      passportNumber: randomPassportNumber(),
      createdAt: todayFr(),
      points: 100,
      gamePoints: 0,
      levelName: "Découverte",
      status: "Membre 3B",
    };

    setMember(newMember);
    saveJson(MEMBER_KEY, newMember);

    const currentGame = readJson(GAME_KEY, null);
    if (!currentGame) {
      saveJson(GAME_KEY, {
        level: 1,
        door: 1,
        xp: 0,
        totalGood: 0,
        totalMistakes: 0,
        hintsUsed: 0,
        startedAt: Date.now(),
        lastPlayedAt: Date.now(),
        playerName: cleanName,
      });
    }

    go("passport");
  }

  function deletePassport() {
    localStorage.removeItem(MEMBER_KEY);
    localStorage.removeItem(GAME_KEY);
    setMember(null);
    go("home");
  }

  function unlockSecret() {
    const code = secretCode.trim().toLowerCase().replace(/\s+/g, "");
    if (code === "blackblancbeurr") {
      setSecretUnlocked(true);
    } else {
      setSecretUnlocked(false);
    }
  }

  const unlockedCountry = member?.origin3B && official3BCountries.some((c) => c.name === member.origin3B)
    ? member.origin3B
    : null;

  return (
    <div className="app-shell">
      <div className="bg-overlay" />

      {page === "home" && (
        <HomePage go={go} member={member} />
      )}

      {page === "boutique" && (
        <SimpleGridPage
          go={go}
          title="Boutique 3B"
          subtitle="Espace futur pour vêtements, prototypes, drops et commandes."
          cards={[
            ["🛍️", "Boutique future", "Ici viendront les produits 3B International."],
            ["👕", "Vêtements", "Maillots, polos, hoodies, vestes et pièces premium."],
            ["💎", "Logos métal", "Badges 3B luxe, aimants, pierres et finitions premium."],
            ["📦", "Commandes", "Commandes privées, suivi et futures précommandes."],
          ]}
        />
      )}

      {page === "musique" && (
        <MusicPage go={go} />
      )}

      {page === "communaute" && (
        <SimpleGridPage
          go={go}
          title="Communauté 3B"
          subtitle="Futur espace d’échange, créateurs, membres, messages et missions."
          cards={[
            ["👥", "Communauté", "Salon membre 3B pour échanger autour du projet."],
            ["🎬", "Créateurs", "Créateurs TikTok, clips, UGC et contenus autour de 3B."],
            ["🏆", "Missions", "Missions futures, points, récompenses et sélection des meilleures vidéos."],
            ["💬", "Tchat futur", "Connexion Supabase prévue pour messages en temps réel."],
          ]}
        />
      )}

      {page === "passport-access" && (
        <PassportAccess go={go} member={member} />
      )}

      {page === "passport-create" && (
        <PassportCreate go={go} form={form} setForm={setForm} createPassport={createPassport} />
      )}

      {page === "passport" && (
        <PassportPage go={go} member={member} unlockedCountry={unlockedCountry} deletePassport={deletePassport} />
      )}

      {page === "member-space" && (
        <MemberSpacePage go={go} member={member} unlockedCountry={unlockedCountry} />
      )}

      {page === "secret" && (
        <SecretPage
          go={go}
          secretCode={secretCode}
          setSecretCode={setSecretCode}
          unlockSecret={unlockSecret}
          secretUnlocked={secretUnlocked}
        />
      )}

      {page === "jeux" && (
        <GameEntryPage go={go} member={member} />
      )}

      {page === "jeu-actuel" && (
        <Jeu3B go={go} member={member} setMember={setMember} />
      )}

      {page === "plus" && (
        <MorePage go={go} />
      )}

      {page === "manga" && (
        <SimpleGridPage
          go={go}
          title="Manga 3B International"
          subtitle="Univers narratif futur autour de l’héritage 3B."
          cards={[
            ["📖", "Histoire", "Origine, personnages, parcours, identité et monde 3B."],
            ["🖊️", "Scénario", "Écriture progressive des chapitres."],
            ["🌍", "Pays", "Chaque pays peut devenir un chapitre 3B."],
            ["🔐", "Secret", "Indices et mystères intégrés à l’univers."],
          ]}
        />
      )}

      {page === "logos" && (
        <SimpleGridPage
          go={go}
          title="8 logos internationaux"
          subtitle="France, Italie, Estonie, Turquie, Algérie, Tunisie, Maroc, Espagne."
          cards={official3BCountries.map((c) => [
            c.flag,
            c.name,
            `Logo 3B ${c.name} officiel, version luxe premium.`,
          ])}
        />
      )}

      {page === "createurs" && (
        <SimpleGridPage
          go={go}
          title="Créateurs / commandes"
          subtitle="Futur programme créateurs, commissions, contenus et commandes."
          cards={[
            ["🎥", "Créateurs TikTok", "Les créateurs pourront publier des clips avec la musique 3B."],
            ["💰", "Commission", "Système futur de ventes affiliées et récompenses."],
            ["📦", "Commandes", "Suivi des demandes, cartes, prototypes et drops."],
            ["⭐", "Sélection", "Les meilleures vidéos pourront devenir des publicités 3B."],
          ]}
        />
      )}

      {page === "certificat" && (
        <SimpleGridPage
          go={go}
          title="Certificat produit avec QR"
          subtitle="Authenticité, numéro de série, rareté et preuve digitale."
          cards={[
            ["QR", "QR personnel", "Relié au compte membre, aux achats et aux produits."],
            ["🧾", "Certificat", "Certificat digital d’authenticité futur."],
            ["🔐", "Sécurité", "Suivi des produits, cartes et éditions limitées."],
            ["💎", "Rareté", "Preuve digitale des pièces rares 3B."],
          ]}
        />
      )}
    </div>
  );
}

function BrandHeader({ small = false }) {
  return (
    <header className={small ? "brand-header small" : "brand-header"}>
      <div className="brand-top">3B</div>
      <div className="brand-main">INTERNATIONAL</div>
      <div className="brand-sub">VÊTEMENTS HAUT DE GAMME</div>
    </header>
  );
}

function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      ← Retour
    </button>
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
    <section className="lux-card">
      <div className="lux-copy">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
      {visual && <div className="lux-visual">{visual}</div>}
    </section>
  );
}

function HomePage({ go, member }) {
  return (
    <main className="page home-page">
      <BrandHeader />
      <section className="home-grid">
        <MenuCard icon="🛍️" title="Boutique" onClick={() => go("boutique")} />
        <MenuCard icon="♪" title="Musique" onClick={() => go("musique")} />
        <MenuCard icon="👥" title="Communauté" onClick={() => go("communaute")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go("passport-access")} />
        <MenuCard icon="🎮" title="Jeux" onClick={() => go("jeux")} />
        <MenuCard icon="🔐" title="Coffre secret 3B" onClick={() => go("secret")} />
        {member && (
          <MenuCard icon="💎" title="Espace membre 3B" onClick={() => go("member-space")} />
        )}
        <MenuCard icon="☆" title="Plus encore" onClick={() => go("plus")} />
      </section>
    </main>
  );
}

function SimpleGridPage({ go, title, subtitle, cards }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle title={title} subtitle={subtitle} />
      <section className="page-grid">
        {cards.map((card, index) => (
          <InfoCard
            key={index}
            title={card[1]}
            visual={<BadgeVisual icon={card[0]} />}
          >
            <p>{card[2]}</p>
          </InfoCard>
        ))}
      </section>
    </main>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="gold-line">◆</div>
    </div>
  );
}

function BadgeVisual({ icon }) {
  return (
    <div className="badge-visual">
      <span>{icon}</span>
    </div>
  );
}

function MusicPage({ go }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle
        title="Musique 3B"
        subtitle="Album 3B International — 20 titres à ajouter."
      />
      <section className="music-grid">
        {musicSlots.map((track) => (
          <div className="music-slot" key={track.id}>
            <div className="music-number">{String(track.id).padStart(2, "0")}</div>
            <h2>{track.title}</h2>
            <p>{track.status}</p>
            <div className="music-upload">+ Ajouter musique</div>
          </div>
        ))}
      </section>
    </main>
  );
}

function PassportAccess({ go, member }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle
        title="Passeport 3B"
        subtitle="Accès membre et identité numérique 3B."
      />
      <section className="page-grid">
        <InfoCard title="Créer mon Passeport 3B" visual={<BadgeVisual icon="🛂" />}>
          <p>Inscription membre, pays d’origine 3B, résidence et numéro passeport.</p>
          <button className="primary-btn" onClick={() => go("passport-create")}>
            Créer le passeport
          </button>
        </InfoCard>

        <InfoCard title="Voir mon Passeport" visual={<PassportMiniCard member={member} />}>
          <p>Accès à la carte du monde 3B, carte membre digitale et origine/résidence.</p>
          <button className="primary-btn" onClick={() => go(member ? "passport" : "passport-create")}>
            Ouvrir
          </button>
        </InfoCard>

        <InfoCard title="Espace membre 3B" visual={<BadgeVisual icon="💎" />}>
          <p>Après création du passeport, une case membre apparaît dans le menu général.</p>
          <button className="primary-btn" onClick={() => go(member ? "member-space" : "passport-create")}>
            Accéder
          </button>
        </InfoCard>

        <InfoCard title="Progression jeux" visual={<BadgeVisual icon="🎮" />}>
          <p>Les XP du jeu seront sauvegardés seulement quand le passeport existe.</p>
          <button className="primary-btn" onClick={() => go("jeux")}>
            Voir jeux
          </button>
        </InfoCard>
      </section>
    </main>
  );
}

function PassportCreate({ go, form, setForm, createPassport }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("passport-access")} />
      <BrandHeader small />
      <PageTitle
        title="Inscription 3B"
        subtitle="Crée ton Passeport digital 3B pour débloquer ton accès membre."
      />

      <form className="passport-form" onSubmit={createPassport}>
        <div className="form-grid">
          <label>
            Nom ou pseudo
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Zakaria"
            />
          </label>

          <label>
            Adresse e-mail
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Ex : email@gmail.com"
            />
          </label>

          <label>
            Pays d’origine 3B
            <select
              value={form.origin3B}
              onChange={(e) => setForm({ ...form, origin3B: e.target.value })}
            >
              <option value="">Choisis seulement parmi les 8 pays officiels 3B</option>
              {official3BCountries.map((country) => (
                <option key={country.name} value={country.name}>
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
            <small>
              Ce choix active ton pays 3B. Seuls les 8 pays officiels sont possibles.
            </small>
          </label>

          <label>
            Pays de résidence actuelle
            <input
              value={form.residence}
              onChange={(e) => setForm({ ...form, residence: e.target.value })}
              placeholder="Pays où tu vis actuellement"
            />
            <small>
              Ici, tu peux écrire n’importe quel pays du monde.
            </small>
          </label>

          <label>
            Ville actuelle
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Ville"
            />
          </label>
        </div>

        <button className="primary-btn big" type="submit">
          Créer mon Passeport 3B
        </button>
      </form>
    </main>
  );
}

function PassportPage({ go, member, unlockedCountry, deletePassport }) {
  if (!member) {
    return (
      <main className="page">
        <BackButton onClick={() => go("passport-access")} />
        <BrandHeader small />
        <PageTitle title="Passeport non créé" subtitle="Crée d’abord ton Passeport 3B." />
        <button className="primary-btn" onClick={() => go("passport-create")}>
          Créer le passeport
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle title="Passeport 3B" subtitle="Carte du monde, identité et accès numérique 3B." />

      <section className="page-grid">
        <InfoCard title="Carte du monde 3B" visual={<WorldMapPremium unlockedCountry={unlockedCountry} />}>
          <p>Vue monde + zoom premium sur les 8 pays officiels 3B.</p>
          <p>Seul le pays d’origine 3B choisi pendant l’inscription est déverrouillé.</p>
        </InfoCard>

        <InfoCard title="Pays 3B actif" visual={<FlagVisual country={unlockedCountry || "Aucun"} />}>
          <p>{unlockedCountry ? `${unlockedCountry} est activé.` : "Aucun pays 3B officiel activé."}</p>
          <p>Les autres pays restent verrouillés.</p>
        </InfoCard>

        <InfoCard title="Carte membre digitale" visual={<PassportMiniCard member={member} premium />}>
          <p>Nom : {member.name}</p>
          <p>E-mail : {member.email}</p>
          <p>Numéro : {member.passportNumber}</p>
          <p>Date : {member.createdAt}</p>
        </InfoCard>

        <InfoCard title="Origine et résidence" visual={<FlagVisual country={unlockedCountry || "Aucun"} />}>
          <p>Pays 3B : {member.origin3B}</p>
          <p>Résidence : {member.residence}</p>
          <p>Ville : {member.city}</p>
        </InfoCard>

        <InfoCard title="Gestion locale" visual={<BadgeVisual icon="⚙️" />}>
          <p>Le passeport est enregistré localement sur cet appareil.</p>
          <button className="danger-btn" onClick={deletePassport}>
            Supprimer le passeport local
          </button>
        </InfoCard>

        <InfoCard title="Espace membre" visual={<BadgeVisual icon="💎" />}>
          <p>Retrouve les points, cartes, avantages, missions, QR et progression.</p>
          <button className="primary-btn" onClick={() => go("member-space")}>
            Ouvrir l’espace membre
          </button>
        </InfoCard>
      </section>
    </main>
  );
}

function MemberSpacePage({ go, member, unlockedCountry }) {
  const game = readJson(GAME_KEY, {
    level: 1,
    door: 1,
    xp: 0,
    totalGood: 0,
    totalMistakes: 0,
    hintsUsed: 0,
  });

  const totalPoints = (member?.points || 0) + (member?.gamePoints || 0);
  const nextGoal = totalPoints < 500 ? 500 : totalPoints < 1500 ? 1500 : totalPoints < 5000 ? 5000 : 10000;
  const progress = Math.min(100, Math.round((totalPoints / nextGoal) * 100));

  if (!member) {
    return (
      <main className="page">
        <BackButton onClick={() => go("home")} />
        <BrandHeader small />
        <PageTitle title="Espace membre 3B" subtitle="Crée d’abord ton passeport." />
        <button className="primary-btn" onClick={() => go("passport-create")}>
          Créer mon passeport
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle title="Espace membre 3B" subtitle="Suivi premium de ton univers 3B." />

      <section className="page-grid">
        <InfoCard title="Résumé actuel" visual={<ProgressCircle percent={progress} label="3B" />}>
          <p>Points 3B : {member.points || 0}</p>
          <p>Points jeux : {member.gamePoints || 0}</p>
          <p>Niveau membre : {member.levelName || "Découverte"}</p>
          <p>Prochain palier : {nextGoal} points</p>
        </InfoCard>

        <InfoCard title="Progression Jeux 3B" visual={<ProgressCircle percent={Math.round(((game.door - 1) / 10) * 100)} label="XP" />}>
          <p>Niveau jeu : {game.level || 1} / 1000</p>
          <p>Porte : {game.door || 1} / 10</p>
          <p>XP jeu : {game.xp || 0}</p>
          <p>Les XP montent lentement pour garder le jeu long.</p>
        </InfoCard>

        <InfoCard title="Pays verrouillé" visual={<FlagVisual country={unlockedCountry || "Aucun"} />}>
          {official3BCountries.map((country) => (
            <p key={country.name}>
              {country.flag} {country.name} : {country.name === unlockedCountry ? "déverrouillé ✅" : "verrouillé 🔒"}
            </p>
          ))}
        </InfoCard>

        <InfoCard title="Avantages à débloquer" visual={<BadgeVisual icon="🎁" />}>
          <p>Accès au Passeport 3B</p>
          <p>Indices supplémentaires selon niveau</p>
          <p>Suivi des cartes</p>
          <p>Accès futur aux drops privés</p>
        </InfoCard>

        <InfoCard title="Missions 3B" visual={<BadgeVisual icon="XP" />}>
          <p>Inviter un membre : +150 points</p>
          <p>Découvrir le secret 3B : +250 points + indice futur</p>
          <p>Prototype gratuit lors de sa sortie : récompense spéciale</p>
          <p>Clip TikTok avec une musique 3B : points supplémentaires</p>
          <p>Jeux 3B : XP gagnés en jouant, gagnant et passant des niveaux</p>
        </InfoCard>

        <InfoCard title="Mes 12 cartes 3B" visual={<BadgeVisual icon="💳" />}>
          <div className="cards-mini-grid">
            {memberCards.map((card) => (
              <div className="mini-member-card" key={card.name}>
                <span>{card.icon}</span>
                <strong>{card.name}</strong>
                <small>{card.status}</small>
                <small>{card.type}</small>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Code QR et certificat futur" visual={<BadgeVisual icon="QR" />}>
          <p>Code QR personnel du membre.</p>
          <p>Relié au compte, aux produits, aux achats, aux cartes et aux certificats 3B.</p>
        </InfoCard>

        <InfoCard title="Passeport numérique" visual={<PassportMiniCard member={member} premium />}>
          <p>Identité membre 3B.</p>
          <p>Points et progression.</p>
          <p>Carte numérique.</p>
          <p>Accès aux pays débloqués.</p>
        </InfoCard>
      </section>
    </main>
  );
}

function SecretPage({ go, secretCode, setSecretCode, unlockSecret, secretUnlocked }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle
        title="Coffre secret 3B"
        subtitle="Entrez le code secret pour débloquer l’indice."
      />

      <section className="page-grid">
        <InfoCard title="Code secret" visual={<BadgeVisual icon="🔐" />}>
          <input
            className="secret-input"
            type="password"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            placeholder="Code secret"
          />
          <button className="primary-btn" onClick={unlockSecret}>
            Débloquer
          </button>
        </InfoCard>

        <InfoCard title="Verrouillage d’accès" visual={<BadgeVisual icon="🗝️" />}>
          <p>Le contenu secret apparaîtra ici après validation du bon code.</p>
          <p>Le code n’est pas affiché publiquement.</p>
        </InfoCard>

        {secretUnlocked && (
          <>
            <InfoCard title="Indice débloqué" visual={<BadgeVisual icon="🔓" />}>
              <p>L’Italie s’y comprend — 8 juillet — 20h.</p>
              <p>TikTok en direct 3B International.</p>
              <p className="couture-line">SALON ITALIE — HAUTE COUTURE 3B</p>
              <p>
                Quand j’arriverai dans votre monde, vous comprendrez que 3B International
                entre dans une étape sérieuse : salon, Italie, présentation premium,
                univers luxe et ambition internationale.
              </p>
              <p>Récompense future : indice du prochain secret + prototype gratuit lors de sa sortie.</p>
            </InfoCard>

            <InfoCard title="Récompense secrète" visual={<BadgeVisual icon="🎁" />}>
              <p>Indice du prochain secret.</p>
              <p>Prototype gratuit lors de sa sortie.</p>
              <p>Accès futur à des missions réservées.</p>
            </InfoCard>
          </>
        )}
      </section>
    </main>
  );
}

function GameEntryPage({ go, member }) {
  const game = readJson(GAME_KEY, null);

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle title="Jeu 3B" subtitle="Centre de lancement du jeu actuel." />

      <section className="page-grid">
        <InfoCard title="Jeu actuel" visual={<BadgeVisual icon="🎮" />}>
          <p>Portes 3B — mots, pays, secret, musique et ADN 3B.</p>
          <p>1000 niveaux • 10 portes par niveau • progression actuelle dans Jeu3B.</p>
          <button className="primary-btn" onClick={() => go("jeu-actuel")}>
            Ouvrir le jeu
          </button>
        </InfoCard>

        <InfoCard title="Sauvegarde" visual={<BadgeVisual icon="💾" />}>
          {member ? (
            <>
              <p>Passeport détecté : {member.name}</p>
              <p>La progression est sauvegardée automatiquement.</p>
            </>
          ) : (
            <>
              <p>Mode invité détecté.</p>
              <p>Crée ton passeport pour conserver XP, classement et progression.</p>
            </>
          )}
        </InfoCard>

        <InfoCard title="Classement" visual={<BadgeVisual icon="🏆" />}>
          <RankingBox member={member} game={game} />
        </InfoCard>

        <InfoCard title="Règles" visual={<BadgeVisual icon="XP" />}>
          <p>Bonne réponse : XP gagné.</p>
          <p>Indice utilisé : XP réduit.</p>
          <p>Erreur : réponse à refaire.</p>
          <p>Plus le niveau monte, plus la difficulté augmente.</p>
        </InfoCard>
      </section>
    </main>
  );
}

function RankingBox({ member, game }) {
  if (!member || !game) {
    return <p>Aucun classement enregistré pour l’instant.</p>;
  }

  return (
    <div className="ranking-box">
      <p>🥇 {member.name}</p>
      <p>Niveau : {game.level || 1} / 1000</p>
      <p>Porte : {game.door || 1} / 10</p>
      <p>XP : {game.xp || 0}</p>
      <p>Bonnes réponses : {game.totalGood || 0}</p>
      <p>Indices utilisés : {game.hintsUsed || 0}</p>
    </div>
  );
}

function MorePage({ go }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <BrandHeader small />
      <PageTitle title="Plus encore" subtitle="Extensions futures de l’écosystème 3B." />

      <section className="home-grid">
        <MenuCard icon="💳" title="Cartes de fidélité" onClick={() => go("member-space")} />
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

function PassportMiniCard({ member, premium = false }) {
  return (
    <div className={premium ? "passport-mini premium" : "passport-mini"}>
      <div className="passport-chip" />
      <div className="passport-glow" />
      <strong>3B</strong>
      <span>PASSEPORT</span>
      <span>NUMÉRIQUE</span>
      <small>{member?.name || "Membre 3B"}</small>
      <small>{member?.passportNumber || "3B-PASS-0001"}</small>
      <div className="qr-square">QR</div>
    </div>
  );
}

function FlagVisual({ country }) {
  const found = official3BCountries.find((c) => c.name === country);

  if (!found) {
    return (
      <div className="flag-card neutral">
        <strong>3B</strong>
        <small>Aucun pays activé</small>
      </div>
    );
  }

  return (
    <div className="flag-card">
      <div className="flag-stripes">
        {found.colors.map((color, index) => (
          <span key={index} style={{ background: color }} />
        ))}
      </div>
      <strong>3B</strong>
      <small>{found.flag} {found.name} activé</small>
    </div>
  );
}

function ProgressCircle({ percent, label }) {
  const degree = Math.min(100, Math.max(0, percent)) * 3.6;
  return (
    <div
      className="progress-circle"
      style={{ background: `conic-gradient(#f3d06b ${degree}deg, rgba(243,208,107,.18) 0deg)` }}
    >
      <div>
        <strong>{label}</strong>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

function WorldMapPremium({ unlockedCountry }) {
  return (
    <div className="world-premium">
      <svg viewBox="0 0 900 420" className="world-svg" role="img" aria-label="Carte du monde 3B digitale">
        <defs>
          <linearGradient id="mapGlow" x1="0" x2="1">
            <stop offset="0%" stopColor="#0ad7ff" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#0ad7ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0ad7ff" stopOpacity="0.24" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#0ad7ff" strokeOpacity=".12" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="900" height="420" rx="28" fill="#03131d" />
        <rect x="0" y="0" width="900" height="420" rx="28" fill="url(#grid)" />

        <g fill="url(#mapGlow)" stroke="#49dfff" strokeWidth="2.4" filter="url(#glow)">
          <path d="M84 142 C126 78 223 62 288 89 C338 110 329 162 275 183 C220 205 159 198 108 176 C84 166 72 157 84 142Z" />
          <path d="M286 198 C331 187 378 204 399 242 C421 282 398 341 349 352 C302 362 267 328 263 284 C260 245 256 212 286 198Z" />
          <path d="M421 103 C498 58 605 70 674 118 C730 157 715 217 639 230 C568 242 502 216 452 185 C408 157 382 127 421 103Z" />
          <path d="M569 251 C621 237 683 260 700 298 C718 339 665 371 609 358 C554 345 524 285 569 251Z" />
          <path d="M703 157 C754 117 837 124 869 167 C899 207 851 254 790 249 C734 244 665 191 703 157Z" />
          <path d="M648 66 C688 45 745 45 782 76 C809 99 785 129 742 128 C699 127 624 94 648 66Z" />
        </g>

        <g className="map-dots">
          <MapPoint x={438} y={164} label="France" active={unlockedCountry === "France"} />
          <MapPoint x={482} y={206} label="Italie" active={unlockedCountry === "Italie"} />
          <MapPoint x={558} y={104} label="Estonie" active={unlockedCountry === "Estonie"} />
          <MapPoint x={642} y={218} label="Turquie" active={unlockedCountry === "Turquie"} />
          <MapPoint x={414} y={259} label="Algérie" active={unlockedCountry === "Algérie"} />
          <MapPoint x={472} y={243} label="Tunisie" active={unlockedCountry === "Tunisie"} />
          <MapPoint x={354} y={244} label="Maroc" active={unlockedCountry === "Maroc"} />
          <MapPoint x={360} y={194} label="Espagne" active={unlockedCountry === "Espagne"} />
        </g>

        <text x="28" y="390" fill="#49dfff" opacity=".55" fontSize="18">
          010101 3B WORLD MAP 001101 3B INTERNATIONAL
        </text>
      </svg>

      <svg viewBox="0 0 900 420" className="world-svg zoom" role="img" aria-label="Zoom 8 pays 3B">
        <defs>
          <pattern id="zoomGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#0ad7ff" strokeOpacity=".14" strokeWidth="1" />
          </pattern>
          <filter id="zoomGlow">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="900" height="420" rx="28" fill="#04131c" />
        <rect x="0" y="0" width="900" height="420" rx="28" fill="url(#zoomGrid)" />

        <g fill="rgba(10,215,255,.18)" stroke="#58e5ff" strokeWidth="3" filter="url(#zoomGlow)">
          <path d="M120 215 C190 115 300 105 390 150 C452 180 435 246 350 260 C260 275 174 260 120 215Z" />
          <path d="M382 190 C425 160 475 168 493 205 C511 240 480 272 439 258 C405 247 360 222 382 190Z" />
          <path d="M500 154 C585 95 719 116 797 184 C853 233 808 300 707 287 C618 276 528 235 500 154Z" />
          <path d="M333 267 C406 247 493 268 520 324 C468 350 384 342 322 310 C287 292 290 278 333 267Z" />
        </g>

        <MapPoint x={365} y={175} label="France" active={unlockedCountry === "France"} />
        <MapPoint x={455} y={220} label="Italie" active={unlockedCountry === "Italie"} />
        <MapPoint x={585} y={125} label="Estonie" active={unlockedCountry === "Estonie"} />
        <MapPoint x={700} y={240} label="Turquie" active={unlockedCountry === "Turquie"} />
        <MapPoint x={360} y={310} label="Algérie" active={unlockedCountry === "Algérie"} />
        <MapPoint x={460} y={290} label="Tunisie" active={unlockedCountry === "Tunisie"} />
        <MapPoint x={250} y={270} label="Maroc" active={unlockedCountry === "Maroc"} />
        <MapPoint x={250} y={215} label="Espagne" active={unlockedCountry === "Espagne"} />
      </svg>
    </div>
  );
}

function MapPoint({ x, y, label, active }) {
  return (
    <g filter="url(#glow)">
      <circle cx={x} cy={y} r={active ? 9 : 6} fill={active ? "#f3d06b" : "#03131d"} stroke={active ? "#f3d06b" : "#6ee8ff"} strokeWidth="3" />
      <line x1={x + 6} y1={y - 4} x2={x + 48} y2={y - 22} stroke={active ? "#f3d06b" : "#6ee8ff"} strokeWidth="1.5" />
      <rect x={x + 48} y={y - 38} width="92" height="28" rx="8" fill={active ? "rgba(243,208,107,.18)" : "rgba(4,19,28,.88)"} stroke={active ? "#f3d06b" : "#6ee8ff"} />
      <text x={x + 58} y={y - 19} fill={active ? "#f3d06b" : "#dffcff"} fontSize="15" fontWeight="700">
        {label}
      </text>
    </g>
  );
}

export default App;