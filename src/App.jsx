import React, { useMemo, useState } from "react";
import Jeu3B from "./Jeu3B.jsx";

const STORAGE_MEMBER_KEY = "3b_member_passport_v3_final";
const STORAGE_OPTIONS_KEY = "3b_options_v3_final";

const COUNTRIES = [
  { name: "France", flag: "🇫🇷", status: "Déverrouillé", code: "FR" },
  { name: "Italie", flag: "🇮🇹", status: "Verrouillé", code: "IT" },
  { name: "Estonie", flag: "🇪🇪", status: "Verrouillé", code: "EE" },
  { name: "Turquie", flag: "🇹🇷", status: "Verrouillé", code: "TR" },
  { name: "Algérie", flag: "🇩🇿", status: "Verrouillé", code: "DZ" },
  { name: "Tunisie", flag: "🇹🇳", status: "Verrouillé", code: "TN" },
  { name: "Maroc", flag: "🇲🇦", status: "Verrouillé", code: "MA" },
  { name: "Espagne", flag: "🇪🇸", status: "Verrouillé", code: "ES" },
];

const CARDS = [
  ["Découverte", "active", "Bleu digital"],
  ["Héritier", "active", "Noir héritage"],
  ["Gardien", "locked", "Or protecteur"],
  ["Légende", "locked", "Or légendaire"],
  ["Explorateur", "locked", "Bleu monde"],
  ["Stratège", "locked", "Noir tactique"],
  ["Visionnaire", "locked", "Or futur"],
  ["Élite", "locked", "Argent premium"],
  ["Alliance", "locked", "Bleu alliance"],
  ["Maître", "locked", "Noir maître"],
  ["Prime", "locked", "Or prime"],
  ["Éternel", "locked", "Noir éternel"],
];

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function makePassportNumber() {
  return `3B-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function todayFr() {
  return new Date().toLocaleDateString("fr-FR");
}

function BackButton({ onClick, label = "Accueil" }) {
  return (
    <button className="back-pill" onClick={onClick}>
      ← {label}
    </button>
  );
}

function App() {
  const [started, setStarted] = useState(false);
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(() => readJson(STORAGE_MEMBER_KEY, null));
  const [options, setOptions] = useState(() =>
    readJson(STORAGE_OPTIONS_KEY, {
      animations: true,
      sound: false,
      performance: false,
    })
  );

  function go(next) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPage(next);
  }

  function saveMember(next) {
    localStorage.setItem(STORAGE_MEMBER_KEY, JSON.stringify(next));
    setMember(next);
  }

  function saveOptions(next) {
    localStorage.setItem(STORAGE_OPTIONS_KEY, JSON.stringify(next));
    setOptions(next);
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_MEMBER_KEY);
    localStorage.removeItem("3b_game_v3_final");
    setMember(null);
    go("passeport");
  }

  if (!started) return <IntroScreen onStart={() => setStarted(true)} />;

  return (
    <div className={`app-shell ${options.animations ? "animations-on" : "animations-off"}`}>
      <div className="app-bg" />
      <main className="app-main">
        {page === "home" && <HomePage go={go} member={member} />}
        {page === "boutique" && (
          <StaticPage title="Boutique" subtitle="Produits premium, drops et collections." go={go} />
        )}
        {page === "musique" && (
          <StaticPage title="Musique 3B" subtitle="20 cases prêtes pour vos fichiers audio, sons officiels et campagnes." go={go} />
        )}
        {page === "communaute" && (
          <StaticPage title="Communauté" subtitle="Échange, réseau, créateurs et futur chat 3B." go={go} />
        )}
        {page === "bis" && (
          <StaticPage title="Encore / Bis" subtitle="Créateurs, extras, certificats et futures extensions." go={go} />
        )}
        {page === "passeport" && <PassportFlow go={go} member={member} saveMember={saveMember} />}
        {page === "monde" && <World3BPage go={go} member={member} />}
        {page === "membre" && <MemberPage go={go} member={member} />}
        {page === "secret" && <SecretPage go={go} />}
        {page === "jeux" && <JeuxPage go={go} />}
        {page === "guide" && <GuidePage go={go} />}
        {page === "options" && (
          <OptionsPage
            go={go}
            options={options}
            saveOptions={saveOptions}
            resetAll={resetAll}
          />
        )}
      </main>
    </div>
  );
}

function IntroScreen({ onStart }) {
  return (
    <div className="intro-screen">
      <div className="intro-overlay" />
      <div className="intro-content">
        <div className="intro-kicker">3B INTERNATIONAL</div>
        <h1>DE ZÉRO À L’INTERNATIONAL</h1>
        <p>
          Votre passeport, vos jeux, vos cartes, votre monde 3B. Un centre premium pour construire l’héritage.
        </p>
        <button className="start-button" onClick={onStart}>
          COMMENCER
        </button>
      </div>
    </div>
  );
}

function HomePage({ go, member }) {
  const cards = [
    ["🛍️", "Boutique", "Produits premium, drops et collections.", "boutique", "locked-work"],
    ["♪", "Musique", "20 cases prêtes pour vos fichiers audio.", "musique", "locked-work"],
    ["👥", "Communauté", "Échange, réseau et espace de discussion 3B.", "communaute", "locked-work"],
    ["▣", "Passeport 3B", member ? "Ton passeport numérique premium." : "Créer ton passeport numérique premium.", "passeport"],
    ["🎮", "Jeux", "Jeux stylés, XP, progression et classement.", "jeux"],
    ["🔐", "Coffre secret 3B", "Saisir le code secret pour débloquer l’indice.", "secret"],
    ["💎", "Espace membre 3B", "Profil, suivi, progression, cartes et avantages.", "membre"],
    ["⭐", "Encore / Bis", "Créateurs, extras, certificats et futures extensions.", "bis", "locked-work"],
    ["🧭", "Guide explorateur", "Missions, étapes, aide et parcours 3B.", "guide"],
    ["⚙️", "Options", "Animations, sons, performance mobile et reset.", "options"],
  ];

  return (
    <section className="home-5050-layout">
      <div className="home-left-panel">
        <div className="brand-label">3B INTERNATIONAL</div>
        <h1>VÊTEMENTS HAUT DE GAMME</h1>
        <p>BLACK • BLANC • BEUR — ce n’est pas une marque, c’est un héritage.</p>
      </div>

      <div className="home-right-panel welcome-panel">
        <span className="status-chip">{member ? "Membre 3B" : "Visiteur de mode"}</span>
        <h2>
          {member
            ? `Bienvenue ${member.name} dans l’écosystème 3B`
            : "Bienvenue dans l’écosystème 3B"}
        </h2>
        <p>
          {member
            ? "Votre passeport est actif. Continuez vos missions, vos jeux et votre progression."
            : "Cliquez sur Passeport 3B pour créer votre identité numérique."}
        </p>
      </div>

      <div className="menu-legendary-grid">
        {cards.map(([icon, title, subtitle, target, frozen]) => (
          <button
            key={title}
            className={`menu-tile ${frozen || ""}`}
            onClick={() => go(target)}
          >
            <span className="tile-icon">{icon}</span>
            <span>
              <strong>{title}</strong>
              <small>{subtitle}</small>
            </span>
            <b>›</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function StaticPage({ title, subtitle, go }) {
  return (
    <section className="page-card">
      <BackButton onClick={() => go("home")} />
      <h1>{title}</h1>
      <p className="lead">{subtitle}</p>
      <div className="locked-note">Section conservée. Aucune modification lourde appliquée ici.</div>
    </section>
  );
}

function PassportFlow({ go, member, saveMember }) {
  const [form, setForm] = useState({
    name: member?.name || "Zakaria",
    email: member?.email || "3bblackblancbeurre@gmail.com",
    country: member?.country || "France",
    residence: member?.residence || "France",
    city: member?.city || "Paris",
    avatar: member?.avatar || "Héritier masqué",
  });

  if (!member) {
    return (
      <section className="page-card passport-register">
        <BackButton onClick={() => go("home")} />
        <h1>Créer mon Passeport 3B</h1>
        <p className="lead">
          Nouvelle inscription propre. Votre ancien compte n’est pas utilisé dans cette version.
        </p>

        <div className="form-grid">
          {[
            ["name", "Nom"],
            ["email", "E-mail"],
            ["country", "Pays 3B"],
            ["residence", "Résidence"],
            ["city", "Ville"],
            ["avatar", "Avatar"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>

        <button
          className="gold-action"
          onClick={() =>
            saveMember({
              ...form,
              number: makePassportNumber(),
              createdAt: todayFr(),
              status: "Membre 3B",
              points: 250,
              rank: "Héritier",
              card: "Carte Découverte 3B",
            })
          }
        >
          Créer mon passeport 3B
        </button>
      </section>
    );
  }

  return <PassportDigitalPage go={go} member={member} />;
}

function MatrixNumbers() {
  const nums = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        value: Math.floor(Math.random() * 9999).toString().padStart(4, "0"),
      })),
    []
  );

  return (
    <div className="matrix-numbers">
      {nums.map((n) => (
        <span
          key={n.id}
          style={{ left: `${n.left}%`, animationDelay: `${n.delay}s` }}
        >
          {n.value}
        </span>
      ))}
    </div>
  );
}

function PassportDigitalPage({ go, member }) {
  return (
    <section className="passport-page legendary-passport">
      <BackButton onClick={() => go("home")} />

      <div className="passport-topbar">
        <h1>PASSEPORT DIGITAL 3B</h1>
        <button className="verify-btn">🛡 Vérifier l’authenticité</button>
      </div>

      <div className="passport-grid-legendary">
        <div className="side-map-panel">
          <h3>ACCÈS MONDIAL 3B</h3>
          <WorldMini />
          <div className="stat-row">
            <b>196</b>
            <span>Pays connectés</span>
            <b>24/7</b>
            <span>Accès global</span>
          </div>
          <h3>FOCUS RÉGIONAL</h3>
          <EuropeZoomMini />
        </div>

        <div className="passport-card-ultra">
          <MatrixNumbers />
          <div className="passport-scan-line" />
          <div className="chip" />
          <div className="nfc">NFC</div>
          <div className="passport-id-top">
            3B ACCÈS NUMÉRIQUE <span>{member.country} 🇫🇷</span>
          </div>
          <h2>
            3B PASSEPORT
            <br />
            NUMÉRIQUE
          </h2>

          <div className="passport-info-main">
            <span>Titulaire</span>
            <strong>{member.name}</strong>
            <span>Statut</span>
            <strong>
              {member.status} <em>ACTIF</em>
            </strong>
            <span>N°</span>
            <strong>{member.number}</strong>
            <span>Pays 3B</span>
            <strong>{member.country}</strong>
          </div>

          <div className="digital-face">
            <i />
          </div>
          <div className="qr-fake">
            ▣▦▣
            <br />
            ▦▣▦
            <br />
            ▣▦▣
          </div>

          <div className="passport-footer">
            IDENTITÉ NUMÉRIQUE MEMBRE 3B — ÉMISSION {member.createdAt}
          </div>
        </div>

        <div className="security-panel">
          <h3>SÉCURITÉ & AUTHENTIFICATION</h3>
          {["Passeport numérique", "Clé publique", "Biométrie", "Chiffrement AES-256", "Intégrité 100%"].map((x) => (
            <p key={x}>
              {x}
              <b>VÉRIFIÉ</b>
            </p>
          ))}
          <div className="seal-3b">3B</div>
        </div>
      </div>

      <div className="info-triple">
        <InfoPanel
          title="Informations membre"
          rows={[
            "Nom|" + member.name,
            "E-mail|" + member.email,
            "Statut|💎 " + member.status,
            "Date d’adhésion|" + member.createdAt,
            "ID Membre|3B-MEM-88421",
          ]}
        />
        <InfoPanel
          title="Résidence et origine"
          rows={[
            "Pays 3B|" + member.country + " 🇫🇷",
            "Résidence|" + member.residence + " 🇫🇷",
            "Ville|" + member.city,
            "Numéro|" + member.number,
            "Origine sélectionnée|" + member.country,
          ]}
        />
        <InfoPanel
          title="Bonus pays d’origine"
          rows={[
            "Pays choisi|" + member.country + " 🇫🇷",
            "Bonus spécial|Patrimoine France 3B",
            "Effet|+2 XP missions identité",
            "Détail|Bonus lié à l’origine française",
          ]}
        />
      </div>

      <button className="world-button" onClick={() => go("monde")}>
        Explorer mon monde 3B →
      </button>
    </section>
  );
}

function InfoPanel({ title, rows }) {
  return (
    <div className="info-panel">
      <h3>{title}</h3>
      {rows.map((row) => {
        const [a, b] = row.split("|");
        return (
          <p key={row}>
            <span>{a}</span>
            <strong>{b}</strong>
          </p>
        );
      })}
    </div>
  );
}

function World3BPage({ go, member }) {
  return (
    <section className="page-card world-page">
      <BackButton onClick={() => go("passeport")} label="Passeport" />
      <h1>Carte du monde 3B</h1>
      <p className="lead">
        Vraie direction visuelle : contours, pays, réseau digital, zoom 8 pays officiels. Aucun cercle abstrait.
      </p>
      <WorldMapDetailed />
      <EuropeZoomDetailed />
      <AvatarAdvantages member={member} />
      <CardsSection />
      <ProgressSection />
    </section>
  );
}

function WorldMini() {
  return (
    <div className="map-image world-mini">
      <WorldMapSvg compact />
    </div>
  );
}

function EuropeZoomMini() {
  return (
    <div className="map-image europe-mini">
      <EuropeMapSvg />
    </div>
  );
}

function WorldMapDetailed() {
  return (
    <div className="world-map-detailed">
      <WorldMapSvg />
    </div>
  );
}

function EuropeZoomDetailed() {
  return (
    <div className="europe-map-detailed">
      <h2>Zoom 8 pays officiels</h2>
      <EuropeMapSvg detailed />
    </div>
  );
}

function WorldMapSvg() {
  return (
    <svg viewBox="0 0 1000 520" className="real-map-svg" role="img" aria-label="Carte du monde 3B">
      <defs>
        <filter id="blueGlow">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="1000" height="520" fill="#03101b" />
      <g className="grid-lines">
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} d={`M${40 + i * 70} 20V500`} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={"h" + i} d={`M20 ${50 + i * 55}H980`} />
        ))}
      </g>
      <g className="continents" filter="url(#blueGlow)">
        <path d="M91 135c39-42 103-74 167-52 44 15 79 41 112 73 20 19 15 49-15 67-43 27-91 30-136 52-55 26-109 11-143-35-25-34-24-73 15-105z" />
        <path d="M260 285c42-24 91-22 130 9 31 24 43 70 20 111-26 47-93 58-139 25-45-32-55-105-11-145z" />
        <path d="M430 105c58-52 151-65 228-43 56 16 91 50 116 100 18 36 70 43 111 64 43 22 49 65 13 93-55 44-128 30-198 49-91 26-176 30-248-27-59-46-67-146-22-236z" />
        <path d="M470 285c47-14 83 3 106 43 26 45 11 113-38 145-47 31-112 17-144-33-30-46 6-134 76-155z" />
        <path d="M777 343c44-26 112-12 143 30 31 42 12 95-36 114-56 22-122-7-135-54-9-34 2-72 28-90z" />
      </g>
      <g className="network-lines">
        <path d="M485 205C360 180 254 140 145 184" />
        <path d="M485 205c86-51 171-75 262-34" />
        <path d="M485 205c-43 75-57 125-51 193" />
        <path d="M485 205c77 60 153 101 229 129" />
      </g>
      <g className="country-tags">
        <text x="455" y="188">FRANCE</text>
        <text x="505" y="222">ITALIE</text>
        <text x="535" y="154">ESTONIE</text>
        <text x="620" y="243">TURQUIE</text>
        <text x="424" y="280">ALGÉRIE</text>
        <text x="488" y="270">TUNISIE</text>
        <text x="360" y="280">MAROC</text>
        <text x="380" y="222">ESPAGNE</text>
      </g>
    </svg>
  );
}

function EuropeMapSvg() {
  return (
    <svg viewBox="0 0 900 520" className="europe-svg" role="img" aria-label="Zoom 8 pays">
      <rect width="900" height="520" fill="#041322" />
      <g className="zoom-land">
        <path className="blue" d="M55 95l119-39 132 20 62 60-17 79 55 66-51 92-123 12-84-65-86-43-31-92z" />
        <path className="gold" d="M292 181l84-30 76 18 22 79-39 74-94-7-68-52z" />
        <path className="gold" d="M468 224l46-17 38 63 16 93-35 53-38-73-49-69z" />
        <path className="blue" d="M527 84l81-31 63 21-20 61-67 15z" />
        <path className="gold" d="M633 271l160-18 66 44-51 57-139-16z" />
        <path className="gold" d="M298 335l145-5 46 91-76 54-142-29z" />
        <path className="gold" d="M472 349l50 17-19 72-47-28z" />
        <path className="gold" d="M206 343l70 10-26 68-75-6z" />
      </g>
      {[
        ["ESPAGNE", 200, 330],
        ["FRANCE", 350, 180],
        ["ITALIE", 500, 230],
        ["ESTONIE", 590, 78],
        ["TURQUIE", 700, 260],
        ["ALGÉRIE", 390, 382],
        ["TUNISIE", 495, 360],
        ["MAROC", 175, 382],
      ].map(([t, x, y]) => (
        <g className="zoom-label" key={t}>
          <text x={x} y={y}>{t}</text>
          <path d={`M${x + 28} ${y + 10}l10 18l-20 0z`} />
        </g>
      ))}
    </svg>
  );
}

function AvatarAdvantages({ member }) {
  return (
    <div className="advantages-block">
      <div>
        <h2>Avantages 3B</h2>
        <p>
          Vue premium de votre passeport : avantages, indices supplémentaires et cartes possédées dans l’univers 3B International.
        </p>
        <ul>
          <li>Identité membre 3B</li>
          <li>Points et progression</li>
          <li>Carte numérique</li>
          <li>Accès aux pays débloqués</li>
        </ul>
      </div>
      <div className="phone-3b">
        <MatrixNumbers />
        <b>3B</b>
        <span>PASSEPORT NUMÉRIQUE</span>
        <em>QR</em>
      </div>
    </div>
  );
}

function CardsSection() {
  return (
    <div className="cards-section">
      <h2>Mes cartes possédées</h2>
      <div className="cards-grid-premium">
        {CARDS.map(([name, status, type]) => (
          <div className={`rank-card ${status}`} key={name}>
            <b>3B</b>
            <strong>{name}</strong>
            <span>{type}</span>
            <em>{status === "active" ? "ACTIVE" : "🔒 VERROUILLÉE"}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressSection() {
  return (
    <div className="progress-page">
      <h2>Points et progression 3B</h2>
      <div className="progress-grid">
        <div>
          <h3>Résumé actuel</h3>
          <p>Points actuels : <b>250</b></p>
          <p>Niveau actuel : <b>Héritier</b></p>
          <p>Carte actuelle : <b>Carte Découverte 3B</b></p>
        </div>
        <div className="ring" style={{ "--p": "83%" }}>83%</div>
        <div>
          <h3>Comment gagner des points</h3>
          <p>Créer son compte +100</p>
          <p>Choisir son pays +50</p>
          <p>Inviter un membre +150</p>
          <p>Participer à un drop +200</p>
        </div>
      </div>
    </div>
  );
}

function MemberPage({ go, member }) {
  return (
    <section className="page-card">
      <BackButton onClick={() => go("home")} />
      <ProgressSection />
      <CardsSection />
    </section>
  );
}

function SecretPage({ go }) {
  const [code, setCode] = useState("");
  const ok = code.trim().toLowerCase() === "italie";

  return (
    <section className="page-card secret-page">
      <BackButton onClick={() => go("home")} />
      <h1>Coffre secret 3B</h1>
      <p className="lead">Code, mystère et première porte de l’univers caché.</p>
      <div className={`secret-vault ${ok ? "open" : ""}`}>
        <div className="lock-core">{ok ? "🔓" : "🔐"}</div>
        <input
          placeholder="Entre le code secret"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {ok && (
          <div className="secret-reveal">
            Indice débloqué : 7 Italie — les 8 logos — 20h — tout va commencer.
          </div>
        )}
      </div>
    </section>
  );
}

function JeuxPage({ go }) {
  return (
    <section className="game-page">
      <BackButton onClick={() => go("home")} />
      <Jeu3B />
    </section>
  );
}

function GuidePage({ go }) {
  return (
    <section className="page-card guide-page">
      <BackButton onClick={() => go("home")} />
      <h1>Guide explorateur 3B</h1>
      <div className="guide-steps">
        {["Créer son passeport", "Explorer le monde 3B", "Jouer pour gagner XP", "Débloquer cartes et pays", "Découvrir le coffre secret"].map((s, i) => (
          <button key={s}>
            <b>0{i + 1}</b>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

function OptionsPage({ go, options, saveOptions, resetAll }) {
  function toggle(k) {
    saveOptions({ ...options, [k]: !options[k] });
  }

  return (
    <section className="page-card">
      <BackButton onClick={() => go("home")} />
      <h1>Options 3B</h1>
      <div className="option-list">
        <button onClick={() => toggle("animations")}>
          Animations : {options.animations ? "ON" : "OFF"}
        </button>
        <button onClick={() => toggle("sound")}>
          Sons : {options.sound ? "ON" : "OFF"}
        </button>
        <button onClick={() => toggle("performance")}>
          Mode performance : {options.performance ? "ON" : "OFF"}
        </button>
        <button onClick={resetAll}>Réinitialiser inscription / progression</button>
      </div>
    </section>
  );
}

export default App;